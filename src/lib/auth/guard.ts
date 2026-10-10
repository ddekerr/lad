import { NextResponse } from "next/server";
import type { Denial } from "./permissions";

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export const forbidden = (reason?: Denial | "forbidden") =>
  NextResponse.json({ error: "forbidden", reason: reason ?? "forbidden" }, { status: 403 });

export const notFound = (what: string) =>
  NextResponse.json({ error: "not_found", what }, { status: 404 });

export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
