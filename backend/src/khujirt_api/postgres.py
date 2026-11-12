"""Postgres adapter (Neon on Vercel), with migrations that apply themselves.

The connection is opened lazily and kept for the life of the function instance. On the first
connection every ``*.sql`` file in the migrations directory that has not run yet is applied, in
name order, inside one transaction guarded by an advisory lock, so a fresh database needs no
manual setup and concurrent cold starts cannot apply a file twice.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Callable, Optional

import psycopg
from psycopg.rows import dict_row

log = logging.getLogger("khujirt_api")

# Names the Vercel ↔ Neon integration (and most hosts) use for the connection string.
URL_VARIABLES = ("DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING")
MIGRATION_LOCK = 735_102  # any constant; identifies this app's migration lock


def database_url(get: Callable[[str], Optional[str]]) -> str:
    for name in URL_VARIABLES:
        value = (get(name) or "").strip()
        if value:
            return value
    return ""


def _placeholders(sql: str) -> str:
    """The handlers write SQLite/D1-style ``?`` placeholders; psycopg wants ``%s``."""
    return sql.replace("%", "%%").replace("?", "%s")


def migrate(conn: psycopg.Connection, directory: Path) -> list[str]:
    """Apply the migrations that have not run yet. Returns the names applied now."""
    files = sorted(directory.glob("*.sql"))
    applied_now: list[str] = []
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK,))
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
        done = {row["name"] for row in conn.execute("SELECT name FROM schema_migrations").fetchall()}
        for file in files:
            if file.name in done:
                continue
            conn.execute(file.read_text(encoding="utf-8"))  # no parameters: several statements are allowed
            conn.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (file.name,))
            applied_now.append(file.name)
    if applied_now:
        log.info("applied migrations: %s", ", ".join(applied_now))
    return applied_now


class Postgres:
    def __init__(self, url: str, migrations: Optional[Path] = None):
        self._url = url
        self._migrations = migrations
        self._conn: Optional[psycopg.Connection] = None

    @property
    def conn(self) -> psycopg.Connection:
        if self._conn is None or self._conn.closed:
            conn = psycopg.connect(
                self._url,
                autocommit=True,
                row_factory=dict_row,
                prepare_threshold=None,  # safe behind Neon's connection pooler
                connect_timeout=10,
                application_name="khujirt-api",
            )
            if self._migrations is not None:
                migrate(conn, self._migrations)
            self._conn = conn
        return self._conn

    def _execute(self, sql: str, params: tuple[Any, ...]) -> psycopg.Cursor:
        query = _placeholders(sql)
        try:
            return self.conn.execute(query, params)
        except psycopg.OperationalError:
            # The pooler or a suspended compute closed an idle connection: reconnect once.
            self.close()
            return self.conn.execute(query, params)

    async def all(self, sql: str, *params: Any) -> list[dict[str, Any]]:
        return [dict(row) for row in self._execute(sql, params).fetchall()]

    async def run(self, sql: str, *params: Any) -> None:
        self._execute(sql, params)

    def close(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            finally:
                self._conn = None
