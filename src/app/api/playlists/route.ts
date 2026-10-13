import { NextResponse } from "next/server";
import { cleanPlaylistName, parseRoleFilter } from "@/entities/playlist";
import { requireMember } from "@/server/auth/api";
import { badRequest, forbidden } from "@/server/auth/guard";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/playlists?role={roleId|none}: мої плейлисти; без параметра віддає всі. */
export async function GET(request: Request) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const filter = parseRoleFilter(new URL(request.url).searchParams.get("role"));
  const playlists = await prisma.playlist.findMany({
    where: {
      userId: auth.user.id,
      ...(filter.kind === "none" ? { musicRoleId: null } : {}),
      ...(filter.kind === "role" ? { musicRoleId: filter.roleId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      musicRoleId: true,
      _count: { select: { copies: true } },
    },
  });

  return NextResponse.json({
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      musicRoleId: p.musicRoleId,
      songCount: p._count.copies,
    })),
  });
}

/** POST /api/playlists {name, musicRoleId|null}: створити плейлист у моїй ролі або «без ролі». */
export async function POST(request: Request) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    musicRoleId?: unknown;
  } | null;

  const name = cleanPlaylistName(body?.name);
  if (!name) return badRequest("invalid_name");

  const roleId = body?.musicRoleId ?? null;
  if (roleId !== null && typeof roleId !== "string") return badRequest("invalid_role");

  if (roleId !== null) {
    // Плейлист можна створити лише в музичній ролі, яку користувач має
    const owned = await prisma.userRole.findFirst({
      where: { userId: auth.user.id, roleId, role: { kind: "music" } },
      select: { roleId: true },
    });
    if (!owned) return forbidden();
  }

  const playlist = await prisma.playlist.create({
    data: { userId: auth.user.id, musicRoleId: roleId, name },
    select: { id: true, name: true, musicRoleId: true },
  });
  return NextResponse.json({ playlist }, { status: 201 });
}
