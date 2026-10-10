import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { catalogWhere } from "@/lib/songs";

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
