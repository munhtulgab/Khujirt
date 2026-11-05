// Server-side data access (used by server components only).
import { FACTS, PRODUCTS, localizeProduct, type Facts, type Product, type ProductCategory, type Packaging } from "./content";
import type { Locale } from "./i18n";

import endpoint from "./api-endpoint.json";

/** The API address: an env override, else the address the deploy workflow recorded. */
const API_URL = (process.env.KHUJIRT_API_URL || endpoint.url || "").replace(/\/$/, "");
const CATEGORIES: ProductCategory[] = ["still", "sparkling", "iodine", "flavoured"];
const PACKAGING: Packaging[] = ["pet", "glass"];

async function getJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.slug === "string" &&
    typeof p.name === "string" &&
    typeof p.description === "string" &&
    typeof p.image === "string" &&
    typeof p.shopUrl === "string" &&
    Array.isArray(p.volumes) &&
    CATEGORIES.includes(p.category as ProductCategory) &&
    PACKAGING.includes(p.packaging as Packaging)
  );
}

/** Products from the API (D1), falling back to the built-in list. */
export async function getProducts(locale: Locale): Promise<Product[]> {
  const data = await getJson<{ products?: unknown[] }>(`/api/products?lang=${locale}`);
  const list = data?.products?.filter(isProduct);
  if (list && list.length) return list;
  return PRODUCTS.map((p) => localizeProduct(p, locale));
}

/** Headline facts from the API, falling back to the built-in values. */
export async function getFacts(): Promise<Facts> {
  const data = await getJson<{ facts?: Partial<Facts> }>(`/api/facts`);
  const f = data?.facts;
  if (f && typeof f.since === "number" && typeof f.mineralCount === "number" && typeof f.additives === "number") {
    return { since: f.since, mineralCount: f.mineralCount, additives: f.additives };
  }
  return FACTS;
}
