import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/rejestracja"];

/**
 * Middleware robi tylko szybkie odsianie żądań bez ciasteczka sesji — działa na edge
 * i nie ma dostępu do bazy. Właściwa weryfikacja tokenu odbywa się w `requireUser()`
 * po stronie serwera, więc samo ciasteczko niczego nie otwiera.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("zycie_session")?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Wszystko poza zasobami statycznymi, ikonami PWA i endpointem crona
     * (ten chroni własny sekret, bo wywołuje go Vercel, a nie przeglądarka).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|api/cron/).*)",
  ],
};
