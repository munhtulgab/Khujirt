"use client";

import { useEffect } from "react";
import { hover } from "@/components/three/story";
import type { Dictionary } from "@/lib/i18n";

/** The three mountains of the legend. Pointing at one highlights its label in the 3D scene. */
export default function PeakCards({ peaks }: { peaks: Dictionary["legend"]["peaks"] }) {
  useEffect(() => () => {
    hover.peak = null;
  }, []);

  return (
    <ul className="mt-7 grid grid-cols-3 gap-2 sm:gap-2.5">
      {peaks.map((p) => (
        <li
          key={p.id}
          className="cursor-default rounded-2xl border border-navy/10 bg-white/70 p-3 transition-colors duration-300 hover:border-sky/50 hover:bg-white sm:p-4"
          onPointerEnter={() => {
            hover.peak = p.id;
          }}
          onPointerLeave={() => {
            hover.peak = null;
          }}
          onClick={() => {
            hover.peak = hover.peak === p.id ? null : p.id;
          }}
        >
          <span className="block font-display text-[14px] font-medium text-navy sm:text-[15px]">{p.name}</span>
          <span className="mt-1 block font-serif text-[14px] italic leading-snug text-sky sm:text-[15px]">{p.epithet}</span>
          <span className="mt-2 hidden text-[13px] leading-snug text-ink-soft sm:block">{p.text}</span>
        </li>
      ))}
    </ul>
  );
}
