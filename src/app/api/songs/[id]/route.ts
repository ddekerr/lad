import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** GET /api/songs/{id} : публічно, пісня з текстом і акордами. */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const song = await prisma.song.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      artist: true,
      language: true,
      originalKey: true,
      body: true,
      version: true,
    },
  });

  if (!song) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ song });
}
