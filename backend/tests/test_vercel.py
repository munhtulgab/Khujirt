"""The Vercel function (api/index.py) end to end over HTTP, and the Postgres migrations."""

import importlib.util
import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import pytest

from fake_d1 import ACCOUNT, TOKEN, FakeD1
from test_app import PG_MIGRATIONS, PG_URL, SqliteDB, call, postgres_db

ENTRY = Path(__file__).resolve().parents[2] / "api" / "index.py"


ENV = ("DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING",
       "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_D1_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "D1_DATABASE_ID")


def load_entry(monkeypatch, url="", env=None):
    for name in ENV:
        monkeypatch.delenv(name, raising=False)
    if url:
        monkeypatch.setenv("DATABASE_URL", url)
    for name, value in (env or {}).items():
        monkeypatch.setenv(name, value)
    spec = importlib.util.spec_from_file_location("khujirt_vercel_entry_test", ENTRY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def server(monkeypatch, request):
    url = request.param
    if url == "pg":
        if not PG_URL:
            pytest.skip("set KHUJIRT_TEST_DATABASE_URL to run against Postgres")
        postgres_db().close()  # fresh, empty database: the function must create everything itself
        url = PG_URL
    module = load_entry(monkeypatch, url)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), module.handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}", module
    httpd.shutdown()
    if module.DB:
        module.DB.close()


def fetch(base, path, method="GET", body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, json.loads(res.read() or b"null"), dict(res.headers)
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read() or b"null"), dict(err.headers)


@pytest.mark.parametrize("server", [""], indirect=True)
def test_without_database(server):
    base, _ = server
    status, data, _ = fetch(base, "/api/health")
    assert status == 200 and data["database"] == "not_configured"
    assert fetch(base, "/api/products")[0] == 503
    status, data, _ = fetch(base, "/api/contact", "POST", {"name": "A"}, {"content-type": "application/json"})
    assert status == 503 and data == {"error": "not_configured"}


@pytest.mark.parametrize("server", ["pg"], indirect=True)
def test_function_on_postgres(server):
    base, _ = server
    # first request on an empty database creates the tables and the products
    status, data, _ = fetch(base, "/api/health")
    assert status == 200 and data == {"ok": True, "service": "khujirt-api", "database": "ok", "engine": "postgres", "products": 6}

    # the rewrite passes the original path as _path; both forms reach the same route
    for path in ("/api/products?lang=en", "/api/?_path=products&lang=en"):
        status, data, headers = fetch(base, path)
        assert status == 200 and data["lang"] == "en" and len(data["products"]) == 6
        assert "max-age" in headers["cache-control"]
    status, data, _ = fetch(base, "/api/?_path=products/khujirt-yoda")
    assert status == 200 and data["product"]["volumes"] == ["500 мл", "860 мл"]
    assert fetch(base, "/api/facts")[1] == {"facts": {"since": 2013, "mineralCount": 5, "additives": 0}}

    # contact: stored, rate limited per visitor IP from x-real-ip (set by Vercel's edge)
    msg = {"name": "Бат", "phone": "+976 9911 2233", "message": "Сайн байна уу, захиалга.", "locale": "mn"}
    json_headers = {"content-type": "application/json", "x-real-ip": "203.0.113.9"}
    for _ in range(5):
        assert fetch(base, "/api/contact", "POST", msg, json_headers)[0] == 201
    assert fetch(base, "/api/contact", "POST", msg, json_headers)[0] == 429
    assert fetch(base, "/api/contact", "POST", msg, {**json_headers, "x-real-ip": "198.51.100.4"})[0] == 201
    assert fetch(base, "/api/contact", "GET")[0] == 405


@pytest.mark.skipif(not PG_URL, reason="set KHUJIRT_TEST_DATABASE_URL to run against Postgres")
def test_migrations_run_once_and_match_d1():
    from khujirt_api.postgres import migrate

    pg = postgres_db()
    try:
        assert sorted(r["name"] for r in pg.conn.execute("SELECT name FROM schema_migrations").fetchall()) == [
            p.name for p in sorted(PG_MIGRATIONS.glob("*.sql"))
        ]
        pg.conn.execute("UPDATE products SET name_mn = 'засварласан' WHERE slug = 'khujirt'")
        assert migrate(pg.conn, PG_MIGRATIONS) == []  # nothing re-applied, edits kept
        assert call(pg, "GET", "/api/products/khujirt").data["product"]["name"] == "засварласан"
        pg.conn.execute("UPDATE products SET name_mn = 'Хужирт ус' WHERE slug = 'khujirt'")
        # the Postgres seed ends in the same state as the three D1 migrations
        for lang in ("mn", "en"):
            assert call(pg, "GET", "/api/products", {"lang": lang}).data == call(SqliteDB(), "GET", "/api/products", {"lang": lang}).data
        assert call(pg, "GET", "/api/facts").data == call(SqliteDB(), "GET", "/api/facts").data
    finally:
        pg.close()


@pytest.fixture
def d1_server(monkeypatch):
    """The function as configured on Vercel for D1: only the token is set, plus the stand-in API address."""
    fake = FakeD1(accounts=("other-account", ACCOUNT))
    import khujirt_api.d1_http as d1_http

    monkeypatch.setattr(d1_http, "API", fake.api)
    module = load_entry(monkeypatch, env={"CLOUDFLARE_API_TOKEN": TOKEN})
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), module.handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}", fake
    httpd.shutdown()
    fake.stop()


