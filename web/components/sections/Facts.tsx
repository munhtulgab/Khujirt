import { MINERALS, type Facts as FactsData } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n";

export default function Facts({ t, facts }: { t: Dictionary["facts"]; facts: FactsData }) {
  const stats: { label: string; value: string; count?: number }[] = [
    { label: t.since, value: String(facts.since), count: facts.since },
    { label: t.minerals, value: String(facts.mineralCount), count: facts.mineralCount },
    { label: t.additives, value: String(facts.additives), count: facts.additives },
    { label: t.lab, value: t.labValue },
  ];

  return (
    <section id="facts" data-story="facts" aria-labelledby="facts-title" className="relative px-[max(14px,6vw)] py-[18vh]">
      <div data-reveal className="mx-auto max-w-[780px] text-center">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 id="facts-title" className="mt-5 font-display text-[clamp(30px,4.2vw,62px)] font-medium leading-[1.06] tracking-[-0.02em]">
          {t.titleA}
          <span className="display-accent text-[1.16em]">{t.titleB}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">{t.lead}</p>
      </div>

      <dl className="mx-auto mt-[8vh] grid max-w-[1200px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} data-reveal className="glass flex min-h-[200px] flex-col justify-between rounded-[28px] p-7">
            <dt className="order-2 mt-8 max-w-[26ch] text-[15px] leading-snug text-ink-soft">{s.label}</dt>
            <dd className="order-1 m-0 font-display font-medium leading-none tracking-[-0.03em] text-navy">
              {s.count !== undefined ? (
                <span data-count={s.count} className="text-[clamp(48px,5vw,76px)] tabular-nums">
                  {s.value}
                </span>
              ) : (
                <span className="text-[clamp(32px,3vw,46px)]">{s.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div data-reveal className="mx-auto mt-[12vh] max-w-[1200px]">
        <h3 className="text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/70">{t.mineralsTitle}</h3>
        <ul className="mt-9 flex flex-wrap justify-center gap-3 sm:gap-6">
          {MINERALS.map((m, i) => (
            <li
              key={m}
              className="mineral-bubble grid size-[clamp(92px,11vw,148px)] place-items-center rounded-full"
              style={{ animationDelay: `${i * -1.25}s` }}
            >
              <span className="text-center">
                <span className="block font-display text-[clamp(26px,2.8vw,42px)] font-medium leading-none text-navy">{m}</span>
                <span className="mt-2 block text-[12px] font-medium text-ink-soft sm:text-[13px]">{t.mineralNames[m]}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-[13px] text-ink-soft">{t.source}</p>
      </div>
    </section>
  );
}
