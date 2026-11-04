"use client";

import dynamic from "next/dynamic";
import type { PeakId } from "@/lib/i18n";
import { peakLabelEls } from "./story";

// The WebGL scene is client-only and loaded after the page content.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function Experience({ peakLabels }: { peakLabels: Record<PeakId, string> }) {
  return (
    <div
      className="fixed inset-0 z-0"
      aria-hidden="true"
      style={{ background: "linear-gradient(180deg, #7cc0ec 0%, #eef8fe 55%, #d3ebf9 100%)" }}
    >
      <Scene />
      {/* mountain names, positioned every frame by <Mountains /> */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {(Object.keys(peakLabels) as PeakId[]).map((id) => (
          <div
            key={id}
            ref={(el) => {
              peakLabelEls[id] = el;
            }}
            className="peak-label absolute left-0 top-0"
          >
            {peakLabels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
