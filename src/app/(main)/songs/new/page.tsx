import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/Forbidden";
import { SongEditor } from "@/components/SongEditor";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.editor.titleNew };
}

/** Нова пісня. Лише Editor. */
export default async function NewSongPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) redirect("/sign-in");
  if (!can(user.actor, "song:write")) return <Forbidden t={t} />;

  return (
    <SongEditor
      initial={{ title: "", artist: "", language: "uk", originalKey: "C", body: "" }}
      t={t}
    />
  );
}
