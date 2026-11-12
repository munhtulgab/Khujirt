"""Run the Vercel function (api/index.py) locally.

    CLOUDFLARE_API_TOKEN=... python3 backend/dev_server.py [port]      # D1 khujirt-db
    DATABASE_URL=postgresql://... python3 backend/dev_server.py [port]  # or Postgres

With KHUJIRT_API_DEV_URL=http://127.0.0.1:8000 in .env.local, `npm run dev` sends /api/* here.
"""

import importlib.util
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

ENTRY = Path(__file__).resolve().parent.parent / "api" / "index.py"


def main() -> None:
    spec = importlib.util.spec_from_file_location("khujirt_vercel_entry", ENTRY)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), module.handler)
    print(f"Khujirt API on http://127.0.0.1:{port}/api/health (database: {module.DB_KIND or 'not configured'})")
    server.serve_forever()


if __name__ == "__main__":
    main()
