import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Лад", template: "%s · Лад" },
  description: "Пісні й акорди для музикантів",
};

export const viewport: Viewport = {
  themeColor: "#333333",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${unbounded.variable} ${onest.variable}`}>
      <body>{children}</body>
    </html>
  );
}
