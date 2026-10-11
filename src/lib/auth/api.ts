import type { NextResponse } from "next/server";
import { forbidden, unauthorized } from "./guard";
import { can } from "./permissions";
import { getCurrentUser, type CurrentUser } from "./session";

export type MemberResult = { user: CurrentUser } | { response: NextResponse };

/** Для маршрутів плейлистів і копій: потрібен авторизований користувач (Member є в усіх). */
export async function requireMember(): Promise<MemberResult> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (!can(user.actor, "playlist:manage")) return { response: forbidden() };
  return { user };
}

/** Для редагування каталогу: потрібна роль Editor (дія song:write). */
export async function requireEditor(): Promise<MemberResult> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (!can(user.actor, "song:write")) return { response: forbidden() };
  return { user };
}
