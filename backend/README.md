# Khujirt API — Python · Vercel · Cloudflare D1

Хужирт сайтын backend. Бүтээгдэхүүн, баримт тоо, холбоо барих маягтын зурвасыг Cloudflare D1 бааз `khujirt-db`-д хадгална.
Сайттай нэг Vercel төсөлд Python функц (`api/index.py`) болж ажиллана; сайтын `/api/*` бүгд түүн рүү очно.
Функц D1-д [D1 HTTP API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/)-аар хандана
(`backend/src/khujirt_api/d1_http.py`, зөвхөн стандарт сан). Хүсвэл D1-ийн оронд Postgres ч болно.

| Method | Path | Тайлбар |
| --- | --- | --- |
| `GET` | `/api/health` | шалгах: `database` (`ok` / `not_configured` / `error`), `engine` (`d1` / `postgres`), `products` |
| `GET` | `/api/products?lang=mn\|en` | идэвхтэй бүтээгдэхүүнүүд, хэлээр |
| `GET` | `/api/products/<slug>?lang=` | нэг бүтээгдэхүүн |
| `GET` | `/api/facts` | сайтын тоон баримтууд (`since`, `mineralCount`, `additives`) |
| `POST` | `/api/contact` | маягтын зурвас (JSON: `name`, `email` эсвэл `phone`, `message`, `locale`) |
| `*` | `/api/admin/…` | админ: `login`, `logout`, `me`, `password`, `messages`, `products`, `facts` ([admin.py](src/khujirt_api/admin.py)) |

Хамгаалалт: honeypot талбар, IP тус бүрээр хязгаар (анхдагч 5 зурвас / цаг; IP-г Vercel-ийн `x-real-ip`-ээс авна),
IP-г хадгалахгүй — зөвхөн давсалсан hash, алдааны дэлгэрэнгүйг гадагш гаргахгүй.

## Бүтэц

```
api/index.py                 Vercel Python функц: хүсэлт → khujirt_api.handle, бааз сонгох
requirements.txt             psycopg (зөвхөн Postgres хувилбарт)
vercel.json                  функцэд backend/src, backend/postgres-ийг багтаана
backend/
├── migrations/              D1 schema (wrangler): 0001 хүснэгт, 0002 бүтээгдэхүүн, 0003 хэмжээ, 0004 админ — khujirt-db-д хийгдсэн
├── src/khujirt_api/
│   ├── app.py               маршрут, шалгалт, CORS — цэвэр Python
│   ├── d1_http.py           D1 HTTP API adapter (Vercel → khujirt-db)
│   ├── db.py                D1 binding adapter (Cloudflare Worker хувилбар)
│   └── postgres.py          Postgres adapter (D1-ийн оронд, заавал биш)
├── postgres/                Postgres schema + seed (D1-тэй ижил өгөгдөл)
├── dev_server.py            api/index.py-г локал дээр ажиллуулна
├── tests/                   pytest: SQLite, D1 HTTP (fake_d1.py), жинхэнэ Postgres, HTTP-ээр функц бүтнээрээ
├── src/entry.py, wrangler.toml   Cloudflare Worker хувилбар (заавал биш)
└── pyproject.toml
```

## D1 холбох (нэг удаа)

1. Cloudflare → My Profile → **API Tokens** → **Create Token** → **Custom token**
   → Permissions: **Account · D1 · Edit** → Account Resources: өөрийн account → **Create Token**.
2. Vercel → **khujirt** → Settings → **Environment Variables** → `CLOUDFLARE_API_TOKEN` (Production, Preview) → **Redeploy**.

Account-ийг token-оос өөрөө олно (хэд байвал `khujirt-db` байгааг нь); эс бөгөөс `CLOUDFLARE_ACCOUNT_ID`.
Өөр D1 бааз бол `D1_DATABASE_ID`. Шалгах: `https://khujirt.vercel.app/api/health` → `{"database": "ok", "engine": "d1", "products": 6}`.

D1 schema-г wrangler-аар удирдана: шинэ `backend/migrations/0004_….sql` → `npx wrangler d1 migrations apply khujirt-db --remote`.

### Postgres хувилбар

`CLOUDFLARE_API_TOKEN` байхгүй, `DATABASE_URL` байвал (Vercel → Storage → Neon) Postgres ашиглана;
`backend/postgres/*.sql` эхний хүсэлтээр өөрөө хийгдэнэ (advisory lock, `schema_migrations`).

## Локал дээр

```bash
CLOUDFLARE_API_TOKEN=… python3 backend/dev_server.py             # http://127.0.0.1:8000/api/health
# .env.local: KHUJIRT_API_DEV_URL=http://127.0.0.1:8000  →  npm run dev дээр /api/* энд очно

cd backend
python -m pytest                                                  # SQLite + D1 HTTP (fake)
KHUJIRT_TEST_DATABASE_URL=postgresql://…/scratch python -m pytest # + Postgres (баазыг тест бүрт цэвэрлэнэ!)
```

## Админ

Сайтын `/admin` хуудас эдгээр API-г ашиглана. Хэрэглэгчид `admin_users` хүснэгтэд PBKDF2-SHA256 hash-аар хадгалагдана
(repo-д нууц үг, hash байхгүй). Шинэ хэрэглэгч эсвэл нууц үг сэргээх:

```bash
python3 backend/admin_user.py admin        # нууц үгийг асууна, SQL хэвлэнэ
npx wrangler d1 execute khujirt-db --remote --command "<хэвлэсэн SQL>"
```

## Өгөгдөл засах

Cloudflare → Storage & Databases → D1 → `khujirt-db` → **Console**, эсвэл `npx wrangler d1 execute khujirt-db --remote --command "…"`:

```sql
-- бүтээгдэхүүнийг түр нуух
UPDATE products SET active = 0 WHERE slug = 'khujirt-yoda';
-- ирсэн зурвасууд
SELECT id, name, email, phone, message, datetime(created_at, 'unixepoch') FROM contact_messages ORDER BY id DESC LIMIT 20;
```

Сайт бүтээгдэхүүнийг 10 минут тутамд шинэчилнэ (ISR). API ажиллахгүй үед сайт `lib/content.ts` доторх нөөц өгөгдлөөр ажилласаар байна.

## Cloudflare Worker хувилбар (заавал биш)

Ижил код Cloudflare Worker дээр D1 binding-аар ч ажиллана (`src/entry.py`, `wrangler.toml`):
`npx wrangler login && npx wrangler secret put IP_HASH_SALT && npx wrangler deploy`, дараа нь сайт дээр `KHUJIRT_API_URL`.
