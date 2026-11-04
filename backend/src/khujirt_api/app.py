"""Request handling for the Khujirt API.

Plain Python with no Cloudflare imports: the Worker (``src/entry.py``) adapts the runtime's request,
environment and D1 binding to these types, and the tests run the same code against SQLite.

Routes
  GET  /api/health              service check
  GET  /api/products?lang=mn    active products, localised (mn | en)
  GET  /api/products/<slug>     one product
  GET  /api/facts               headline numbers
  POST /api/contact             store a contact-form message (JSON)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Mapping, Optional, Protocol

log = logging.getLogger("khujirt_api")

LOCALES = ("mn", "en")
DEFAULT_LOCALE = "mn"
MAX_BODY_BYTES = 16 * 1024
PUBLIC_CACHE = "public, max-age=300, s-maxage=600"

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_RE = re.compile(r"^[+\d][\d\s()\-]{5,30}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class Database(Protocol):
    """What the handlers need from D1. Parameters must never be ``None`` (D1 rejects undefined)."""

    async def all(self, sql: str, *params: Any) -> list[dict[str, Any]]: ...

    async def run(self, sql: str, *params: Any) -> None: ...


def _int(value: Any, default: int) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class Settings:
    allowed_origins: tuple[str, ...] = ()
    ip_hash_salt: str = ""
    proxy_key: str = ""
    rate_limit: int = 5
    rate_window: int = 3600

    @classmethod
    def from_env(cls, get: Callable[[str], Optional[str]]) -> "Settings":
        origins = tuple(o.strip().rstrip("/") for o in (get("ALLOWED_ORIGINS") or "").split(",") if o.strip())
        return cls(
            allowed_origins=origins,
            ip_hash_salt=get("IP_HASH_SALT") or "",
            proxy_key=get("API_PROXY_KEY") or "",
            rate_limit=max(1, _int(get("CONTACT_RATE_LIMIT"), 5)),
            rate_window=max(60, _int(get("CONTACT_RATE_WINDOW"), 3600)),
        )


@dataclass
class Request:
    method: str
    path: str
    query: Mapping[str, str] = field(default_factory=dict)
    headers: Mapping[str, str] = field(default_factory=dict)  # lower-case header names
    body: str = ""


@dataclass
class Response:
    status: int
    data: Any = None
    headers: dict[str, str] = field(default_factory=dict)

    def text(self) -> str:
        return "" if self.data is None else json.dumps(self.data, ensure_ascii=False, separators=(",", ":"))


def _error(status: int, code: str, **extra: Any) -> Response:
    return Response(status, {"error": code, **extra})


def _locale(value: Any) -> str:
    value = str(value or "").lower()
    return value if value in LOCALES else DEFAULT_LOCALE


def _clean(value: Any, limit: int, multiline: bool = False) -> str:
    """Trim, strip control characters and collapse whitespace (keeps paragraphs when multiline)."""
    if not isinstance(value, str):
        return ""
    text = CONTROL_RE.sub("", value.replace("\r\n", "\n").replace("\r", "\n"))
    if multiline:
        text = "\n".join(" ".join(line.split()) for line in text.split("\n"))
        text = re.sub(r"\n{3,}", "\n\n", text)
    else:
        text = " ".join(text.split())
    return text.strip()[:limit].strip()


# ---------------------------------------------------------------- products & facts

PRODUCT_COLUMNS = "slug, name_mn, name_en, description_mn, description_en, category, packaging, volumes, image_url, shop_url"


def _product(row: Mapping[str, Any], lang: str) -> dict[str, Any]:
    try:
        volumes = json.loads(row.get("volumes") or "[]")
    except (TypeError, ValueError):
        volumes = []
    if not isinstance(volumes, list):
        volumes = []
    return {
        "slug": row["slug"],
        "name": row.get(f"name_{lang}") or row.get("name_mn") or "",
        "description": row.get(f"description_{lang}") or row.get("description_mn") or "",
        "category": row["category"],
        "packaging": row["packaging"],
        "volumes": [str(v) for v in volumes if isinstance(v, (str, int, float))],
        "image": row["image_url"],
        "shopUrl": row["shop_url"],
    }


async def list_products(db: Database, lang: str) -> Response:
    rows = await db.all(f"SELECT {PRODUCT_COLUMNS} FROM products WHERE active = 1 ORDER BY sort_order, slug")
    return Response(200, {"products": [_product(r, lang) for r in rows], "lang": lang}, {"cache-control": PUBLIC_CACHE})


async def get_product(db: Database, slug: str, lang: str) -> Response:
    if not SLUG_RE.match(slug):
        return _error(404, "not_found")
    rows = await db.all(f"SELECT {PRODUCT_COLUMNS} FROM products WHERE active = 1 AND slug = ? LIMIT 1", slug)
    if not rows:
        return _error(404, "not_found")
    return Response(200, {"product": _product(rows[0], lang), "lang": lang}, {"cache-control": PUBLIC_CACHE})


FACT_KEYS = {"since": "since", "mineral_count": "mineralCount", "additives": "additives"}


async def get_facts(db: Database) -> Response:
    rows = await db.all("SELECT key, value FROM facts")
    facts: dict[str, int] = {}
    for row in rows:
        name = FACT_KEYS.get(str(row.get("key")))
        number = _int(row.get("value"), -1)
        if name and number >= 0:
            facts[name] = number
    return Response(200, {"facts": facts}, {"cache-control": PUBLIC_CACHE})


# ---------------------------------------------------------------- contact form


def _client_ip(req: Request, trusted_proxy: bool) -> str:
    if trusted_proxy:
        forwarded = req.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return req.headers.get("cf-connecting-ip", "").strip() or "unknown"


def _hash_ip(ip: str, salt: str) -> str:
    return hmac.new(salt.encode(), ip.encode(), hashlib.sha256).hexdigest()[:32]


async def create_contact(req: Request, db: Database, settings: Settings, now: float) -> Response:
    trusted_proxy = False
    if settings.proxy_key:
        # Only the site's own /api/contact proxy may post: it holds the shared key.
        if not hmac.compare_digest(req.headers.get("x-proxy-key", ""), settings.proxy_key):
            return _error(401, "unauthorized")
        trusted_proxy = True

    if "application/json" not in req.headers.get("content-type", "").lower():
        return _error(415, "unsupported_media_type")
    if len(req.body.encode("utf-8")) > MAX_BODY_BYTES:
        return _error(413, "too_large")
    try:
        payload = json.loads(req.body or "{}")
    except ValueError:
        return _error(400, "invalid_json")
    if not isinstance(payload, dict):
        return _error(400, "invalid_json")

    # Honeypot field that people never see: pretend it worked and keep nothing.
    if _clean(payload.get("company"), 200):
        return Response(200, {"ok": True})

    name = _clean(payload.get("name"), 120)
    email = _clean(payload.get("email"), 254).lower()
    phone = _clean(payload.get("phone"), 32)
    message = _clean(payload.get("message"), 4000, multiline=True)
    locale = _locale(payload.get("locale"))

    invalid: set[str] = set()
    if not name:
        invalid.add("name")
    if email and not EMAIL_RE.match(email):
        invalid.add("email")
    if phone and not PHONE_RE.match(phone):
        invalid.add("phone")
    if not email and not phone:
        invalid.update(("email", "phone"))
    if len(message) < 5:
        invalid.add("message")
    if invalid:
        return _error(400, "invalid", fields=sorted(invalid))

    ip_hash = _hash_ip(_client_ip(req, trusted_proxy), settings.ip_hash_salt)
    rows = await db.all(
        "SELECT COUNT(*) AS n FROM contact_messages WHERE ip_hash = ? AND created_at > ?",
        ip_hash,
        int(now) - settings.rate_window,
    )
    if rows and _int(rows[0].get("n"), 0) >= settings.rate_limit:
        return Response(429, {"error": "rate_limited"}, {"retry-after": str(settings.rate_window)})

    await db.run(
        "INSERT INTO contact_messages (name, email, phone, message, locale, ip_hash, user_agent, created_at) "
        "VALUES (?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''), ?)",
        name,
        email,
        phone,
        message,
        locale,
        ip_hash,
        _clean(req.headers.get("user-agent"), 300),
        int(now),
    )
    return Response(201, {"ok": True})


# ---------------------------------------------------------------- routing

Handler = Callable[[], Awaitable[Response]]


def _allow(method: str, allowed: tuple[str, ...], handler: Handler) -> Awaitable[Response] | Response:
    if method in allowed:
        return handler()
    return Response(405, {"error": "method_not_allowed"}, {"allow": ", ".join(allowed + ("OPTIONS",))})


async def _route(req: Request, db: Database, settings: Settings, now: float) -> Response:
    method = req.method.upper()
    path = req.path.rstrip("/") or "/"
    lang = _locale(req.query.get("lang"))

    if method == "OPTIONS":
        return Response(204)

    if path in ("/", "/api", "/api/health"):
        result = _allow(method, ("GET", "HEAD"), lambda: _ok())
    elif path == "/api/products":
        result = _allow(method, ("GET", "HEAD"), lambda: list_products(db, lang))
    elif path.startswith("/api/products/"):
        slug = path.removeprefix("/api/products/")
        result = _allow(method, ("GET", "HEAD"), lambda: get_product(db, slug, lang))
    elif path == "/api/facts":
        result = _allow(method, ("GET", "HEAD"), lambda: get_facts(db))
    elif path == "/api/contact":
        result = _allow(method, ("POST",), lambda: create_contact(req, db, settings, now))
    else:
        return _error(404, "not_found")

    return result if isinstance(result, Response) else await result


async def _ok() -> Response:
    return Response(200, {"ok": True, "service": "khujirt-api"})


def _apply_headers(resp: Response, req: Request, settings: Settings) -> None:
    headers = resp.headers
    if resp.data is not None:
        headers.setdefault("content-type", "application/json; charset=utf-8")
    headers.setdefault("cache-control", "no-store")
    headers["x-content-type-options"] = "nosniff"
    headers["vary"] = "Origin"

    origin = req.headers.get("origin", "").rstrip("/")
    if not origin:
        return
    if req.path.rstrip("/") == "/api/contact":
        if origin in settings.allowed_origins:
            headers["access-control-allow-origin"] = origin
            headers["access-control-allow-methods"] = "POST, OPTIONS"
            headers["access-control-allow-headers"] = "content-type"
            headers["access-control-max-age"] = "86400"
    else:
        # products and facts are public, read-only data
        headers["access-control-allow-origin"] = "*"
        headers["access-control-allow-methods"] = "GET, HEAD, OPTIONS"
        headers["access-control-max-age"] = "86400"


async def handle(req: Request, db: Database, settings: Settings, now: Optional[float] = None) -> Response:
    """Entry point used by the Worker and the tests."""
    try:
        resp = await _route(req, db, settings, time.time() if now is None else now)
    except Exception:  # never leak internals to the client
        log.exception("unhandled error on %s %s", req.method, req.path)
        resp = _error(500, "server_error")
    _apply_headers(resp, req, settings)
    return resp
