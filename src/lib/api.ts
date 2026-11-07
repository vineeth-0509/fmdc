import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SchemeInputError } from "@/server/schemes/engine";
import { getSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import type { Session } from "@/lib/auth/token";

export { AppError };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Blocks cross-site form posts: if the browser sent an Origin, it must match our host. */
function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "BAD_ORIGIN", "Request origin is not allowed.");
  }
  if (host && originHost !== host) {
    throw new AppError(403, "BAD_ORIGIN", "Request origin is not allowed.");
  }
}

/** Connection problems (for example a sleeping free-tier database), not mistakes in the request. */
function isDatabaseDown(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  return e instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1008", "P1017"].includes(e.code);
}

export async function route(req: Request, handler: () => Promise<Response>): Promise<Response> {
  try {
    assertSameOrigin(req);
    return await handler();
  } catch (e) {
    if (e instanceof AppError) return fail(e.status, e.code, e.message);
    if (e instanceof ZodError) {
      const first = e.issues[0];
      const where = first?.path.length ? `${first.path.join(".")}: ` : "";
      return fail(400, "INVALID_INPUT", `${where}${first?.message ?? "Invalid input."}`);
    }
    if (e instanceof SchemeInputError) return fail(400, "INVALID_INPUT", e.message);
    if (isDatabaseDown(e)) {
      console.error("Database unreachable:", e);
      return fail(503, "DB_UNAVAILABLE", "The database is waking up or unreachable. Wait a few seconds and try again.");
    }
    console.error("Unhandled API error:", e);
    return fail(500, "SERVER_ERROR", "Something went wrong on our side. Please try again.");
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "BAD_JSON", "The request body must be valid JSON.");
  }
}

/** API guard: returns the session or throws 401/403. */
export async function requireApi(role: "RETAILER" | "DESK"): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");
  if (session.role !== role) throw new AppError(403, "FORBIDDEN", "You do not have access to this.");
  if (role === "RETAILER" && !session.retailerId) {
    throw new AppError(403, "FORBIDDEN", "This account is not linked to a retailer.");
  }
  return session;
}
