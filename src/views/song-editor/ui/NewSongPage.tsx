import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SongEditor } from "@/widgets/song-editor";
import { can } from "@/entities/user";
import { getCurrentUser } from "@/server/auth/session";
import { getDictionary } from "@/server/i18n";
import { Forbidden } from "@/shared/ui";

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
