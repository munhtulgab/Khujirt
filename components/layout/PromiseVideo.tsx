"use client";

import { useEffect, useRef } from "react";

/**
 * The Khujirt brand film, melting into the page. It plays only while it is on screen (the 3D scene
 * is busy enough) and stays on its poster for visitors who prefer reduced motion.
 */
export default function PromiseVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={`melt block aspect-video w-full object-cover ${className}`}
      src="/media/khujirt-amlalt.mp4"
      poster="/media/khujirt-amlalt.webp"
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    />
  );
}
