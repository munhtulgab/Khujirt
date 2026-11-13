import type { StoryKey } from "@/components/three/story";
import type { Dictionary } from "@/lib/i18n";
import FullLegend from "./FullLegend";
import PeakCards from "./PeakCards";

/** Scene state each chapter of the legend moves the 3D story to (see components/three/story.ts). */
const CHAPTERS: StoryKey[] = ["dawn", "deer", "evening", "springs", "legacy", "today"];

export default function Legend({ t }: { t: Dictionary["legend"] }) {
  const total = String(t.steps.length).padStart(2, "0");
  return (
    <section id="legend" aria-labelledby="legend-title" className="relative">
      <header className="px-[max(20px,6vw)] pb-[6vh] pt-[18vh]">
        <div data-reveal className="veil max-w-[620px]">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="legend-title" className="mt-5 font-display text-[clamp(30px,4.2vw,62px)] font-medium leading-[1.06] tracking-[-0.02em]">
            {t.titleA}
            <span className="display-accent text-[1.16em]">{t.titleB}</span>
          </h2>
          <p className="mt-5 max-w-[40ch] text-[17px] leading-relaxed text-ink-soft">{t.lead}</p>
        </div>
      </header>

      <ol className="m-0 list-none p-0">
        {t.steps.map((step, i) => (
          <li
            key={step.title}
            data-story={CHAPTERS[i]}
            className={`flex min-h-[100svh] items-end px-[max(14px,6vw)] pb-[max(24px,5vh)] lg:justify-end ${i === 0 ? "lg:pb-[7vh]" : "lg:items-center lg:pb-0"}`}
          >
            <article data-reveal className="glass w-full max-w-[540px] rounded-[30px] p-6 sm:p-9">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-[46px] italic leading-none text-sky">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[12px] font-semibold tracking-[0.18em] text-ink-soft">/ {total}</span>
              </div>
              <h3 className="mt-4 font-display text-[clamp(21px,2.1vw,30px)] font-medium leading-tight">{step.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-soft sm:text-[16.5px]">{step.text}</p>
              <blockquote className="mt-5 border-l-2 border-sky/50 pl-4 font-serif text-[18.5px] italic leading-snug text-navy/85 sm:text-[20px]">
                «{step.quote}»
              </blockquote>
              {i === 0 && <PeakCards peaks={t.peaks} />}
              {i === t.steps.length - 1 && (
                <a href="#facts" className="btn btn-glass mt-7">
                  {t.more}
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                </a>
              )}
            </article>
          </li>
        ))}
      </ol>

      <FullLegend t={t.full} />
    </section>
  );
}
