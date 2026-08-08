import { NextResponse, type NextRequest } from "next/server";

import { USER_ID_COOKIE_NAME } from "@/lib/cookie";

const USER_ID_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function middleware(request: NextRequest) {
  if (request.cookies.has(USER_ID_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(USER_ID_COOKIE_NAME, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: USER_ID_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
