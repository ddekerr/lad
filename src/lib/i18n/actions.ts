"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, isLocale } from "./dictionaries";

/**
 * Зберігає вибір мови: у cookie (для гостя й цього пристрою) і, якщо користувач
 * увійшов, у його профілі.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get("locale")?.toString();
  if (!isLocale(value)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const user = await getCurrentUser();
  if (user && user.language !== value) {
    await prisma.user.update({ where: { id: user.id }, data: { language: value } });
  }

  revalidatePath("/", "layout");
}
