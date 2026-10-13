import { NextResponse } from "next/server";
import { requireMember } from "@/server/auth/api";
import { notFound } from "@/server/auth/guard";
import { prisma } from "@/server/db";
import { getOwnedCopy } from "@/server/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** POST /api/copies/{id}/keep: «залишити як власну»: копія стає самостійною піснею без зв'язку з базою. */
export async function POST(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound("copy");

  await prisma.songCopy.update({
    where: { id },
    data: { isStandalone: true, sourceSongId: null, syncedVersion: null },
  });
  return NextResponse.json({ ok: true });
}
