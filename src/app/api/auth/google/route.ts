import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, appUrl, googleConfig, isProduction } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/** GET /api/auth/google: початок входу через Google (код авторизації + перевірка state). */
export async function GET() {
  const config = googleConfig();
  if (!config) {
    return NextResponse.redirect(`${appUrl()}/sign-in?error=google_not_configured`);
  }

  const state = randomBytes(16).toString("base64url");
  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  return NextResponse.redirect(url);
}
