"""Tests for the API logic, with an in-memory SQLite database built from the real D1 migrations."""

import asyncio
import json
import sqlite3
from pathlib import Path

import pytest

from khujirt_api import Request, Settings, handle

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
NOW = 1_800_000_000.0


class SqliteDB:
    """Same interface as khujirt_api.db.D1, backed by sqlite3."""

    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            self.conn.executescript(migration.read_text(encoding="utf-8"))

    async def all(self, sql, *params):
        assert all(p is not None for p in params), "D1 cannot bind None"
        return [dict(row) for row in self.conn.execute(sql, params).fetchall()]

    async def run(self, sql, *params):
        assert all(p is not None for p in params), "D1 cannot bind None"
        self.conn.execute(sql, params)
        self.conn.commit()

    def messages(self):
        return [dict(r) for r in self.conn.execute("SELECT * FROM contact_messages ORDER BY id").fetchall()]


@pytest.fixture
def db():
    return SqliteDB()


SETTINGS = Settings(allowed_origins=("https://khujirt.vercel.app",), ip_hash_salt="pepper", proxy_key="", rate_limit=3, rate_window=3600)


def call(db, method, path, query=None, headers=None, body="", settings=SETTINGS, now=NOW):
    return asyncio.run(handle(Request(method, path, query or {}, headers or {}, body), db, settings, now))


def post_contact(db, payload, headers=None, settings=SETTINGS, now=NOW):
    h = {"content-type": "application/json", "cf-connecting-ip": "203.0.113.7"}
    h.update(headers or {})
    return call(db, "POST", "/api/contact", headers=h, body=json.dumps(payload), settings=settings, now=now)


GOOD = {"name": "Бат", "email": "bat@example.mn", "message": "Сайн байна уу, захиалга өгөх гэсэн юм.", "locale": "mn"}


# ---------------------------------------------------------------- read endpoints


def test_health(db):
    r = call(db, "GET", "/api/health")
    assert r.status == 200 and r.data["ok"] is True


def test_products_mn(db):
    r = call(db, "GET", "/api/products", {"lang": "mn"})
    assert r.status == 200
    products = r.data["products"]
    assert len(products) == 6
    assert products[0]["slug"] == "khujirt"
    assert products[0]["name"] == "Хужирт ус"
    assert products[1]["volumes"] == ["330 мл", "500 мл", "1.5 л"]
    assert {p["category"] for p in products} == {"still", "sparkling", "iodine", "flavoured"}
    assert all(p["image"].startswith("https://") and p["shopUrl"].startswith("https://www.gem.mn/") for p in products)
    assert "max-age" in r.headers["cache-control"]


def test_products_en_and_unknown_lang(db):
    en = call(db, "GET", "/api/products", {"lang": "en"}).data["products"]
    assert en[0]["name"] == "Khujirt Natural Mineral Water"
    fallback = call(db, "GET", "/api/products", {"lang": "fr"}).data
    assert fallback["lang"] == "mn"


def test_inactive_products_are_hidden(db):
    db.conn.execute("UPDATE products SET active = 0 WHERE slug = 'khujirt-yoda'")
    slugs = [p["slug"] for p in call(db, "GET", "/api/products").data["products"]]
    assert "khujirt-yoda" not in slugs and len(slugs) == 5


def test_single_product(db):
    r = call(db, "GET", "/api/products/khujirt-yoda", {"lang": "en"})
    assert r.status == 200 and r.data["product"]["name"] == "Khujirt Iodine+"
    assert call(db, "GET", "/api/products/nope").status == 404
    assert call(db, "GET", "/api/products/DROP%20TABLE").status == 404


def test_facts(db):
    r = call(db, "GET", "/api/facts")
    assert r.data["facts"] == {"since": 2013, "mineralCount": 5, "additives": 0}


def test_routing_errors(db):
    assert call(db, "GET", "/api/unknown").status == 404
    r = call(db, "DELETE", "/api/products")
    assert r.status == 405 and "GET" in r.headers["allow"]
    assert call(db, "GET", "/api/contact").status == 405


# ---------------------------------------------------------------- contact form


def test_contact_is_stored_without_raw_ip(db):
    r = post_contact(db, GOOD, headers={"user-agent": "pytest"})
    assert r.status == 201 and r.data == {"ok": True}
    [row] = db.messages()
    assert row["name"] == "Бат" and row["email"] == "bat@example.mn" and row["phone"] is None
    assert row["locale"] == "mn" and row["status"] == "new" and row["user_agent"] == "pytest"
    assert row["created_at"] == int(NOW)
    assert "203.0.113.7" not in json.dumps(row) and len(row["ip_hash"]) == 32