def test_function_on_d1(d1_server):
    base, fake = d1_server
    status, data, _ = fetch(base, "/api/health")
    assert status == 200 and data == {"ok": True, "service": "khujirt-api", "database": "ok", "engine": "d1", "products": 6}
    # the account was found from the token: the one of two that holds khujirt-db
    assert ("GET", "/client/v4/accounts?per_page=50") in fake.requests

    status, data, _ = fetch(base, "/api/?_path=products&lang=mn")
    assert status == 200 and [p["slug"] for p in data["products"]][:2] == ["khujirt", "khujirt-bombolog"]
    assert data["products"][0]["volumes"] == ["330 мл", "500 мл", "1.5 л"]
    assert fetch(base, "/api/facts")[1] == {"facts": {"since": 2013, "mineralCount": 5, "additives": 0}}

    msg = {"name": "Сараа", "email": "saraa@example.mn", "message": "Хужирт ус захиалах гэсэн юм.", "locale": "mn"}
    headers = {"content-type": "application/json", "x-real-ip": "203.0.113.20"}
    assert fetch(base, "/api/contact", "POST", msg, headers)[0] == 201
    [row] = fake.messages()
    assert row["name"] == "Сараа" and row["phone"] is None and "203.0.113.20" not in json.dumps(row)


def test_d1_bad_token_is_reported_without_details(monkeypatch):
    fake = FakeD1()
    import khujirt_api.d1_http as d1_http

    monkeypatch.setattr(d1_http, "API", fake.api)
    module = load_entry(monkeypatch, env={"CLOUDFLARE_API_TOKEN": "wrong"})
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), module.handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    try:
        health = fetch(base, "/api/health")[1]
        assert health["database"] == "error" and health["reason"] in ("token_rejected", "account_id_needed")
        assert "wrong" not in json.dumps(health)
        status, data, _ = fetch(base, "/api/products")
        assert status == 500 and data == {"error": "server_error"}
    finally:
        httpd.shutdown()
        fake.stop()


@pytest.mark.parametrize(
    "raw, root, headers, expected",
    [
        ("/api/health", "", {}, "/api/health"),
        ("/api/products?lang=en", "", {}, "/api/products"),
        ("/api/index?_path=products/khujirt&path=products/khujirt&lang=en", "", {}, "/api/products/khujirt"),
        ("/api/?_path=facts", "", {}, "/api/facts"),
        ("/api/index?path=admin/me", "", {}, "/api/admin/me"),
        ("/api/index?_path=&path=", "", {}, "/api/"),
        ("/health", "/api", {}, "/api/health"),  # the runtime took the mount prefix off
        ("/health", "", {}, "/api/health"),
        ("/index?_path=admin/login", "/api", {}, "/api/admin/login"),
        ("/", "/api", {}, "/api/"),
        ("/api/index", "", {"x-now-route-matches": "1=contact&rscsuff="}, "/api/contact"),
        ("/api/index", "", {}, "/api/"),
    ],
)
def test_route_forms(monkeypatch, raw, root, headers, expected):
    module = load_entry(monkeypatch)
    path, query = module._route(raw, root, headers)
    assert path == expected
    assert "_path" not in query and "path" not in query
    if "lang=en" in raw:
        assert query["lang"] == "en"


def test_not_found_names_the_route(d1_server):
    base, _ = d1_server
    status, data, _ = fetch(base, "/api/index?_path=nothing-here")
    assert status == 404 and data == {"error": "not_found", "path": "/api/nothing-here"}
    # a stripped mount prefix still reaches the right routes
    assert fetch(base, "/health")[1]["database"] == "ok"
    assert len(fetch(base, "/products?lang=en")[1]["products"]) == 6


def _d1_entry(monkeypatch, env):
    fake = FakeD1()
    import khujirt_api.d1_http as d1_http

    monkeypatch.setattr(d1_http, "API", fake.api)
    module = load_entry(monkeypatch, env=env)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), module.handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{httpd.server_address[1]}", fake, httpd


@pytest.mark.parametrize(
    "env, reason",
    [
        ({"CLOUDFLARE_API_TOKEN": TOKEN, "CLOUDFLARE_ACCOUNT_ID": "acc-wrong"}, "database_not_found"),
        ({"CLOUDFLARE_API_TOKEN": TOKEN, "D1_DATABASE_ID": "00000000-0000-0000-0000-000000000000"}, "database_not_found"),
        ({"CLOUDFLARE_API_TOKEN": TOKEN, "CLOUDFLARE_ACCOUNT_ID": ACCOUNT}, None),
    ],
)
def test_d1_health_reasons(monkeypatch, env, reason):
    base, fake, httpd = _d1_entry(monkeypatch, env)
    try:
        health = fetch(base, "/api/health")[1]
        if reason is None:
            assert health["database"] == "ok" and health["products"] == 6
            assert not any(path.startswith("/client/v4/accounts?") for _, path in fake.requests)  # no lookup needed
        else:
            assert health["database"] == "error" and health["reason"] == reason
    finally:
        httpd.shutdown()
        fake.stop()


def test_d1_token_that_cannot_list_accounts(monkeypatch):
    base, fake, httpd = _d1_entry(monkeypatch, {"CLOUDFLARE_API_TOKEN": TOKEN})
    fake.accounts = []  # what a token limited to D1 sees
    try:
        health = fetch(base, "/api/health")[1]
        assert health["database"] == "error" and health["reason"] == "account_id_needed"
    finally:
        httpd.shutdown()
        fake.stop()
