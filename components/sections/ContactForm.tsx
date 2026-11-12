"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

/** The Python API on the same site (api/index.py) stores the message in Postgres. */
const CONTACT_URL = "/api/contact";

type Status = "idle" | "sending" | "sent" | "error" | "rateLimited" | "notConfigured" | "invalid";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+\d][\d\s()-]{5,30}$/;

export default function ContactForm({ t, lang }: { t: Dictionary["contact"]; lang: Locale }) {
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<string[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const payload = {
      name: value("name"),
      email: value("email"),
      phone: value("phone"),
      message: value("message"),
      company: value("company"), // honeypot, must stay empty
      locale: lang,
    };

    const bad: string[] = [];
    if (!payload.name) bad.push("name");
    if (payload.email && !EMAIL.test(payload.email)) bad.push("email");
    if (payload.phone && !PHONE.test(payload.phone)) bad.push("phone");
    if (!payload.email && !payload.phone) bad.push("email", "phone");
    if (payload.message.length < 5) bad.push("message");
    setInvalid(bad);
    if (bad.length) {
      setStatus("invalid");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(CONTACT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        form.reset();
        setStatus("sent");
        return;
      }
      setStatus(res.status === 429 ? "rateLimited" : res.status === 503 ? "notConfigured" : res.status === 400 ? "invalid" : "error");
    } catch {
      setStatus("error");
    }
  }

  const messages: Partial<Record<Status, string>> = {
    sent: t.sent,
    error: t.error,
    rateLimited: t.rateLimited,
    notConfigured: t.notConfigured,
    invalid: t.invalid,
  };
  const note = messages[status];
  const isBad = (name: string) => (invalid.includes(name) ? true : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="relative mt-9 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 sm:col-span-2">
        <span className="text-[13.5px] font-medium text-navy">{t.name}</span>
        <input className="field" name="name" autoComplete="name" required maxLength={120} aria-invalid={isBad("name")} />
      </label>
      <label className="grid gap-2">
        <span className="text-[13.5px] font-medium text-navy">{t.email}</span>
        <input className="field" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={isBad("email")} />
      </label>
      <label className="grid gap-2">
        <span className="text-[13.5px] font-medium text-navy">
          {t.phone} <span className="font-normal text-ink-soft">({t.optional})</span>
        </span>
        <input className="field" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} aria-invalid={isBad("phone")} />
      </label>
      <label className="grid gap-2 sm:col-span-2">
        <span className="text-[13.5px] font-medium text-navy">{t.message}</span>
        <textarea className="field min-h-[140px] resize-y" name="message" required maxLength={4000} rows={5} aria-invalid={isBad("message")} />
      </label>

      {/* honeypot for bots: hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:col-span-2">
        <button type="submit" className="btn btn-red disabled:cursor-wait disabled:opacity-70" disabled={status === "sending"}>
          {status === "sending" ? t.sending : t.send}
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <p className="max-w-[34ch] text-[13px] leading-snug text-ink-soft">{t.privacy}</p>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`min-h-6 text-[14.5px] font-medium sm:col-span-2 ${status === "sent" ? "text-[#2b7a24]" : "text-red-deep"}`}
      >
        {note}
      </p>
    </form>
  );
}
