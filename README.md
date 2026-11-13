# Хужирт — Байгалийн эрдэст ус

Хужирт брэндийн вэб сайт: «Өвгөн Шунхлайн домог»-оор өрнөх 3D түүх. Намрын нар мандах үеийн хөндий, халуун булгаас савсах уур, уурын дундаас тодрох шилэн тунгалаг буга, шар шинэс, нарс, цастай Гуа · Шивээт уулс ба Шунхлайн сэрвэн хад, усанд зогсох Хужирт усны бүх 3D сав. Гүйлгэх тусам домог зургаан агшинд өрнөнө: намрын өглөөний уур → доголон буга → үдэш бүр нэг хонхорт → халуун булаг → рашаан → өнөөдөр; домгийг бүтнээр нь ч уншиж болно. Монгол / англи хэлтэй.

![Хужирт](public/og/og-mn.jpg)

## Бүтэц

Frontend нь repo-гийн үндсэн хавтсанд (Next.js 15 App Router, React 19, Tailwind CSS v4,
Three.js + React Three Fiber + drei, GSAP ScrollTrigger, Lenis), backend нь Python:
Vercel дээрх Python функц (`api/index.py`) + Cloudflare D1 бааз `khujirt-db`, код нь `backend/` хавтсанд ([backend/README.md](backend/README.md)).

```
khujirt/
├── app/
│   ├── [lang]/layout.tsx · page.tsx   /mn, /en хуудас, SEO metadata, JSON-LD
│   ├── sitemap.ts · robots.ts · manifest.ts · icon.svg · apple-icon.png
│   └── globals.css                    брэндийн өнгө (@theme), бүрэлдэхүүн
├── components/
│   ├── three/      3D тайз: Deer (шилэн буга), StagParticles (GPU цэгэн буга),
│   │               Bottles3D + bottleShape.ts + bottleModel.ts (бүтээгдэхүүний зургаас 3D сав),
│   │               Steam (халуун булгийн уур), Lake (тусгал, долгион), Droplets (дусал),
│   │               Terrain + landscape.ts (уул, нуга, Шунхлайн хад), Forest (шинэс, нарс),
│   │               Shore (чулуу, өвс), Sky (алтлаг тэнгэр), Mist, CameraRig, story.ts (гүйлгэлтийн төлөв)
│   ├── sections/   Hero, Legend, Facts, Products, Contact
│   ├── layout/     Header, Footer, SmoothScroll (Lenis)
│   └── StoryDriver.tsx                ScrollTrigger → 3D түүхийн timeline
├── lib/            i18n.ts (MN/EN текст), content.ts (бүтээгдэхүүн), api.ts, site.ts
├── public/         models/deer.glb (221 KB, meshopt), models/stag-points.bin,
│                   brand/khujirt-logo.webp, og/ (хуваалцах зураг)
├── api/index.py    Python API — Vercel функц (/api/* бүгд энд ирнэ)
├── requirements.txt · vercel.json   Python хамаарал, функцийн тохиргоо
└── backend/        Python API-ийн код, Postgres migration (postgres/), тест
```

## Өнгө

Сайтын UI бараан биш — Хужиртын логоны өнгө: улаан `#c8202a` (бичиг), хар хөх `#0e2f52` (буга), тэнгэрийн цэнхэр `#2f8fd1`, ногоон `#3ea535` (навч), цасан цагаан. 3D тайз нь нар жаргах үеийн алтлаг гэрэлтэй; буга нь ус, шил шиг тунгалаг (`MeshPhysicalMaterial` transmission, IOR 1.45, dispersion, ирмэгийн гэрэл).

## Локал дээр ажиллуулах

```bash
npm install
npm run dev            # http://localhost:3000 → /mn
npm run build && npm start
```

Бааз холбоогүй үед ч сайт бүрэн ажиллана: бүтээгдэхүүн, тоонууд `lib/content.ts`-ээс уншигдана. Холбоо барих маягт бааз холбосны дараа ажиллана.

Python API-г локал дээр: `CLOUDFLARE_API_TOKEN=… python3 backend/dev_server.py`, дараа нь `.env.local`-д
`KHUJIRT_API_DEV_URL=http://127.0.0.1:8000` гэж бичвэл `npm run dev` дээр `/api/*` түүн рүү очно.

## Vercel дээр байршуулах

