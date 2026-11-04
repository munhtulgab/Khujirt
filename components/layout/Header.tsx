"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

export default function Header({ lang, t }: { lang: Locale; t: Dictionary["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const links: [string, string][] = [
    ["#legend", t.legend],
    ["#facts", t.facts],
    ["#products", t.products],
    ["#contact", t.contact],
  ];

  const LangSwitch = ({ className = "" }: { className?: string }) => (
    <div className={`flex rounded-full border border-navy/15 bg-white/70 p-1 ${className}`} role="group" aria-label={t.language}>
      {locales.map((code) => (
        <Link
          key={code}
          href={`/${code}`}
          hrefLang={code}
          aria-current={code === lang ? "true" : undefined}
          className={`grid h-8 min-w-10 place-items-center rounded-full px-3 text-xs font-semibold tracking-[0.12em] uppercase transition-colors ${code === lang ? "bg-navy text-white" : "text-navy/70 hover:text-navy"}`}
        >
          {code}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-[max(14px,3vw)] pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className={`glass mx-auto flex h-[66px] max-w-[1320px] items-center gap-4 rounded-full pl-4 pr-2 transition-shadow ${scrolled ? "shadow-[0_18px_50px_-24px_rgba(14,47,82,0.45)]" : ""}`}>
        <Link href={`/${lang}`} aria-label={t.home} className="mr-auto shrink-0">
          <Image src="/brand/khujirt-logo.webp" alt="Хужирт" width={84} height={52} priority className="h-[46px] w-auto" />
        </Link>
        <nav aria-label={t.menu} className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 text-[15px] font-medium text-navy/80 transition-colors hover:bg-white hover:text-navy">
              {label}
            </a>
          ))}
        </nav>
        <LangSwitch className="hidden lg:flex" />
        <a href="#contact" className="btn btn-red hidden min-h-11 px-5 text-sm sm:inline-flex">
          {t.contact}
        </a>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full border border-navy/15 bg-white/80 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={t.menu}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-0 z-50 flex flex-col justify-center gap-2 bg-white/95 px-8 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={t.menu}>
          <button type="button" className="absolute right-6 top-[calc(env(safe-area-inset-top)+20px)] grid size-11 place-items-center rounded-full border border-navy/15" aria-label={t.close} onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {links.map(([href, label], i) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-2 font-display text-[clamp(26px,8vw,40px)] font-medium text-navy">
              <span className="font-serif text-xl italic text-sky">0{i + 1}</span>
              {label}
            </a>
          ))}
          <LangSwitch className="mt-6 self-start" />
        </div>
      )}
    </header>
  );
}
