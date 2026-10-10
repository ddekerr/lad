import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  Dictionary,
  LOCALE_COOKIE,
  Locale,
  dictionaries,
  isLocale,
} from "./dictionaries";

/** Мова інтерфейсу з cookie; англійська за замовчуванням. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
