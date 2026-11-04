"""Cloudflare Worker entry point (Python). Adapts the runtime to khujirt_api.handle."""

from urllib.parse import parse_qsl, urlparse

from workers import Response, WorkerEntrypoint

from khujirt_api import Request, Settings, handle
from khujirt_api.db import D1

# Only the request headers the API looks at.
HEADERS = ("content-type", "origin", "x-forwarded-for", "x-proxy-key", "cf-connecting-ip", "user-agent")


def _env(env, key):
    value = getattr(env, key, None)
    return None if value is None else str(value)


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = urlparse(str(request.url))
        method = str(request.method).upper()

        headers = {}
        for name in HEADERS:
            value = request.headers.get(name)
            if value is not None:
                headers[name] = str(value)

        body = str(await request.text()) if method in ("POST", "PUT", "PATCH") else ""
        settings = Settings.from_env(lambda key: _env(self.env, key))

        result = await handle(
            Request(method=method, path=url.path, query=dict(parse_qsl(url.query)), headers=headers, body=body),
            D1(self.env.DB),
            settings,
        )
        payload = None if method == "HEAD" or result.status == 204 else result.text()
        return Response(payload, status=result.status, headers=result.headers)
