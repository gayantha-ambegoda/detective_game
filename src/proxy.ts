import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Optimistic check from the cookie only; the dashboard re-verifies against the DB.
const protectedPrefixes = ["/dashboard"];
const authRoutes = ["/signin", "/signup"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthRoute = authRoutes.includes(path);

  if (!isProtected && !isAuthRoute) return NextResponse.next();

  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);

  if (isProtected && !session?.userId) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }
  if (isAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
