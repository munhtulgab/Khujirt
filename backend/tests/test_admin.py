"""Admin API, on every database the API runs on (fixture `db` from test_app)."""

import asyncio

import pytest

from khujirt_api.admin import hash_password, verify_password
from test_app import NOW, SETTINGS, call, db, post_contact  # noqa: F401  (db is a fixture)

HOST = "khujirt.vercel.app"


def add_admin(db, username="admin", password="admin123"):
    asyncio.run(db.run("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", username, hash_password(password, iterations=1000)))


def admin(db, method, path, body=None, cookie="", ip="203.0.113.50", origin=f"https://{HOST}", now=NOW):
    import json

    headers = {"host": HOST, "x-forwarded-for": ip, "cf-connecting-ip": ip}
    if origin:
        headers["origin"] = origin
    if cookie:
        headers["cookie"] = f"other=1; khujirt_admin={cookie}"
    if body is not None:
        headers["content-type"] = "application/json"
    return call(db, method, f"/api/admin{path}", headers=headers, body=json.dumps(body) if body is not None else "", now=now)


def login(db, password="admin123", **kw):
    r = admin(db, "POST", "/login", {"username": "Admin", "password": password}, **kw)
    cookie = r.headers.get("set-cookie", "")
    token = cookie.split(";")[0].partition("=")[2] if r.status == 200 else ""
    return r, token


def test_password_hashing():
    stored = hash_password("admin123")
    assert stored.startswith("pbkdf2_sha256$210000$") and "admin123" not in stored
    assert verify_password("admin123", stored) and not verify_password("admin124", stored)
    assert not verify_password("admin123", "garbage")


def test_login_session_and_logout(db):
    add_admin(db)
    assert admin(db, "GET", "/me").status == 401

    r, token = login(db)
    assert r.status == 200 and r.data == {"ok": True, "username": "admin"}
    cookie = r.headers["set-cookie"]
    for flag in ("HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=43200"):
        assert flag in cookie
    assert "access-control-allow-origin" not in r.headers and r.headers["cache-control"] == "no-store"

    assert admin(db, "GET", "/me", cookie=token).data == {"username": "admin"}
    assert admin(db, "GET", "/me", cookie="forged").status == 401
    # the session ends after 12 hours
    assert admin(db, "GET", "/me", cookie=token, now=NOW + 12 * 3600 + 1).status == 401

    out = admin(db, "POST", "/logout", cookie=token)
    assert out.status == 200 and "Max-Age=0" in out.headers["set-cookie"]
    assert admin(db, "GET", "/me", cookie=token).status == 401


def test_failed_logins_are_throttled_per_ip(db):
    add_admin(db)
    for _ in range(5):
        assert login(db, "wrong")[0].status == 401
    r, _ = login(db)  # even the right password waits now
    assert r.status == 429 and r.headers["retry-after"] == "900"
    assert login(db, ip="198.51.100.77")[0].status == 200  # another visitor is not affected
    assert login(db, now=NOW + 901)[0].status == 200  # the window moves on
    assert admin(db, "POST", "/login", {"username": "nobody", "password": "admin123"}, ip="192.0.2.1").status == 401


def test_requests_from_other_sites_are_refused(db):
    add_admin(db)
    assert login(db, origin="https://evil.example")[0].status == 403
    _, token = login(db)
    assert admin(db, "PATCH", "/facts", {"since": 2014}, cookie=token, origin="https://evil.example").status == 403
    assert admin(db, "PATCH", "/facts", {"since": 2014}, cookie=token, origin="").status == 200


def test_messages(db):
    add_admin(db)
    post_contact(db, {"name": "Бат", "email": "bat@example.mn", "message": "Захиалга өгөх гэсэн юм.", "locale": "mn"})
    post_contact(db, {"name": "Dorj", "phone": "+976 8800 1122", "message": "Hello, wholesale prices?", "locale": "en"})
    _, token = login(db)

    r = admin(db, "GET", "/messages", cookie=token)
    assert r.status == 200 and [m["name"] for m in r.data["messages"]] == ["Dorj", "Бат"]
    assert r.data["counts"] == {"new": 2}
    first = r.data["messages"][1]
    assert first["email"] == "bat@example.mn" and first["phone"] is None and first["createdAt"] == int(NOW)

    assert admin(db, "PATCH", f"/messages/{first['id']}", {"status": "answered"}, cookie=token).status == 200
    assert admin(db, "PATCH", f"/messages/{first['id']}", {"status": "deleted"}, cookie=token).status == 400
    assert admin(db, "PATCH", "/messages/99999", {"status": "read"}, cookie=token).status == 404
    r = call(db, "GET", "/api/admin/messages", {"status": "answered"}, headers={"cookie": f"khujirt_admin={token}"})
    assert [m["name"] for m in r.data["messages"]] == ["Бат"] and r.data["counts"] == {"new": 1, "answered": 1}
    assert admin(db, "GET", "/messages").status == 401


