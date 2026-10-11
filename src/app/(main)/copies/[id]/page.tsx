import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CopyView } from "@/components/CopyView";
import { copyState } from "@/lib/copies";
import { getCurrentUser } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";
import { getOwnedCopy } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Лад · Copy" };

type Props = { params: Promise<{ id: string }> };

/** Моя копія пісні: перегляд, тональність, нотатки, правки, оновлення з оригіналу. */
export default async function CopyPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const [copy, { t }] = await Promise.all([getOwnedCopy(user.id, id), getDictionary()]);
  if (!copy) notFound();

  return (
    <CopyView
      key={`${copy.id}:${copy.state}:${copy.title}:${copy.body.length}`}
      copy={{
        id: copy.id,
        title: copy.title,
        artist: copy.artist,
        language: copy.language,
        originalKey: copy.originalKey,
        body: copy.body,
        keyShift: copy.keyShift,
        notes: copy.notes,
        state: copyState(copy),
      }}
      playlist={{ id: copy.playlist.id, name: copy.playlist.name }}
      t={t}
    />
  );
}
