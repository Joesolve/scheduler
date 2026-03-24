import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = (req as any).nextauth?.token;

    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    const role = token.role as string;

    // Role-based routing enforcement
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/trainer") && role !== "trainer" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/trainer/:path*",
    "/viewer/:path*",
    "/api/events/:path*",
    "/api/settings/:path*",
    "/api/users/:path*",
    "/api/trainers/:path*",
    "/api/audit/:path*",
  ],
};
