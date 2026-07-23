# Propozycje reklam marketing.on

Trzy warianty kreacji reklamowych (Instagram/Facebook) w dwóch formatach:
Story 1080×1920 oraz post do feedu 1080×1350.

Główny motyw kampanii: **klient nie musi załatwiać zdjęć** — przyjeżdżamy
z sesją i nagrywkami, potem robimy stronę. Przekaz wyłącznie pozytywny
(pokazujemy, co MY dajemy — bez wytykania konkurencji).

| Wariant | Plik | Styl |
|---|---|---|
| 1. Jasny premium | `v1-jasny-premium.html` | jasne tło, duża typografia, mockup strony, chipy z gratisami |
| 2. Oferta cenowa | `v2-oferta-cenowa.html` | ciemne tło, cena „od 980 zł" na froncie, checklist gratisów |
| 4. Czat (główny) | `v4-rozmowa-z-nami.html` | rozmowa z marketing.on: klient nie ma zdjęć → my przyjeżdżamy |

`wybor-fontu.html` — plansza z 10 propozycjami fontów do wyboru.

## Branding (propozycja robocza)

- Logotyp tekstowy: `marketing` + plakietka-przełącznik `on` (motyw „włączamy Twój marketing")
- Kolory: granat `#0A0E1A`, krem `#F6F4EF`, limonka `#C8F031`
- Typografia: Plus Jakarta Sans (całość), subset latin + latin-ext

## Render podglądów

```
./render.sh
```

Wynikowe PNG trafiają do `previews/`. Skrypt używa preinstalowanego
Chromium headless-shell; wersję feed generuje podmieniając klasę `body`
ze `story` na `feed`.
