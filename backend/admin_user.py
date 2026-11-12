"""Print the SQL that creates an admin user, or resets the password of an existing one.

    python3 backend/admin_user.py admin                 # asks for the password
    npx wrangler d1 execute khujirt-db --remote --command "<the printed SQL>"

The password is stored only as a PBKDF2-SHA256 hash.
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from khujirt_api.admin import hash_password  # noqa: E402


def main() -> None:
    username = (sys.argv[1] if len(sys.argv) > 1 else "admin").strip().lower()
    password = getpass.getpass(f"Password for {username}: ")
    if len(password) < 6:
        sys.exit("Too short.")
    hashed = hash_password(password)
    print(
        "INSERT INTO admin_users (username, password_hash) VALUES "
        f"('{username}', '{hashed}') "
        "ON CONFLICT (username) DO UPDATE SET password_hash = excluded.password_hash;"
    )


if __name__ == "__main__":
    main()