def test_contact_phone_only_and_cleaning(db):
    r = post_contact(db, {"name": "  Сараа \n ", "phone": "+976 9911 2233", "message": "Сайн уу\r\n\r\n\r\n\r\nбайна\x00 уу", "locale": "en"})
    assert r.status == 201
    [row] = db.messages()
    assert row["name"] == "Сараа" and row["email"] is None and row["phone"] == "+976 9911 2233"
    assert row["message"] == "Сайн уу\n\nбайна уу" and row["locale"] == "en"


@pytest.mark.parametrize(
    "payload, fields",
    [
        ({"email": "a@b.mn", "message": "hello there"}, ["name"]),
        ({"name": "A", "message": "hello there"}, ["email", "phone"]),
        ({"name": "A", "email": "not-an-email", "message": "hello there"}, ["email"]),
        ({"name": "A", "phone": "abc", "message": "hello there"}, ["phone"]),
        ({"name": "A", "email": "a@b.mn", "message": "hi"}, ["message"]),
    ],
)
def test_contact_validation(db, payload, fields):
    r = post_contact(db, payload)
    assert r.status == 400 and r.data["error"] == "invalid" and r.data["fields"] == fields
    assert db.messages() == []


def test_contact_honeypot_is_silently_dropped(db):
    r = post_contact(db, {**GOOD, "company": "Spam LLC"})
    assert r.status == 200 and db.messages() == []


def test_contact_rejects_bad_requests(db):
    headers = {"cf-connecting-ip": "203.0.113.7"}
    assert call(db, "POST", "/api/contact", headers={**headers, "content-type": "text/plain"}, body="hi").status == 415
    assert call(db, "POST", "/api/contact", headers={**headers, "content-type": "application/json"}, body="{oops").status == 400
    assert call(db, "POST", "/api/contact", headers={**headers, "content-type": "application/json"}, body="[1,2]").status == 400
    big = json.dumps({**GOOD, "message": "x" * 20_000})
    assert call(db, "POST", "/api/contact", headers={**headers, "content-type": "application/json"}, body=big).status == 413


def test_contact_rate_limit_per_ip(db):
    for _ in range(3):
        assert post_contact(db, GOOD).status == 201
    limited = post_contact(db, GOOD)
    assert limited.status == 429 and limited.headers["retry-after"] == "3600"
    # another visitor is not affected
    assert post_contact(db, GOOD, headers={"cf-connecting-ip": "198.51.100.1"}).status == 201
    # the window moves on
    assert post_contact(db, GOOD, now=NOW + 3601).status == 201


def test_contact_requires_proxy_key_when_configured(db):
    settings = Settings(ip_hash_salt="pepper", proxy_key="s3cret", rate_limit=1)
    assert post_contact(db, GOOD, settings=settings).status == 401
    assert post_contact(db, GOOD, headers={"x-proxy-key": "wrong"}, settings=settings).status == 401
    # behind the trusted proxy the visitor IP comes from x-forwarded-for
    ok = {"x-proxy-key": "s3cret", "x-forwarded-for": "192.0.2.10"}
    assert post_contact(db, GOOD, headers=ok, settings=settings).status == 201
    assert post_contact(db, GOOD, headers=ok, settings=settings).status == 429
    other = {"x-proxy-key": "s3cret", "x-forwarded-for": "192.0.2.11"}
    assert post_contact(db, GOOD, headers=other, settings=settings).status == 201


# ---------------------------------------------------------------- CORS & settings


def test_cors(db):
    public = call(db, "GET", "/api/products", headers={"origin": "https://anywhere.example"})
    assert public.headers["access-control-allow-origin"] == "*"

    pre = call(db, "OPTIONS", "/api/contact", headers={"origin": "https://khujirt.vercel.app"})
    assert pre.status == 204 and pre.headers["access-control-allow-origin"] == "https://khujirt.vercel.app"

    blocked = call(db, "OPTIONS", "/api/contact", headers={"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in blocked.headers


def test_settings_from_env():
    env = {"ALLOWED_ORIGINS": " https://a.mn/ , http://localhost:3000 ", "IP_HASH_SALT": "x", "CONTACT_RATE_LIMIT": "oops"}
    s = Settings.from_env(env.get)
    assert s.allowed_origins == ("https://a.mn", "http://localhost:3000")
    assert s.ip_hash_salt == "x" and s.proxy_key == "" and s.rate_limit == 5 and s.rate_window == 3600


def test_server_errors_are_hidden(db):
    class Broken(SqliteDB):
        async def all(self, sql, *params):
            raise RuntimeError("database exploded at /secret/path")

    r = call(Broken(), "GET", "/api/products")
    assert r.status == 500 and r.data == {"error": "server_error"}
    assert "secret" not in r.text()
