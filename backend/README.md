# Khujirt API — Python · Cloudflare Workers · D1

Хужирт сайтын backend. Бүтээгдэхүүн, баримт тоо, холбоо барих маягтын зурвасыг Cloudflare D1 (SQLite) өгөгдлийн санд хадгална.

| Method | Path | Тайлбар |
| --- | --- | --- |
| `GET` | `/api/health` | шалгах |
| `GET` | `/api/products?lang=mn\|en` | идэвхтэй бүтээгдэхүүнүүд, хэлээр |
| `GET` | `/api/products/<slug>?lang=` | нэг бүтээгдэхүүн |
| `GET` | `/api/facts` | сайтын тоон баримтууд (`since`, `mineralCount`, `additives`) |
| `POST` | `/api/contact` | маягтын зурвас (JSON: `name`, `email` эсвэл `phone`, `message`, `locale`) |

Хамгаалалт: honeypot талбар, IP тус бүрээр хязгаар (анхдагч 5 зурвас / цаг), IP-г хадгалахгүй — зөвхөн давсалсан hash, `API_PROXY_KEY` тохируулсан үед зөвхөн сайтын proxy бичих эрхтэй, алдааны дэлгэрэнгүйг гадагш гаргахгүй.

## Бүтэц

```
backend/
├── wrangler.toml            Worker + D1 тохиргоо
├── pyproject.toml           pywrangler / pytest
├── migrations/
│   ├── 0001_init.sql        хүснэгтүүд: products, facts, contact_messages
│   └── 0002_seed.sql        gem.mn дээрх Хужирт бүтээгдэхүүнүүд
├── src/
│   ├── entry.py             Cloudflare Worker (WorkerEntrypoint)
│   └── khujirt_api/
│       ├── app.py           маршрут, шалгалт, CORS — цэвэр Python
│       └── db.py            D1 adapter
└── tests/test_app.py        pytest (D1-ийн оронд SQLite + жинхэнэ migration)
```

## Байршуулах

```bash
cd backend
npx wrangler login
npx wrangler d1 create khujirt                 # гарсан database_id-г wrangler.toml-д бичнэ
npx wrangler d1 migrations apply khujirt --remote
npx wrangler secret put IP_HASH_SALT           # урт санамсаргүй мөр
npx wrangler secret put API_PROXY_KEY          # Vercel дээрх KHUJIRT_API_PROXY_KEY-тэй ижил
npx wrangler deploy                            # эсвэл: uv run pywrangler deploy
```

Гарсан хаягийг (`https://khujirt-api.<subdomain>.workers.dev`) Vercel дээр `KHUJIRT_API_URL` болгож тохируулна.

## Локал дээр

```bash
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply khujirt --local
npx wrangler dev                               # эсвэл: uv run pywrangler dev
python -m pytest                               # эсвэл: uv run pytest
```

## Өгөгдөл засах

```bash
# бүтээгдэхүүнийг түр нуух
npx wrangler d1 execute khujirt --remote --command "UPDATE products SET active = 0 WHERE slug = 'khujirt-yoda'"
# ирсэн зурвасууд
npx wrangler d1 execute khujirt --remote --command "SELECT id, name, email, phone, message, datetime(created_at, 'unixepoch') FROM contact_messages ORDER BY id DESC LIMIT 20"
```

Сайт бүтээгдэхүүнийг 10 минут тутамд шинэчилнэ (ISR). API ажиллахгүй үед сайт `lib/content.ts` доторх нөөц өгөгдлөөр ажилласаар байна.
