"""Khujirt API: products, facts and the contact form. Runs as a Vercel Python function on Postgres
(``api/index.py``) or as a Cloudflare Worker on D1 (``src/entry.py``)."""

from .app import Request, Response, Settings, handle

__all__ = ["Request", "Response", "Settings", "handle"]
