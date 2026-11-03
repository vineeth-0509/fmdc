import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const home = session?.role === "DESK" ? "/desk" : "/retailer";

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL(home, req.url)) : NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (pathname.startsWith("/desk") && session.role !== "DESK") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  if (pathname.startsWith("/retailer") && session.role !== "RETAILER") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/login", "/retailer/:path*", "/desk/:path*"] };