Тохиргоо шаардлагагүй: [vercel.com/new](https://vercel.com/new) → **Khujirt** repo → **Import** → **Deploy**.
Төслийн нэр `khujirt` тул хаяг нь **khujirt.vercel.app** болно. `main` руу push хийх бүрт автоматаар шинэчлэгдэнэ.

## Python API + Cloudflare D1 бааз

Python API нь сайттай нэг Vercel төсөлд ажиллана: `/api/products`, `/api/facts`, `/api/contact`, `/api/health`.
Өгөгдөл нь Cloudflare D1 дээрх `khujirt-db`-д (6 бүтээгдэхүүн, 3 тоон баримт, ирсэн зурвасууд); функц түүнд D1 HTTP API-аар хандана.

Нэг удаа:
1. Cloudflare → My Profile → **API Tokens** → **Create Token** → **Custom token** → Permissions: **Account · D1 · Edit** → Create.
2. Vercel → **khujirt** → Settings → **Environment Variables** → `CLOUDFLARE_API_TOKEN` = тэр token (Production, Preview) → Save → **Redeploy**.

Шалгах: `https://khujirt.vercel.app/api/health` → `"database": "ok", "engine": "d1", "products": 6`.
Cloudflare account (`edac0cf0…`) болон `khujirt-db`-ийн ID кодонд бичигдсэн; өөр бол `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`.

Хүсвэл (`.env.example`): `IP_HASH_SALT`, `KHUJIRT_API_URL` — өөр API, `NEXT_PUBLIC_SITE_URL` — өөр домэйн (ж: `https://khujirt.mn`).

Дэлгэрэнгүй: [backend/README.md](backend/README.md).

## Админ хэсэг

**https://khujirt.vercel.app/admin** — нэвтрэх нэр `admin`, анхны нууц үг `admin123` (нэвтэрсний дараа «Нууц үг» хэсэгт солино уу).
Ирсэн зурвасыг харж төлөв тэмдэглэх, бүтээгдэхүүний нэр/тайлбар/хэмжээ/дараалал/харагдах эсэх, тоон баримтыг засна;
хадгалахад сайт шууд шинэчлэгдэнэ. Нууц үг PBKDF2 hash-аар, сесс HttpOnly cookie-гоор (12 цаг) хадгалагдана;
5 удаа буруу оролдвол тухайн IP 15 минут хүлээнэ. Шинэ админ эсвэл нууц үг сэргээх: `python3 backend/admin_user.py <нэр>`.

## Агуулга засах

- Текст (MN/EN): `lib/i18n.ts`
- Бүтээгдэхүүн: D1 `products` хүснэгт (сайт 10 минут тутамд шинэчилнэ) — нөөц хувилбар `lib/content.ts`
- Тоон баримт: D1 `facts` хүснэгт (`since`, `mineral_count`, `additives`)
- Ирсэн зурвас: D1 `contact_messages` хүснэгт (Cloudflare → Storage & Databases → D1 → `khujirt-db` → Console)
- 3D түүхийн камер, манан, уур, долгион: `components/three/story.ts` → `STATES`
- 3D сав: бүтээгдэхүүн бүрийн жинхэнэ зургаас хэлбэр (тойм), таг, етикетийг автоматаар гаргаж 3D-д ороодог
  (`components/three/bottleShape.ts`). Шилэн савны зураг `public/bottles/`-д, хуванцар савных gem.mn-ээс.
  Шилэн сав дээр «KHUJIRT» товгор бичиг, хийтэй усанд бөмбөлөг.
- Хөл хэсгийн уриа: `lib/i18n.ts` → `footer.manifesto`; брэндийн бичлэг: `public/media/khujirt-amlalt.mp4` (дуугүй, зөвхөн дэлгэцэнд харагдах үед тоглоно, постер `khujirt-amlalt.webp`)

Бүтээгдэхүүний зураг, мэдээллийг [gem.mn](https://www.gem.mn/mn/brands/khujirt-gem)-ийн Хужирт хуудаснаас авсан.

## Гүйцэтгэл ба хүртээмж

- 3D тайз хуудасны агуулгын дараа тусдаа ачаалагдана (`next/dynamic`, SSR-гүй); текст, SEO агуулга шууд HTML-ээр ирнэ.
- Бугын загвар ~12 MB → 221 KB (бүтэц хассан, meshopt + quantization).
- `PerformanceMonitor` удаан төхөөрөмж дээр нягтралыг бууруулна; утсан дээр цэг, тусгалын нягтрал бага.
- `prefers-reduced-motion` үед гүйлгэлтийн хөдөлгөөн, Lenis унтарна.
- Фонт өөр дээрээ (Unbounded, Onest, Cormorant — кирилл үсэгтэй).

## Лиценз ба зохиогч

Бугын 3D хэлбэр: [“Realistic Deer 3D Model 2.0”](https://sketchfab.com/3d-models/realistic-deer-3d-model-20-demo-free-download-30bd8d8458c54b0cb2d66cc12471f1d0) — [WildMesh 3D](https://sketchfab.com/WildMesh_3D), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Цэгэн болон усан хэлбэрт хувиргасан. Лицензийн дагуу сайтын хөл хэсэгт байгаа зохиогчийн тэмдэглэлийг хадгална уу.

Хужирт нэр, лого нь эзэмшигчийнх.
