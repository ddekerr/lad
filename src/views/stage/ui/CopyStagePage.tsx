import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StageClient } from "@/widgets/stage-mode";
import { neighbours } from "@/entities/song-copy";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getDictionary } from "@/server/i18n";
import { getOwnedCopy } from "@/server/playlists";

export const metadata: Metadata = { title: "Stage" };

type Props = { params: Promise<{ id: string }> };

/** Режим сцени для моєї копії; стрілки ведуть до сусідніх пісень плейлиста. Зсув беремо з копії. */
export default async function CopyStagePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const [copy, { t }] = await Promise.all([getOwnedCopy(user.id, id), getDictionary()]);
  if (!copy) notFound();

  const siblings = await prisma.songCopy.findMany({
    where: { playlistId: copy.playlistId },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });
  const current = siblings.find((c) => c.id === copy.id);
  const { prev, next } = current ? neighbours(siblings, current) : { prev: null, next: null };
  const link = (c: { id: string; title: string } | null) =>
    c ? { href: `/copies/${c.id}/stage`, title: c.title } : null;

  return (
    <StageClient
      key={copy.id}
      title={copy.title}
      originalKey={copy.originalKey}
      body={copy.body}
      initialShift={copy.keyShift}
      backHref={`/copies/${copy.id}`}
      prev={link(prev)}
      next={link(next)}
      t={t}
    />
  );
}