def test_products(db):
    add_admin(db)
    _, token = login(db)
    r = admin(db, "GET", "/products", cookie=token)
    assert r.status == 200 and len(r.data["products"]) == 6
    yoda = next(p for p in r.data["products"] if p["slug"] == "khujirt-yoda")
    assert yoda["active"] is True and yoda["volumes"] == ["500 мл", "860 мл"]

    r = admin(db, "PATCH", "/products/khujirt-yoda", {"nameMn": "  Хужирт Йода+ шинэ ", "volumes": ["500 мл", "1 л"], "active": False, "sortOrder": 5}, cookie=token)
    assert r.status == 200
    assert r.data["product"]["nameMn"] == "Хужирт Йода+ шинэ" and r.data["product"]["volumes"] == ["500 мл", "1 л"]
    assert r.data["product"]["active"] is False and r.data["product"]["sortOrder"] == 5
    # hidden from the public site, still in the admin list
    assert "khujirt-yoda" not in [p["slug"] for p in call(db, "GET", "/api/products").data["products"]]
    assert len(admin(db, "GET", "/products", cookie=token).data["products"]) == 6
    assert admin(db, "PATCH", "/products/khujirt-yoda", {"active": True}, cookie=token).status == 200
    assert call(db, "GET", "/api/products").data["products"][0]["slug"] == "khujirt-yoda"  # sort order 5 comes first

    bad = admin(db, "PATCH", "/products/khujirt", {"nameMn": " ", "image": "http://x", "volumes": "1 л", "active": "yes"}, cookie=token)
    assert bad.status == 400 and bad.data["fields"] == ["active", "image", "nameMn", "volumes"]
    assert admin(db, "PATCH", "/products/khujirt", {}, cookie=token).status == 400
    assert admin(db, "PATCH", "/products/nope", {"active": True}, cookie=token).status == 404
    assert admin(db, "PATCH", "/products/khujirt", {"active": False}).status == 401


def test_facts(db):
    add_admin(db)
    _, token = login(db)
    assert admin(db, "GET", "/facts", cookie=token).data == {"facts": {"since": 2013, "mineralCount": 5, "additives": 0}}
    r = admin(db, "PATCH", "/facts", {"since": 2012, "mineralCount": 6}, cookie=token)
    assert r.status == 200 and r.data["facts"] == {"since": 2012, "mineralCount": 6, "additives": 0}
    assert call(db, "GET", "/api/facts").data["facts"]["mineralCount"] == 6
    assert admin(db, "PATCH", "/facts", {"since": "2012", "additives": -1}, cookie=token).data["fields"] == ["since", "additives"]


def test_change_password(db):
    add_admin(db)
    _, token = login(db)
    assert admin(db, "POST", "/password", {"current": "wrong", "new": "Khujirt-2026!"}, cookie=token).status == 403
    assert admin(db, "POST", "/password", {"current": "admin123", "new": "short"}, cookie=token).status == 400
    assert admin(db, "POST", "/password", {"current": "admin123", "new": "Khujirt-2026!"}, cookie=token).status == 200
    assert login(db)[0].status == 401
    assert login(db, "Khujirt-2026!", ip="198.51.100.9")[0].status == 200


def test_unknown_admin_routes(db):
    add_admin(db)
    _, token = login(db)
    assert admin(db, "GET", "/nothing", cookie=token).status == 404
    assert admin(db, "DELETE", "/products/khujirt", cookie=token).status == 405
    assert admin(db, "GET", "/login").status == 405


@pytest.mark.parametrize("path", ["/api/admin/me", "/api/admin/products"])
def test_admin_is_never_cached_or_shared(db, path):
    r = call(db, "GET", path, headers={"origin": "https://anywhere.example"})
    assert r.status == 401 and r.headers["cache-control"] == "no-store" and "access-control-allow-origin" not in r.headers
