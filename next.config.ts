import type { NextConfig } from "next";

/**
 * Nagłówki bezpieczeństwa. Kokpit stoi pod publicznym adresem i trzyma dane
 * o zdrowiu, więc każdy z nich zamyka konkretną drogę:
 *
 * — HSTS: przeglądarka nie spróbuje już połączenia bez szyfrowania,
 * — frame-ancestors: strony nie da się osadzić w cudzej ramce i nakłonić Cię
 *   do kliknięcia czegoś innego, niż widzisz (clickjacking),
 * — nosniff: przeglądarka nie zgaduje typu pliku wbrew temu, co podał serwer,
 * — Referrer-Policy: adres Twojego kokpitu nie wycieka do stron, na które
 *   przechodzisz z linków w treści,
 * — Permissions-Policy: aplikacja nie potrzebuje kamery, mikrofonu ani
 *   lokalizacji, więc odbieramy sobie do nich dostęp z góry,
 * — noindex: prywatny panel nie ma czego szukać w wynikach wyszukiwania.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Server actions receive the whole daily report in one payload.
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
