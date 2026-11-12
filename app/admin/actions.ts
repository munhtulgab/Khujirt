"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiBase } from "@/lib/api";

/**
 * After an edit in the admin area, rebuild the public pages now instead of waiting for the
 * 10-minute refresh. Only a signed-in admin may trigger it: the session cookie is checked with the API.
 */
export async function refreshSite(): Promise<boolean> {
  const session = (await cookies()).get("khujirt_admin")?.value;
  const base = apiBase();
  if (!session || !base) return false;
  try {
    const res = await fetch(`${base}/api/admin/me`, {
      headers: { cookie: `khujirt_admin=${session}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  revalidatePath("/mn");
  revalidatePath("/en");
  return true;
}
