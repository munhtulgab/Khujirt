import type { Dictionary, Locale } from "@/lib/i18n";
import ContactForm from "./ContactForm";

export default function Contact({ t, lang }: { t: Dictionary["contact"]; lang: Locale }) {
  return (
    <section id="contact" data-story="contact" aria-labelledby="contact-title" className="relative px-[max(14px,6vw)] pb-[16vh] pt-[16vh]">
      <div data-reveal className="glass w-full max-w-[640px] rounded-[32px] p-6 sm:p-10 lg:max-w-[min(640px,46vw)]">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 id="contact-title" className="mt-5 font-display text-[clamp(30px,3.6vw,54px)] font-medium leading-[1.06] tracking-[-0.02em]">
          {t.titleA}
          <span className="display-accent text-[1.16em]">{t.titleB}</span>
        </h2>
        <p className="mt-5 max-w-[44ch] text-[16.5px] leading-relaxed text-ink-soft">{t.lead}</p>
        <ContactForm t={t} lang={lang} />
      </div>
    </section>
  );
}
