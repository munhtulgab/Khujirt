"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STATES, story, type StoryKey } from "./three/story";

/**
 * Scrollytelling timeline. Every [data-story] section eases the shared 3D story state from the
 * previous chapter to its own (camera, mist, ripples, the stag rising or dissolving, the bottle).
 * Also runs the reveal-on-scroll and number counters.
 */
export default function StoryDriver() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const anchors = gsap.utils.toArray<HTMLElement>("[data-story]");
      anchors.forEach((el, i) => {
        if (i === 0) return;
        const from = STATES[anchors[i - 1].dataset.story as StoryKey];
        const to = STATES[el.dataset.story as StoryKey];
        if (!from || !to) return;
        gsap.fromTo(story, { ...from }, {
          ...to,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 30%", scrub: reduce ? true : 1.2 },
        });
      });

      if (!reduce) {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const to = Number(el.dataset.count);
        if (!Number.isFinite(to) || reduce) return;
        const counter = { v: to > 1000 ? to - 30 : 0 };
        // start from the low value if the counter is still below the fold
        if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = String(counter.v);
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            gsap.fromTo(counter, { v: counter.v }, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(counter.v)); } });
          },
        });
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => {});
    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return null;
}
