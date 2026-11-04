import { notFound } from "next/navigation";
import Experience from "@/components/three/Experience";
import StoryDriver from "@/components/StoryDriver";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Contact from "@/components/sections/Contact";
import Facts from "@/components/sections/Facts";
import Hero from "@/components/sections/Hero";
import Legend from "@/components/sections/Legend";
import Products from "@/components/sections/Products";
import { getFacts, getProducts } from "@/lib/api";
import { getDictionary, isLocale, type PeakId } from "@/lib/i18n";
import { BRAND, SITE_URL } from "@/lib/site";

// Products and facts come from the API (Cloudflare D1); refresh the static page every 10 minutes.
export const revalidate = 600;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [products, facts] = await Promise.all([getProducts(lang), getFacts()]);
  const peakLabels = Object.fromEntries(t.legend.peaks.map((p) => [p.id, p.name])) as Record<PeakId, string>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND.nameMn,
        alternateName: BRAND.name,
        url: SITE_URL,
        logo: `${SITE_URL}${BRAND.logo}`,
        sameAs: [BRAND.shop],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/${lang}`,
        name: t.meta.title,
        description: t.meta.description,
        inLanguage: lang,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-5 focus:py-3 focus:text-white"
      >
        {t.nav.skip}
      </a>
      <Experience peakLabels={peakLabels} />
      <Header lang={lang} t={t.nav} />
      <main id="main" className="relative z-10">
        <Hero t={t.hero} />
        <Legend t={t.legend} />
        <Facts t={t.facts} facts={facts} />
        <Products t={t.products} products={products} lang={lang} />
        <Contact t={t.contact} lang={lang} />
      </main>
      <Footer t={t.footer} lang={lang} />
      <StoryDriver />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
