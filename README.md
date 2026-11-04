# Хужирт — Байгалийн эрдэст ус

Хужирт брэндийн вэб сайт: усан дундаас бүрэлдэх тунгалаг цэнхэр буга, шилэн лонх, нуур, манан нөмөрсөн Шунхлай · Гуа · Шивээт уулс бүхий 3D түүх. Гүйлгэх тусам домог дөрвөн агшинд өрнөнө: шархадсан буга → гурван уулын дундах эх → эдгэрэл → өнөөдөр. Монгол / англи хэлтэй.

![Хужирт](public/og/og-mn.jpg)

## Бүтэц

Frontend нь repo-гийн үндсэн хавтсанд (Next.js 15 App Router, React 19, Tailwind CSS v4,
Three.js + React Three Fiber + drei, GSAP ScrollTrigger, Lenis), backend нь `backend/` хавтсанд
(Python Cloudflare Worker + D1, [backend/README.md](backend/README.md)).

```
khujirt/
├── app/
│   ├── [lang]/layout.tsx · page.tsx   /mn, /en хуудас, SEO metadata, JSON-LD
│   ├── api/contact/route.ts           маягт → Python API proxy
│   ├── sitemap.ts · robots.ts · manifest.ts · icon.svg · apple-icon.png
│   └── globals.css                    брэндийн өнгө (@theme), бүрэлдэхүүн
├── components/
│   ├── three/      3D тайз: Deer (тунгалаг усан буга), StagParticles (GPU цэгэн буга),
│   │               Bottle (шилэн лонх), Lake (тусгал + долгион), Mountains, Mist, Sky,
│   │               CameraRig, story.ts (гүйлгэлтийн төлөв)
│   ├── sections/   Hero, Legend, Facts, Products, Contact
│   ├── layout/     Header, Footer, SmoothScroll (Lenis)
│   └── StoryDriver.tsx                ScrollTrigger → 3D түүхийн timeline
├── lib/            i18n.ts (MN/EN текст), content.ts (бүтээгдэхүүн), api.ts, site.ts
├── public/         models/deer.glb (221 KB, meshopt), models/stag-points.bin,
│                   brand/khujirt-logo.webp, og/ (хуваалцах зураг)
└── backend/        Python API (Cloudflare Worker + D1)
```

## Өнгө

Бараан биш — Хужиртын логоны өнгө: улаан `#c8202a` (бичиг), хар хөх `#0e2f52` (буга), тэнгэрийн цэнхэр `#2f8fd1`, ногоон `#3ea535` (навч), цасан цагаан. Буга нь ус шиг тунгалаг цэнхэр (`MeshPhysicalMaterial` transmission, IOR 1.33).

## Локал дээр ажиллуулах

```bash
npm install
npm run dev            # http://localhost:3000 → /mn
npm run build && npm start
```

Backend-гүйгээр ч бүрэн ажиллана: бүтээгдэхүүн, тоонууд `lib/content.ts`-ээс уншигдана. Холбоо барих маягт API тохируулсны дараа ажиллана.

## Vercel дээр байршуулах

Тохиргоо шаардлагагүй: [vercel.com/new](https://vercel.com/new) → **Khujirt** repo → **Import** → **Deploy**.
Төслийн нэр `khujirt` тул хаяг нь **khujirt.vercel.app** болно. `main` руу push хийх бүрт автоматаар шинэчлэгдэнэ.

Python API-г холбосны дараа Vercel → Settings → Environment Variables (`.env.example`):

- `KHUJIRT_API_URL` — Python API хаяг, ж: `https://khujirt-api.<subdomain>.workers.dev`
- `KHUJIRT_API_PROXY_KEY` — Worker-ийн `API_PROXY_KEY` secret-тэй ижил
- `NEXT_PUBLIC_SITE_URL` — өөр домэйн ашиглах бол (ж: `https://khujirt.mn`)

## Cloudflare D1 + Python API

```bash
cd backend
npx wrangler d1 create khujirt          # database_id → wrangler.toml
npx wrangler d1 migrations apply khujirt --remote
npx wrangler secret put IP_HASH_SALT
npx wrangler secret put API_PROXY_KEY
npx wrangler deploy
```

Дэлгэрэнгүй: [backend/README.md](backend/README.md).

## Агуулга засах

- Текст (MN/EN): `lib/i18n.ts`
- Бүтээгдэхүүн: D1 `products` хүснэгт (сайт 10 минут тутамд шинэчилнэ) — нөөц хувилбар `lib/content.ts`
- Тоон баримт: D1 `facts` хүснэгт (`since`, `mineral_count`, `additives`)
- 3D түүхийн камер, манан, долгион: `components/three/story.ts` → `STATES`

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
