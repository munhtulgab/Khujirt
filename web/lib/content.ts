import type { Locale } from "./i18n";

/**
 * Built-in content. The live site reads the same records from the Python API (Cloudflare D1);
 * this copy is used when KHUJIRT_API_URL is not set or the API is unreachable.
 * Product details and photos come from the Khujirt pages on gem.mn (GEM International).
 */

export type ProductCategory = "still" | "sparkling" | "iodine" | "flavoured";
export type Packaging = "pet" | "glass";

export interface ProductRecord {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  category: ProductCategory;
  packaging: Packaging;
  volumes: string[];
  image: string;
  shopUrl: string;
}

export interface Product {
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  packaging: Packaging;
  volumes: string[];
  image: string;
  shopUrl: string;
}

const CDN = "https://cdnp.cody.mn/spree/images";
const SHOP = "https://www.gem.mn/mn/products";

export const PRODUCTS: ProductRecord[] = [
  {
    slug: "khujirt",
    name: { mn: "Хужирт ус", en: "Khujirt Natural Mineral Water" },
    description: {
      mn: "Монгол орны цэвэр, байгалийн эрдэст ус.",
      en: "Pure natural mineral water from Mongolia.",
    },
    category: "still",
    packaging: "pet",
    volumes: [],
    image: `${CDN}/2844882/large/Khujirt_pet__0.860.png`,
    shopUrl: `${SHOP}/khujirt`,
  },
  {
    slug: "khujirt-bombolog",
    name: { mn: "Хужирт хийжүүлсэн ус", en: "Khujirt Sparkling" },
    description: {
      mn: "Амны цангааг төгс тайлах хийжүүлсэн байгалийн эрдэст ус.",
      en: "Sparkling natural mineral water that perfectly quenches thirst.",
    },
    category: "sparkling",
    packaging: "pet",
    volumes: ["330 мл", "500 мл", "1.5 л"],
    image: `${CDN}/2844877/large/Khujirt_pet_Bumbulugtei_0.3.png`,
    shopUrl: `${SHOP}/khujirt-bombolog`,
  },
  {
    slug: "khujirt-yoda",
    name: { mn: "Хужирт Йода+", en: "Khujirt Iodine+" },
    description: {
      mn: "Европын “Супер Йодис” технологиор биоидэвхт иодоор баяжуулсан байгалийн эрдэст ус.",
      en: "Natural mineral water enriched with bioactive iodine using the European “Super Iodis” technology.",
    },
    category: "iodine",
    packaging: "pet",
    volumes: ["500 мл", "860 мл"],
    image: `${CDN}/3614445/large/khujirt_ioda_0.5.png`,
    shopUrl: `${SHOP}/khujirt-yoda`,
  },
  {
    slug: "khujirt-tsangis",
    name: { mn: "Хужирт цангис амт", en: "Khujirt Cranberry" },
    description: {
      mn: "Цангисын зөөлөн, тааламжтай амт, үнэртэй хийжүүлсэн эрдэст ус. Тогтворжуулагч, будаг агуулаагүй.",
      en: "Sparkling mineral water with a soft cranberry taste and aroma. No stabilisers or colourings.",
    },
    category: "flavoured",
    packaging: "glass",
    volumes: ["330 мл", "700 мл"],
    image: `${CDN}/2844818/large/Khujirt_glass_Natural_0.7.png`,
    shopUrl: `${SHOP}/khujirt-tsangis`,
  },
  {
    slug: "khujirt-shil",
    name: { mn: "Хужирт ус, шилэн сав", en: "Khujirt in Glass" },
    description: {
      mn: "Эх булгаас нь шууд, агаар нэвтрэхгүй шилэн саванд савладаг тул усны бүтэц, чанар, амт хэвээр хадгалагдана.",
      en: "Filled straight from the spring into airtight glass, so the water keeps its structure, quality and taste.",
    },
    category: "still",
    packaging: "glass",
    volumes: [],
    image: `${CDN}/3431083/large/Khujirt_glass_Natural_0.7.png`,
    shopUrl: `${SHOP}/khujirt-shil`,
  },
  {
    slug: "khuijrt-sparkling",
    name: { mn: "Хужирт бөмбөлөгтэй, шилэн сав", en: "Khujirt Sparkling in Glass" },
    description: {
      mn: "Байгалийн хийтэй, шилэн саванд савласан эрдэст ус.",
      en: "Naturally sparkling mineral water in glass.",
    },
    category: "sparkling",
    packaging: "glass",
    volumes: ["330 мл", "500 мл", "1.5 л"],
    image: `${CDN}/3431080/large/Khujirt_glass_Bumbulugtei_0.7.png`,
    shopUrl: `${SHOP}/khuijrt-sparkling`,
  },
];

export const MINERALS = ["Ca", "Mg", "Na", "Fe", "F"] as const;
export type MineralSymbol = (typeof MINERALS)[number];

export interface Facts {
  since: number;
  mineralCount: number;
  additives: number;
}

export const FACTS: Facts = { since: 2013, mineralCount: MINERALS.length, additives: 0 };

export function localizeProduct(record: ProductRecord, locale: Locale): Product {
  return {
    slug: record.slug,
    name: record.name[locale],
    description: record.description[locale],
    category: record.category,
    packaging: record.packaging,
    volumes: record.volumes,
    image: record.image,
    shopUrl: record.shopUrl,
  };
}
