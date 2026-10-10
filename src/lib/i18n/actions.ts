"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "./dictionaries";

/** Зберігає вибір мови в cookie (для гостя). Для користувача в профілі додамо на етапі 2. */
export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get("locale")?.toString();
  if (!isLocale(value)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
