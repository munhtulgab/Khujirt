import Image from "next/image";
import type { Dictionary, Locale } from "@/lib/i18n";
import { BRAND } from "@/lib/site";

export default function Footer({ t, lang }: { t: Dictionary["footer"]; lang: Locale }) {
  return (
    <footer className="relative z-10 border-t border-white/70 bg-white/85 px-[max(20px,6vw)] pb-10 pt-[14vh] backdrop-blur-xl">
      <p data-reveal className="max-w-[22ch] font-serif text-[clamp(30px,4.2vw,60px)] italic leading-[1.08] text-navy">
        <span className="block font-display text-[1.4em] not-italic leading-none text-red">“</span>
        {t.manifesto}
      </p>
      <div className="mt-[10vh] grid gap-10 border-t border-navy/10 pt-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Image src={BRAND.logo} alt="Хужирт" width={150} height={93} className="h-auto w-[150px]" />
          <p className="mt-3 text-[15px] text-ink-soft">{t.tag}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4">{t.source}</h2>
          <p className="text-[15px] text-navy">{t.place}</p>
          <p className="mt-2 font-mono text-[13px] tracking-wide text-ink-soft">{BRAND.coordinates}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4">{t.shop}</h2>
          <a href={BRAND.shop} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-[15px] font-medium text-navy underline decoration-red/50 underline-offset-4 hover:decoration-red">
            {t.shopLink}
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
        </div>
      </div>
      <div className="mt-14 flex flex-wrap justify-between gap-x-8 gap-y-3 text-[12.5px] text-ink-soft">
        <span>{t.rights}</span>
        <span lang={lang}>
          {t.credit}:{" "}
          <a className="underline underline-offset-2" href="https://sketchfab.com/3d-models/realistic-deer-3d-model-20-demo-free-download-30bd8d8458c54b0cb2d66cc12471f1d0" target="_blank" rel="noopener">
            Realistic Deer 3D Model 2.0
          </a>
          ,{" "}
          <a className="underline underline-offset-2" href="https://sketchfab.com/WildMesh_3D" target="_blank" rel="noopener">
            WildMesh 3D
          </a>
          ,{" "}
          <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">
            CC BY 4.0
          </a>{" "}
          · {t.creditTail}
        </span>
      </div>
    </footer>
  );
}
