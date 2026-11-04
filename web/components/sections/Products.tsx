import Image from "next/image";
import type { Product, ProductCategory } from "@/lib/content";
import type { Dictionary, Locale } from "@/lib/i18n";

const CATEGORY_TONE: Record<ProductCategory, string> = {
  still: "bg-sky-100 text-[#1f6fa6]",
  sparkling: "bg-navy text-white",
  iodine: "bg-leaf-50 text-[#2b7a24]",
  flavoured: "bg-red/10 text-red-deep",
};

function formatVolume(volume: string, lang: Locale) {
  if (lang !== "en") return volume;
  return volume.replace(/\s*мл$/, " ml").replace(/\s*л$/, " L");
}

export default function Products({ t, products, lang }: { t: Dictionary["products"]; products: Product[]; lang: Locale }) {
  return (
    <section id="products" data-story="products" aria-labelledby="products-title" className="relative py-[16vh]">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 px-[max(20px,6vw)]">
        <div className="max-w-[640px]">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="products-title" className="mt-5 font-display text-[clamp(30px,4.2vw,62px)] font-medium leading-[1.06] tracking-[-0.02em]">
            {t.titleA}
            <span className="display-accent text-[1.16em]">{t.titleB}</span>
          </h2>
        </div>
        <p className="max-w-[36ch] text-[17px] leading-relaxed text-ink-soft">{t.lead}</p>
      </div>

      <ul className="mt-[7vh] flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[max(14px,6vw)] pb-6 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {products.map((p, i) => (
          <li key={p.slug} data-reveal className="w-[80vw] max-w-[380px] shrink-0 snap-center md:w-auto md:max-w-none">
            <article className="glass group flex h-full flex-col overflow-hidden rounded-[30px]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(75%_60%_at_50%_38%,#ffffff_0%,#e9f5fc_52%,#cfe8f8_100%)]">
                <div aria-hidden="true" className="absolute bottom-[8%] left-1/2 h-7 w-[46%] -translate-x-1/2 rounded-[50%] bg-navy/20 blur-[14px]" />
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 80vw"
                  priority={i < 2}
                  className="object-contain p-[9%] transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:-translate-y-2 group-hover:scale-[1.03]"
                />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${CATEGORY_TONE[p.category]}`}>{t.categories[p.category]}</span>
                  <span className="rounded-full bg-white/85 px-3 py-1 text-[12px] font-medium text-navy">{t.packaging[p.packaging]}</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-[19px] font-medium leading-snug">{p.name}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-soft">{p.description}</p>
                {p.volumes.length > 0 && (
                  <p className="mt-4 text-[13.5px] text-navy">
                    <span className="text-ink-soft">{t.volumes}: </span>
                    {p.volumes.map((v) => formatVolume(v, lang)).join(" · ")}
                  </p>
                )}
                <a
                  href={p.shopUrl}
                  target="_blank"
                  rel="noopener"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-[14.5px] font-semibold text-red underline decoration-red/30 underline-offset-4 transition-colors hover:decoration-red"
                >
                  {t.buy}
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </a>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
