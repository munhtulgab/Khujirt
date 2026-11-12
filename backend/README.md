# Khujirt API — Python · Vercel · Postgres (Neon)

Хужирт сайтын backend. Бүтээгдэхүүн, баримт тоо, холбоо барих маягтын зурвасыг Postgres (Neon) өгөгдлийн санд хадгална.
Сайттай нэг Vercel төсөлд Python функц (`api/index.py`) болж ажиллана; сайтын `/api/*` бүгд түүн рүү очно.

| Method | Path | Тайлбар |
| --- | --- | --- |
| `GET` | `/api/health` | шалгах: `database` (`ok` / `not_configured` / `error`), `products` |
| `GET` | `/api/products?lang=mn\|en` | идэвхтэй бүтээгдэхүүнүүд, хэлээр |
| `GET` | `/api/products/<slug>?lang=` | нэг бүтээгдэхүүн |
| `GET` | `/api/facts` | сайтын тоон баримтууд (`since`, `mineralCount`, `additives`) |
| `POST` | `/api/contact` | маягтын зурвас (JSON: `name`, `email` эсвэл `phone`, `message`, `locale`) |

Хамгаалалт: honeypot талбар, IP тус бүрээр хязгаар (анхдагч 5 зурвас / цаг; IP-г Vercel-ийн `x-real-ip`-ээс авна),
IP-г хадгалахгүй — зөвхөн давсалсан hash, алдааны дэлгэрэнгүйг гадагш гаргахгүй.

## Бүтэц

```
api/index.py                 Vercel Python функц: хүсэлт → khujirt_api.handle, Postgres холболт
requirements.txt             psycopg
vercel.json                  функцэд backend/src, backend/postgres-ийг багтаана
backend/
├── postgres/
│   ├── 0001_init.sql        хүснэгтүүд: products, facts, contact_messages
│   └── 0002_seed.sql        gem.mn дээрх Хужирт бүтээгдэхүүнүүд, хэмжээнүүд
├── src/khujirt_api/
│   ├── app.py               маршрут, шалгалт, CORS — цэвэр Python
│   ├── postgres.py          Postgres adapter + migration-ийг өөрөө хийнэ
│   └── db.py                D1 adapter (Cloudflare хувилбар)
├── dev_server.py            api/index.py-г локал дээр ажиллуулна
├── tests/                   pytest: SQLite, жинхэнэ Postgres, HTTP-ээр функц бүтнээрээ
├── src/entry.py, wrangler.toml, migrations/   Cloudflare Worker + D1 хувилбар (заавал биш)
└── pyproject.toml
```

## Бааз холбох (нэг удаа)

Vercel → **khujirt** төсөл → **Storage** → **Create Database** → **Neon** → нэр `khujirt-db` → **Connect**.
Vercel `DATABASE_URL`-ийг өөрөө нэмнэ (`POSTGRES_URL` гэх мэт нэрийг ч таньна). Дараа нь **Redeploy**.

Эхний хүсэлтээр функц `backend/postgres/*.sql`-ээс ажиллаагүйг нь дарааллаар хийж `schema_migrations`-д тэмдэглэнэ
(advisory lock-той, давхар хийгдэхгүй; баазад гараар засварласан өгөгдлийг дарахгүй).
Шалгах: `https://khujirt.vercel.app/api/health` → `{"database": "ok", "products": 6}`.

Шинэ migration: `backend/postgres/0003_….sql` нэмээд push хийхэд дараагийн хүсэлтээр хийгдэнэ.

## Локал дээр

```bash
DATABASE_URL=postgresql://… python3 backend/dev_server.py        # http://127.0.0.1:8000/api/health
# .env.local: KHUJIRT_API_DEV_URL=http://127.0.0.1:8000  →  npm run dev дээр /api/* энд очно

cd backend
python -m pytest                                                  # SQLite
KHUJIRT_TEST_DATABASE_URL=postgresql://…/scratch python -m pytest # + Postgres (баазыг тест бүрт цэвэрлэнэ!)
```

## Өгөгдөл засах

Vercel → Storage → `khujirt-db` → **Open in Neon** → SQL Editor:

```sql
-- бүтээгдэхүүнийг түр нуух
UPDATE products SET active = 0 WHERE slug = 'khujirt-yoda';
-- ирсэн зурвасууд
SELECT id, name, email, phone, message, to_timestamp(created_at) FROM contact_messages ORDER BY id DESC LIMIT 20;
```

Сайт бүтээгдэхүүнийг 10 минут тутамд шинэчилнэ (ISR). API ажиллахгүй үед сайт `lib/content.ts` доторх нөөц өгөгдлөөр ажилласаар байна.

## Cloudflare хувилбар (заавал биш)

Ижил код Cloudflare Worker + D1 дээр ч ажиллана (`src/entry.py`, `wrangler.toml`, `migrations/`; D1 бааз `khujirt-db` үүссэн):
`npx wrangler login && npx wrangler secret put IP_HASH_SALT && npx wrangler deploy`, дараа нь сайт дээр `KHUJIRT_API_URL`.
