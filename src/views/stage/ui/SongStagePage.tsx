import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StageClient } from "@/widgets/stage-mode";
import { prisma } from "@/server/db";
import { getDictionary } from "@/server/i18n";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shift?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const song = await prisma.song.findFirst({ where: { id, deletedAt: null } });
  return { title: song ? `${song.title} · Stage` : "Stage" };
}

/** Режим сцени для пісні з бази. Тональність передається з екрана пісні в query `shift`. */
export default async function SongStagePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { shift } = await searchParams;
  const [song, { t }] = await Promise.all([
    prisma.song.findFirst({ where: { id, deletedAt: null } }),
    getDictionary(),
  ]);
  if (!song) notFound();

  const parsed = Number.parseInt(shift ?? "0", 10);
  const initialShift = Number.isFinite(parsed) ? parsed : 0;

  return (
    <StageClient
      title={song.title}
      originalKey={song.originalKey}
      body={song.body}
      initialShift={initialShift}
      backHref={`/songs/${song.id}`}
      t={t}
    />
  );
}
