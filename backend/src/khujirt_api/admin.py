"""Admin API: sign-in, contact messages, products and facts.

Routes (all under /api/admin, JSON):
  POST  /login                 {username, password} → session cookie
  POST  /logout
  GET   /me
  POST  /password              {current, new}
  GET   /messages?status=      newest first
  PATCH /messages/<id>         {status}
  GET   /products              every product, active or not
  PATCH /products/<slug>       any of the editable fields
  GET   /facts
  PATCH /facts                 {since, mineralCount, additives}

Passwords are stored as PBKDF2-SHA256 hashes; sessions as SHA-256 hashes of a random token kept in
an HttpOnly, Secure, SameSite=Strict cookie. Failed sign-ins are throttled per visitor IP, and
state-changing requests from another site's origin are refused.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
from typing import Any, Mapping, Optional
from urllib.parse import urlsplit

from .app import (
    Database,
    Request,
    Response,
    Settings,
    _clean,
    _client_ip,
    _error,
    _hash_ip,
    _int,
    MAX_BODY_BYTES,
)

COOKIE = "khujirt_admin"
SESSION_SECONDS = 12 * 3600
LOGIN_WINDOW = 15 * 60
LOGIN_MAX_FAILURES = 5
PBKDF2_ITERATIONS = 210_000
MESSAGE_STATUSES = ("new", "read", "answered", "spam")
HTTPS_URL = re.compile(r"^https://[^\s\"'<>]+$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")

# ---------------------------------------------------------------- passwords


def hash_password(password: str, iterations: int = PBKDF2_ITERATIONS, salt: Optional[bytes] = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    b64 = lambda b: base64.b64encode(b).decode("ascii")  # noqa: E731
    return f"pbkdf2_sha256${iterations}${b64(salt)}${b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt, digest = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        expected = base64.b64decode(digest)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), base64.b64decode(salt), int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# A real hash to compare against when the user does not exist, so timing does not reveal usernames.
_DUMMY_HASH = hash_password("not-a-real-password", salt=b"khujirt-dummy-salt")

# ---------------------------------------------------------------- helpers


def _cookies(req: Request) -> dict[str, str]:
    jar: dict[str, str] = {}
    for part in req.headers.get("cookie", "").split(";"):
        name, _, value = part.strip().partition("=")
        if name:
            jar[name] = value
    return jar


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _session_cookie(token: str, max_age: int) -> str:
    return f"{COOKIE}={token}; Path=/; Max-Age={max_age}; HttpOnly; Secure; SameSite=Strict"


def _json_body(req: Request) -> Optional[dict[str, Any]]:
    if "application/json" not in req.headers.get("content-type", "").lower():
        return None
    if len(req.body.encode("utf-8")) > MAX_BODY_BYTES:
        return None
    try:
        data = json.loads(req.body or "{}")
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _same_site(req: Request, settings: Settings) -> bool:
    """Browsers send Origin on POST/PATCH; it must be this site (or a configured origin)."""
    origin = req.headers.get("origin", "").rstrip("/")
    if not origin:
        return True  # not a browser form/fetch from another site; the cookie is still required
    if origin in settings.allowed_origins:
        return True
    host = (req.headers.get("x-forwarded-host") or req.headers.get("host") or "").split(",")[0].strip().lower()
    return bool(host) and urlsplit(origin).netloc.lower() == host


async def _current_user(req: Request, db: Database, now: int) -> Optional[str]:
    token = _cookies(req).get(COOKIE, "")
    if not token or len(token) > 200:
        return None
    rows = await db.all(
        "SELECT username FROM admin_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1", _token_hash(token), now
    )
    return str(rows[0]["username"]) if rows else None


# ---------------------------------------------------------------- sign-in


async def login(req: Request, db: Database, settings: Settings, now: int) -> Response:
    body = _json_body(req)
    if body is None:
        return _error(400, "invalid_json")
    username = _clean(body.get("username"), 80).lower()
    password = body.get("password") if isinstance(body.get("password"), str) else ""

    ip_hash = _hash_ip("admin:" + _client_ip(req, False, settings.client_ip_header), settings.ip_hash_salt)
    rows = await db.all(
        "SELECT COUNT(*) AS n FROM admin_login_attempts WHERE ip_hash = ? AND created_at > ?", ip_hash, now - LOGIN_WINDOW
    )
    if rows and _int(rows[0].get("n"), 0) >= LOGIN_MAX_FAILURES:
        return Response(429, {"error": "too_many_attempts"}, {"retry-after": str(LOGIN_WINDOW)})

    users = await db.all("SELECT username, password_hash FROM admin_users WHERE username = ? LIMIT 1", username) if username else []
    ok = verify_password(password[:200], users[0]["password_hash"] if users else _DUMMY_HASH) and bool(users)
    if not ok:
        await db.run("INSERT INTO admin_login_attempts (ip_hash, created_at) VALUES (?, ?)", ip_hash, now)
        return _error(401, "invalid_credentials")

    await db.run("DELETE FROM admin_login_attempts WHERE ip_hash = ? OR created_at < ?", ip_hash, now - LOGIN_WINDOW)
    await db.run("DELETE FROM admin_sessions WHERE expires_at < ?", now)
    token = secrets.token_urlsafe(32)
    await db.run(
        "INSERT INTO admin_sessions (token_hash, username, created_at, expires_at) VALUES (?, ?, ?, ?)",
        _token_hash(token),
        username,
        now,
        now + SESSION_SECONDS,
    )
    return Response(200, {"ok": True, "username": username}, {"set-cookie": _session_cookie(token, SESSION_SECONDS)})


async def logout(req: Request, db: Database) -> Response:
    token = _cookies(req).get(COOKIE, "")
    if token:
        await db.run("DELETE FROM admin_sessions WHERE token_hash = ?", _token_hash(token))
    return Response(200, {"ok": True}, {"set-cookie": _session_cookie("", 0)})


async def change_password(req: Request, db: Database, user: str) -> Response:
    body = _json_body(req)
    if body is None:
        return _error(400, "invalid_json")
    current = body.get("current") if isinstance(body.get("current"), str) else ""
    new = body.get("new") if isinstance(body.get("new"), str) else ""
    rows = await db.all("SELECT password_hash FROM admin_users WHERE username = ? LIMIT 1", user)
    if not rows or not verify_password(current[:200], rows[0]["password_hash"]):
        return _error(403, "wrong_password")
    if not 8 <= len(new) <= 200:
        return _error(400, "invalid", fields=["new"])
    await db.run("UPDATE admin_users SET password_hash = ? WHERE username = ?", hash_password(new), user)
    return Response(200, {"ok": True})


# ---------------------------------------------------------------- messages


async def list_messages(req: Request, db: Database) -> Response:
    status = str(req.query.get("status") or "")
    columns = "id, name, email, phone, message, locale, status, created_at"
    if status in MESSAGE_STATUSES:
        rows = await db.all(f"SELECT {columns} FROM contact_messages WHERE status = ? ORDER BY id DESC LIMIT 500", status)
    else:
        rows = await db.all(f"SELECT {columns} FROM contact_messages ORDER BY id DESC LIMIT 500")
    counts = await db.all("SELECT status, COUNT(*) AS n FROM contact_messages GROUP BY status")
    return Response(
        200,
        {
            "messages": [
                {
                    "id": _int(r["id"], 0),
                    "name": r["name"],
                    "email": r.get("email"),
                    "phone": r.get("phone"),
                    "message": r["message"],
                    "locale": r["locale"],
                    "status": r["status"],
                    "createdAt": _int(r["created_at"], 0),
                }
                for r in rows
            ],
            "counts": {str(c["status"]): _int(c["n"], 0) for c in counts},
        },
    )


async def update_message(req: Request, db: Database, message_id: str) -> Response:
    body = _json_body(req)
    if body is None:
        return _error(400, "invalid_json")
    if not message_id.isdigit():
        return _error(404, "not_found")
    status = body.get("status")
    if status not in MESSAGE_STATUSES:
        return _error(400, "invalid", fields=["status"])
    if not await db.all("SELECT id FROM contact_messages WHERE id = ?", int(message_id)):
        return _error(404, "not_found")
    await db.run("UPDATE contact_messages SET status = ? WHERE id = ?", status, int(message_id))
    return Response(200, {"ok": True})


# ---------------------------------------------------------------- products

ADMIN_PRODUCT_COLUMNS = (
    "slug, name_mn, name_en, description_mn, description_en, category, packaging, volumes, "
    "image_url, shop_url, sort_order, active"
)


def _admin_product(row: Mapping[str, Any]) -> dict[str, Any]:
    try:
        volumes = json.loads(row.get("volumes") or "[]")
    except (TypeError, ValueError):
        volumes = []
    return {
        "slug": row["slug"],
        "nameMn": row["name_mn"],
        "nameEn": row["name_en"],
        "descriptionMn": row["description_mn"],
        "descriptionEn": row["description_en"],
        "category": row["category"],
        "packaging": row["packaging"],
        "volumes": [str(v) for v in volumes] if isinstance(volumes, list) else [],
        "image": row["image_url"],
        "shopUrl": row["shop_url"],
        "sortOrder": _int(row["sort_order"], 0),
        "active": _int(row["active"], 0) == 1,
    }


async def list_admin_products(db: Database) -> Response:
    rows = await db.all(f"SELECT {ADMIN_PRODUCT_COLUMNS} FROM products ORDER BY sort_order, slug")
    return Response(200, {"products": [_admin_product(r) for r in rows]})


TEXT_FIELDS = {
    "nameMn": ("name_mn", 120, False, True),
    "nameEn": ("name_en", 120, False, True),
    "descriptionMn": ("description_mn", 1000, True, False),
    "descriptionEn": ("description_en", 1000, True, False),
}


async def update_product(req: Request, db: Database, slug: str, now: int) -> Response:
    body = _json_body(req)
    if body is None:
        return _error(400, "invalid_json")
    if not SLUG_RE.match(slug) or not await db.all("SELECT slug FROM products WHERE slug = ?", slug):
        return _error(404, "not_found")

    sets: list[str] = []
    values: list[Any] = []
    invalid: list[str] = []
    for key, (column, limit, multiline, required) in TEXT_FIELDS.items():
        if key in body:
            value = _clean(body[key], limit, multiline=multiline)
            if required and not value:
                invalid.append(key)
            sets.append(f"{column} = ?")
            values.append(value)
    for key, column in (("image", "image_url"), ("shopUrl", "shop_url")):
        if key in body:
            value = _clean(body[key], 500)
            if not HTTPS_URL.match(value):
                invalid.append(key)
            sets.append(f"{column} = ?")
            values.append(value)
    if "volumes" in body:
        raw = body["volumes"]
        items = [_clean(v, 20) for v in raw] if isinstance(raw, list) else None
        if items is None or len(items) > 10 or any(not v for v in items):
            invalid.append("volumes")
        else:
            sets.append("volumes = ?")
            values.append(json.dumps(items, ensure_ascii=False))
    if "active" in body:
        if not isinstance(body["active"], bool):
            invalid.append("active")
        sets.append("active = ?")
        values.append(1 if body["active"] is True else 0)
    if "sortOrder" in body:
        order = body["sortOrder"]
        if not isinstance(order, int) or isinstance(order, bool) or not 0 <= order <= 100_000:
            invalid.append("sortOrder")
        sets.append("sort_order = ?")
        values.append(order if isinstance(order, int) else 0)
    if invalid:
        return _error(400, "invalid", fields=sorted(set(invalid)))
    if not sets:
        return _error(400, "nothing_to_update")

    await db.run(f"UPDATE products SET {', '.join(sets)}, updated_at = ? WHERE slug = ?", *values, now, slug)
    rows = await db.all(f"SELECT {ADMIN_PRODUCT_COLUMNS} FROM products WHERE slug = ?", slug)
    return Response(200, {"product": _admin_product(rows[0])})


# ---------------------------------------------------------------- facts

FACT_FIELDS = {"since": "since", "mineralCount": "mineral_count", "additives": "additives"}


async def get_admin_facts(db: Database) -> Response:
    rows = await db.all("SELECT key, value FROM facts")
    by_key = {str(r["key"]): _int(r["value"], 0) for r in rows}
    return Response(200, {"facts": {name: by_key.get(key, 0) for name, key in FACT_FIELDS.items()}})


async def update_facts(req: Request, db: Database) -> Response:
    body = _json_body(req)
    if body is None:
        return _error(400, "invalid_json")
    updates: list[tuple[str, int]] = []
    invalid: list[str] = []
    for name, key in FACT_FIELDS.items():
        if name in body:
            value = body[name]
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 1_000_000:
                invalid.append(name)
            else:
                updates.append((key, value))
    if invalid:
        return _error(400, "invalid", fields=invalid)
    for key, value in updates:
        await db.run("UPDATE facts SET value = ? WHERE key = ?", str(value), key)
        if not await db.all("SELECT key FROM facts WHERE key = ?", key):
            await db.run("INSERT INTO facts (key, value) VALUES (?, ?)", key, str(value))
    return await get_admin_facts(db)


# ---------------------------------------------------------------- routing


def _method_not_allowed(*allowed: str) -> Response:
    return Response(405, {"error": "method_not_allowed"}, {"allow": ", ".join(allowed)})


async def route(req: Request, db: Database, settings: Settings, now: int) -> Response:
    method = req.method.upper()
    path = req.path.rstrip("/").removeprefix("/api/admin") or "/"

    if method not in ("GET", "HEAD") and not _same_site(req, settings):
        return _error(403, "forbidden_origin")

    if path == "/login":
        return await login(req, db, settings, now) if method == "POST" else _method_not_allowed("POST")
    if path == "/logout":
        return await logout(req, db) if method == "POST" else _method_not_allowed("POST")

    user = await _current_user(req, db, now)
    if user is None:
        return _error(401, "unauthorized")

    if path == "/me":
        return Response(200, {"username": user}) if method in ("GET", "HEAD") else _method_not_allowed("GET")
    if path == "/password":
        return await change_password(req, db, user) if method == "POST" else _method_not_allowed("POST")
    if path == "/messages":
        return await list_messages(req, db) if method in ("GET", "HEAD") else _method_not_allowed("GET")
    if path.startswith("/messages/"):
        return await update_message(req, db, path.removeprefix("/messages/")) if method == "PATCH" else _method_not_allowed("PATCH")
    if path == "/products":
        return await list_admin_products(db) if method in ("GET", "HEAD") else _method_not_allowed("GET")
    if path.startswith("/products/"):
        return await update_product(req, db, path.removeprefix("/products/"), now) if method == "PATCH" else _method_not_allowed("PATCH")
    if path == "/facts":
        if method in ("GET", "HEAD"):
            return await get_admin_facts(db)
        return await update_facts(req, db) if method == "PATCH" else _method_not_allowed("GET", "PATCH")
    return _error(404, "not_found")
