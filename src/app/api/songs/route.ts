import { NextResponse } from "next/server";
import { parseSongInput } from "@/entities/song";
import { requireEditor } from "@/server/auth/api";
import { badRequest } from "@/server/auth/guard";
import { prisma } from "@/server/db";
import { catalogWhere } from "@/server/songs";

export const dynamic = "force-dynamic";

/** GET /api/songs?q= : публічний список і пошук пісень (без видалених). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const songs = await prisma.song.findMany({
    where: catalogWhere(q),
    orderBy: { title: "asc" },
    select: { id: true, title: true, artist: true, language: true, originalKey: true },
  });

  return NextResponse.json({ songs });
}

/** POST /api/songs: додати пісню (Editor). */
export async function POST(request: Request) {
  const auth = await requireEditor();
  if ("response" in auth) return auth.response;

  const parsed = parseSongInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const song = await prisma.song.create({
    data: { ...parsed.data, createdById: auth.user.id, updatedById: auth.user.id },
    select: { id: true },
  });
  return NextResponse.json({ song }, { status: 201 });
}
