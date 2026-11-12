"""Khujirt API as a Vercel Python function, on Postgres (Neon).

Every /api/* request of the site is rewritten here (next.config.ts) and handled by the same
code as the Cloudflare Worker: backend/src/khujirt_api. The database comes from DATABASE_URL
(set automatically when a Neon database is connected to the Vercel project); its tables and
seed data are created on the first request from backend/postgres/*.sql.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend" / "src"))

from khujirt_api import Request, Response, Settings, handle  # noqa: E402
from khujirt_api.app import MAX_BODY_BYTES  # noqa: E402
from khujirt_api.postgres import Postgres, database_url  # noqa: E402

MIGRATIONS = ROOT / "backend" / "postgres"
HEADERS = ("content-type", "origin", "user-agent", "x-real-ip", "x-forwarded-for", "x-proxy-key")
ENTRY_PATHS = ("/api", "/api/index", "/api/index.py")


def _settings() -> Settings:
    base = Settings.from_env(os.environ.get)
    url = database_url(os.environ.get)
    # Without an explicit IP_HASH_SALT, derive a stable secret from the (private) connection string.
    salt = base.ip_hash_salt or hashlib.sha256(f"khujirt-ip:{url}".encode()).hexdigest()
    return Settings(
        allowed_origins=base.allowed_origins,
        ip_hash_salt=salt,
        proxy_key=base.proxy_key,
        rate_limit=base.rate_limit,
        rate_window=base.rate_window,
        client_ip_header="x-real-ip",  # set by Vercel's edge, cannot be forged by the visitor
    )


SETTINGS = _settings()
_URL = database_url(os.environ.get)
DB = Postgres(_URL, MIGRATIONS) if _URL else None


def _route(raw_path: str) -> tuple[str, dict[str, str]]:
    """The request path and query. The rewrite also passes the original path as ``_path``."""
    parts = urlsplit(raw_path)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    routed = query.pop("_path", None)
    path = parts.path
    if routed is not None and path.rstrip("/") in ENTRY_PATHS:
        path = "/api/" + routed.lstrip("/")
    return path, query


def _database_status() -> dict[str, object]:
    """For /api/health: is the database reachable (this also applies pending migrations)?"""
    if DB is None:
        return {"database": "not_configured"}
    try:
        row = DB.conn.execute("SELECT COUNT(*) AS n FROM products WHERE active = 1").fetchone()
        return {"database": "ok", "products": int(row["n"]) if row else 0}
    except Exception:  # details stay in the logs
        DB.close()
        return {"database": "error"}


class handler(BaseHTTPRequestHandler):
    def _serve(self) -> None:
        path, query = _route(self.path)
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

