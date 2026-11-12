"""Cloudflare D1 over its HTTP API, for running the API outside Cloudflare (the Vercel function).

    POST /client/v4/accounts/{account}/d1/database/{database}/query   {"sql": "...", "params": [...]}

Needs an API token with the Account · D1 · Edit permission. The account is taken from
CLOUDFLARE_ACCOUNT_ID or, when that is not set, found by asking which accounts the token can
use and picking the one that holds the database. Standard library only.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Callable, Optional

log = logging.getLogger("khujirt_api")

API = "https://api.cloudflare.com/client/v4"
# khujirt-db (see backend/wrangler.toml); not a secret.
DEFAULT_DATABASE_ID = "a748e6df-ddbf-4111-a723-f9c836cbf3e7"
TOKEN_VARIABLES = ("CLOUDFLARE_D1_TOKEN", "CLOUDFLARE_API_TOKEN")


class D1HttpError(RuntimeError):
    pass


def d1_token(get: Callable[[str], Optional[str]]) -> str:
    for name in TOKEN_VARIABLES:
        value = (get(name) or "").strip()
        if value:
            return value
    return ""


class D1Http:
    def __init__(
        self,
        token: str,
        database_id: str = DEFAULT_DATABASE_ID,
        account_id: str = "",
        api: Optional[str] = None,
        timeout: float = 8.0,
    ):
        self._token = token
        self._database = database_id or DEFAULT_DATABASE_ID
        self._account = account_id
        self._api = (api or API).rstrip("/")
        self._timeout = timeout

    @classmethod
    def from_env(cls, get: Callable[[str], Optional[str]], **kwargs: Any) -> Optional["D1Http"]:
        token = d1_token(get)
        if not token:
            return None
        return cls(
            token,
            database_id=(get("D1_DATABASE_ID") or "").strip(),
            account_id=(get("CLOUDFLARE_ACCOUNT_ID") or "").strip(),
            **kwargs,
        )

    # ------------------------------------------------------------ HTTP

    def _call(self, method: str, path: str, body: Any = None) -> Any:
        data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            f"{self._api}{path}",
            data=data,
            method=method,
            headers={
                "authorization": f"Bearer {self._token}",
                "content-type": "application/json",
                "user-agent": "khujirt-api",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as res:
                payload = json.loads(res.read() or b"{}")
        except urllib.error.HTTPError as err:
            try:
                payload = json.loads(err.read() or b"{}")
            except ValueError:
                payload = {}
            raise D1HttpError(f"{method} {path.split('?')[0]} → HTTP {err.code}: {_messages(payload)}") from None
        except (urllib.error.URLError, TimeoutError, ValueError) as err:
            raise D1HttpError(f"{method} {path.split('?')[0]} failed: {err}") from None
        if not payload.get("success", False):
            raise D1HttpError(f"{method} {path.split('?')[0]}: {_messages(payload)}")
        return payload.get("result")

    def _account_id(self) -> str:
        if self._account:
            return self._account
        accounts = self._call("GET", "/accounts?per_page=50") or []
        ids = [a.get("id") for a in accounts if isinstance(a, dict) and a.get("id")]
        if len(ids) == 1:
            self._account = ids[0]
            return self._account
        for account in ids:  # several accounts: use the one that has the database
            try:
                self._call("GET", f"/accounts/{account}/d1/database/{self._database}")
            except D1HttpError:
                continue
            self._account = account
            return account
        raise D1HttpError("no Cloudflare account with this D1 database is visible to the token; set CLOUDFLARE_ACCOUNT_ID")

    def _query(self, sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        if any(p is None for p in params):
            raise ValueError("D1 parameters must not be None")
        result = self._call(
            "POST",
            f"/accounts/{self._account_id()}/d1/database/{self._database}/query",
            {"sql": sql, "params": list(params)},
        )
        statements = result if isinstance(result, list) else [result]
        rows: list[dict[str, Any]] = []
        for statement in statements:
            if not isinstance(statement, dict):
                continue
            if statement.get("success") is False:
                raise D1HttpError(f"query failed: {_messages(statement)}")
            rows.extend(dict(r) for r in statement.get("results") or [] if isinstance(r, dict))
        return rows

    # ------------------------------------------------------------ Database protocol

    async def all(self, sql: str, *params: Any) -> list[dict[str, Any]]:
        return self._query(sql, params)

    async def run(self, sql: str, *params: Any) -> None:
        self._query(sql, params)

    def close(self) -> None:  # nothing held open
        return


def _messages(payload: Any) -> str:
    if not isinstance(payload, dict):
        return "unknown error"
    errors = payload.get("errors") or []
    text = "; ".join(str(e.get("message", e)) if isinstance(e, dict) else str(e) for e in errors)
    return text or str(payload.get("error") or "unknown error")
