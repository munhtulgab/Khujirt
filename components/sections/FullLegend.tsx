"use client";

import type { Dictionary } from "@/lib/i18n";

/**
 * The whole legend of old Shunkhlai, to read at leisure. Closed by default; opening it changes the
 * page height, so the scroll-driven 3D story is told to measure again.
 */
export default function FullLegend({ t }: { t: Dictionary["legend"]["full"] }) {
  return (
    <div className="px-[max(14px,6vw)] pb-[16vh] pt-[4vh]">
      <details
        className="group glass mx-auto max-w-[920px] rounded-[30px] p-6 sm:p-10"
        onToggle={() => window.dispatchEvent(new Event("resize"))}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-display text-[clamp(20px,2vw,28px)] font-medium leading-tight text-navy">{t.title}</span>
            <span className="mt-1 block font-serif text-[17px] italic text-sky">{t.note}</span>
          </span>
          <span className="btn btn-glass">
            <span className="group-open:hidden">{t.open}</span>
            <span className="hidden group-open:inline">{t.close}</span>
            <svg
              viewBox="0 0 24 24"
              className="size-4 transition-transform duration-300 group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="legend-text mt-8 border-t border-navy/10 pt-8 lg:columns-2 lg:gap-12">
          {t.paragraphs.map((p, i) => (
            <p key={i} className="mb-5 break-inside-avoid-column text-[16.5px] leading-[1.75] text-navy/90 sm:text-[17px]">
              {p}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
