# Propozycje reklam marketing.on

Trzy warianty kreacji reklamowych (Instagram/Facebook) w dwóch formatach:
Story 1080×1920 oraz post do feedu 1080×1350.

| Wariant | Plik | Styl |
|---|---|---|
| 1. Jasny premium | `v1-jasny-premium.html` | jasne tło, duża typografia, mockup strony, chipy z gratisami |
| 2. Oferta cenowa | `v2-oferta-cenowa.html` | ciemne tło, cena „od 980 zł" na froncie, checklist gratisów |
| 3. Z pazurem | `v3-z-pazurem.html` | rozmowa z „typową agencją", puenta ofertowa |

## Branding (propozycja robocza)

- Logotyp tekstowy: `marketing` + plakietka-przełącznik `on` (motyw „włączamy Twój marketing")
- Kolory: granat `#0A0E1A`, krem `#F6F4EF`, limonka `#C8F031`
- Typografia: Space Grotesk (nagłówki) + Inter (tekst), subset latin + latin-ext

## Render podglądów

```
./render.sh
```

Wynikowe PNG trafiają do `previews/`. Skrypt używa preinstalowanego
Chromium headless-shell; wersję feed generuje podmieniając klasę `body`
ze `story` na `feed`.
