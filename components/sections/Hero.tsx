import type { Dictionary } from "@/lib/i18n";

export default function Hero({ t }: { t: Dictionary["hero"] }) {
  return (
    <section
      id="top"
      data-story="hero"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col px-[max(20px,6vw)] pb-32 pt-[calc(env(safe-area-inset-top)+118px)] md:justify-center md:pt-32"
    >
      {/* soft light behind the copy so it stays readable over the mountains */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_18%_32%,rgb(242_249_254/0.88),rgb(242_249_254/0)_70%)] md:bg-[radial-gradient(48%_70%_at_20%_50%,rgb(242_249_254/0.85),rgb(242_249_254/0)_72%)]"
      />

      <div className="relative max-w-[640px] md:max-w-[min(640px,50vw)]">
        <p className="eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-10 bg-sky" />
          {t.eyebrow}
        </p>
        <h1
          id="hero-title"
          className="mt-6 text-balance font-display text-[clamp(34px,4.9vw,78px)] font-medium leading-[1.04] tracking-[-0.025em] text-navy"
        >
          {t.titleA}
          <span className="display-accent mt-1 text-[1.2em] leading-[1]">{t.titleB}</span>
        </h1>
        <p className="mt-6 max-w-[42ch] text-[clamp(16px,1.2vw,19px)] leading-relaxed text-ink-soft">{t.sub}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#legend" className="btn btn-red">
            {t.cta}
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </a>
          <a href="#products" className="btn btn-glass">
            {t.cta2}
          </a>
        </div>
      </div>

      {/* describes the 3D scene for screen readers; the bottles stand where it used to be shown */}
      <p className="sr-only">{t.caption}</p>

      <a
        href="#legend"
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+28px)] left-[max(20px,6vw)] flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-navy/70"
      >
        <span aria-hidden="true" className="relative h-11 w-px overflow-hidden bg-navy/15">
          <span className="absolute inset-x-0 top-0 h-1/3 animate-[scroll-cue_2.2s_cubic-bezier(0.2,0.7,0.2,1)_infinite] bg-sky" />
        </span>
        {t.scroll}
      </a>
    </section>
  );
}
