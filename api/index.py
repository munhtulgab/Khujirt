"""Khujirt API as a Vercel Python function.

Every /api/* request of the site is rewritten here (next.config.ts) and handled by the same
code as the Cloudflare Worker: backend/src/khujirt_api.

Database, in this order:
  1. Cloudflare D1 `khujirt-db` over the D1 HTTP API, when CLOUDFLARE_API_TOKEN (Account · D1 · Edit)
     is set. Optional: CLOUDFLARE_ACCOUNT_ID (found from the token otherwise), D1_DATABASE_ID.
     The schema is managed with wrangler (backend/migrations).
  2. Postgres, when DATABASE_URL is set; its tables are created from backend/postgres/*.sql.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Mapping, Optional
from urllib.parse import parse_qsl, urlsplit

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend" / "src"))

from khujirt_api import Request, Response, Settings, handle  # noqa: E402
from khujirt_api.app import MAX_BODY_BYTES  # noqa: E402
from khujirt_api.d1_http import D1Http, d1_token  # noqa: E402

MIGRATIONS = ROOT / "backend" / "postgres"
HEADERS = ("content-type", "origin", "user-agent", "x-real-ip", "x-forwarded-for", "x-proxy-key", "cookie", "host", "x-forwarded-host")
ENTRY_PATHS = ("/api", "/api/index", "/api/index.py")


def _database():
    d1 = D1Http.from_env(os.environ.get)
    if d1 is not None:
        return d1, "d1"
    from khujirt_api.postgres import Postgres, database_url  # psycopg only when Postgres is used

    url = database_url(os.environ.get)
    return (Postgres(url, MIGRATIONS), "postgres") if url else (None, "")


def _secret() -> str:
    return d1_token(os.environ.get) or os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL") or ""


def _settings() -> Settings:
    base = Settings.from_env(os.environ.get)
    # Without an explicit IP_HASH_SALT, derive a stable salt from the (private) database credential.
    salt = base.ip_hash_salt or hashlib.sha256(f"khujirt-ip:{_secret()}".encode()).hexdigest()
    return Settings(
        allowed_origins=base.allowed_origins,
        ip_hash_salt=salt,
        proxy_key=base.proxy_key,
        rate_limit=base.rate_limit,
        rate_window=base.rate_window,
        client_ip_header="x-real-ip",  # set by Vercel's edge, cannot be forged by the visitor
    )


SETTINGS = _settings()
DB, DB_KIND = _database()


def _route(raw_path: str, root: str = "", headers: Optional[Mapping[str, str]] = None) -> tuple[str, dict[str, str]]:
    """The API path (always /api/...) and query, however the platform hands the request over.

    The request can arrive as the original path (/api/products), as this function's own path with the
    original one in the query (/api/index?_path=products, from the rewrite in next.config.ts), or with
    the function's mount prefix taken off by the runtime (/products, root "/api").
    """
    parts = urlsplit(raw_path)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    routed = query.pop("_path", None)
    named = query.pop("path", None)  # Next.js passes the :path* segment under its own name too

    path = parts.path or "/"
    if not path.startswith("/"):
        path = "/" + path
    if root and root != "/":
        path = root.rstrip("/") + path
    if path != "/api" and not path.startswith("/api/"):
        path = "/api" + path  # a stripped mount prefix
    if path.rstrip("/") in ENTRY_PATHS:
        target = routed if routed is not None else named
        if target is None and headers is not None:
            # Vercel also sends the captures of the matched route
            matches = dict(parse_qsl(headers.get("x-now-route-matches") or "", keep_blank_values=True))
            target = matches.get("path") or matches.get("1")
        path = "/api/" + (target or "").lstrip("/")
    return path, query


def _database_status() -> dict[str, object]:
    """For /api/health: is the database reachable (this also applies pending migrations)?"""
    if DB is None:
        return {"database": "not_configured"}
    try:
        rows = asyncio.run(DB.all("SELECT COUNT(*) AS n FROM products WHERE active = ?", 1))
        return {"database": "ok", "engine": DB_KIND, "products": int(rows[0]["n"]) if rows else 0}
    except Exception as err:  # the reason goes to the function logs, not to the visitor
        print(f"khujirt-api: database check failed: {err}", file=sys.stderr)
        DB.close()
        return {"database": "error", "engine": DB_KIND}


class handler(BaseHTTPRequestHandler):
    def _serve(self) -> None:
        path, query = _route(self.path, getattr(self, "_vc_service_root_path", "") or "", self.headers)
        method = self.command.upper()
        headers = {name: self.headers[name] for name in HEADERS if self.headers.get(name) is not None}
        length = int(self.headers.get("content-length") or 0)
        body = self.rfile.read(min(length, MAX_BODY_BYTES + 1)).decode("utf-8", "replace") if length > 0 else ""
        req = Request(method=method, path=path, query=query, headers=headers, body=body)

        if DB is None and path.rstrip("/") not in ("/api", "/api/health"):
            result = Response(503, {"error": "not_configured"})
        else:
            result = asyncio.run(handle(req, DB, SETTINGS))  # type: ignore[arg-type]
        if path.rstrip("/") in ("/api", "/api/health") and result.status == 200:
            result.data = {**result.data, **_database_status()}
        if result.status == 404 and isinstance(result.data, dict):
            result.data = {**result.data, "path": path[:200]}  # which route was looked for

        payload = b"" if method == "HEAD" or result.status == 204 else result.text().encode("utf-8")
        self.send_response(result.status)
        headers_out = {"content-type": "application/json; charset=utf-8", **result.headers}
        for name, value in headers_out.items():
            self.send_header(name, value)
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        if payload:
            self.wfile.write(payload)

    do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = _serve

    def log_message(self, format: str, *args) -> None:  # keep request lines out of the function logs
        return

