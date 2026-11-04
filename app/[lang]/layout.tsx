import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/onest";
import "@fontsource-variable/cormorant";
import "@fontsource-variable/cormorant/wght-italic.css";
import "lenis/dist/lenis.css";
import "../globals.css";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Only /mn and /en exist; anything else is a 404.
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: "#e3f2fb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.title, template: `%s · ${lang === "mn" ? "Хужирт" : "Khujirt"}` },
    description: t.description,
    keywords: t.keywords,
    applicationName: "Khujirt",
    alternates: { canonical: `/${lang}`, languages: { mn: "/mn", en: "/en", "x-default": "/mn" } },
    openGraph: {
      type: "website",
      url: `/${lang}`,
      siteName: "Khujirt",
      title: t.title,
      description: t.description,
      locale: t.ogLocale,
      alternateLocale: lang === "mn" ? ["en_US"] : ["mn_MN"],
      images: [{ url: `/og/og-${lang}.jpg`, width: 1200, height: 630, alt: t.title }],
    },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: [`/og/og-${lang}.jpg`] },
    robots: { index: true, follow: true },
    category: "food & drink",
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
