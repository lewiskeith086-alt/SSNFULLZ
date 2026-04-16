import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "./lib/session";

const PUBLIC_PATHS = ["/", "/login", "/register", "/pricing"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname.includes(".")) return NextResponse.next();
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || "CHANGE_ME"));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = { matcher: ["/dashboard/:path*"] };
