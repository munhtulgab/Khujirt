"""Cloudflare D1 adapter.

The D1 binding is a JavaScript object reached through Pyodide's FFI; results come back as JS
proxies, so they are converted to plain Python dicts here and the rest of the code never sees JS.
"""

from __future__ import annotations

from typing import Any


def _py(value: Any) -> Any:
    to_py = getattr(value, "to_py", None)
    return to_py() if callable(to_py) else value


def _rows(result: Any) -> list[dict[str, Any]]:
    result = _py(result)
    rows = result.get("results") if isinstance(result, dict) else getattr(result, "results", None)
    rows = _py(rows) or []
    return [dict(_py(row)) for row in rows]


class D1:
    def __init__(self, binding: Any):
        self._db = binding

    def _statement(self, sql: str, params: tuple[Any, ...]) -> Any:
        if any(p is None for p in params):
            # Python None becomes JS undefined, which D1 rejects; bind '' and use NULLIF(?, '') instead.
            raise ValueError("D1 parameters must not be None")
        statement = self._db.prepare(sql)
        return statement.bind(*params) if params else statement

    async def all(self, sql: str, *params: Any) -> list[dict[str, Any]]:
        return _rows(await self._statement(sql, params).all())

    async def run(self, sql: str, *params: Any) -> None:
        await self._statement(sql, params).run()
