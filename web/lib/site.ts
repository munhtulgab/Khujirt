/** Public URL: NEXT_PUBLIC_SITE_URL, else the Vercel production domain, else the default. */
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://khujirt.vercel.app").replace(/\/$/, "");

export const BRAND = {
  name: "Khujirt",
  nameMn: "Хужирт",
  logo: "/brand/khujirt-logo.webp",
  shop: "https://www.gem.mn/mn/brands/khujirt-gem",
  coordinates: "≈ 46°54′ N · 102°46′ E",
} as const;

/** Colours taken from the Khujirt logo. */
export const COLORS = {
  red: "#c8202a",
  navy: "#0e2f52",
  navy2: "#1d4e7a",
  sky: "#2f8fd1",
  skyLight: "#cfe8f8",
  ice: "#f2f9fe",
  leaf: "#3ea535",
} as const;
