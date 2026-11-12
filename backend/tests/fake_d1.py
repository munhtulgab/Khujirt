"""A stand-in for the Cloudflare D1 HTTP API, backed by SQLite built from the D1 migrations."""

import json
import re
import sqlite3
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
TOKEN = "test-d1-token"
ACCOUNT = "edac0cf05840fa04d320871518924587"  # the default in d1_http
DATABASE = "a748e6df-ddbf-4111-a723-f9c836cbf3e7"


class FakeD1:
    def __init__(self, accounts=(ACCOUNT,)):
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            self.conn.executescript(migration.read_text(encoding="utf-8"))
        self.lock = threading.Lock()
        self.accounts = list(accounts)
        self.requests = []
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def _send(self, status, payload):
                body = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("content-type", "application/json")
                self.send_header("content-length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _auth(self):
                if self.headers.get("authorization") != f"Bearer {TOKEN}":
                    self._send(401, {"success": False, "errors": [{"code": 10000, "message": "Authentication error"}]})
                    return False
                return True

            def do_GET(self):
                fake.requests.append(("GET", self.path))
                if not self._auth():
                    return
                if self.path.startswith("/client/v4/accounts?"):
                    return self._send(200, {"success": True, "result": [{"id": a, "name": a} for a in fake.accounts]})
                m = re.fullmatch(r"/client/v4/accounts/([^/]+)/d1/database/([^/?]+)", self.path)
                if m and m.group(1) == ACCOUNT and m.group(2) == DATABASE:
                    return self._send(200, {"success": True, "result": {"uuid": DATABASE, "name": "khujirt-db"}})
                self._send(404, {"success": False, "errors": [{"code": 7404, "message": "not found"}]})

            def do_POST(self):
                fake.requests.append(("POST", self.path))
                if not self._auth():
                    return
                m = re.fullmatch(r"/client/v4/accounts/([^/]+)/d1/database/([^/]+)/query", self.path)
                if not (m and m.group(1) == ACCOUNT and m.group(2) == DATABASE):
                    return self._send(404, {"success": False, "errors": [{"code": 7404, "message": "not found"}]})
                body = json.loads(self.rfile.read(int(self.headers["content-length"])))
                try:
                    with fake.lock:
                        cur = fake.conn.execute(body["sql"], body.get("params") or [])
                        rows = [dict(r) for r in cur.fetchall()]
                        fake.conn.commit()
                except sqlite3.Error as err:
                    return self._send(400, {"success": False, "errors": [{"code": 7500, "message": str(err)}]})
                self._send(200, {"success": True, "errors": [], "result": [{"results": rows, "success": True, "meta": {}}]})

            def log_message(self, *args):
                return

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.api = f"http://127.0.0.1:{self.httpd.server_address[1]}/client/v4"

    def messages(self):
        with self.lock:
            return [dict(r) for r in self.conn.execute("SELECT * FROM contact_messages ORDER BY id").fetchall()]

    def stop(self):
        self.httpd.shutdown()
