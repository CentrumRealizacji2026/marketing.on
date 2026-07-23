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

## Paczka Meta Ads (`meta/`)

Kreacja główna w 3 formatach, każdy w 1× i 2× (ostrość na retinie):

| Umiejscowienie | Format | Pliki |
|---|---|---|
| Instagram/FB Stories, Reels | 9:16 | `marketingon-story-9x16-1080x1920.png`, `…-2160x3840.png` |
| Feed IG/FB (pionowy) | 4:5 | `marketingon-feed-4x5-1080x1350.png`, `…-2160x2700.png` |
| Feed IG/FB (kwadrat) | 1:1 | `marketingon-feed-1x1-1080x1080.png`, `…-2160x2160.png` |

Story respektuje strefy bezpieczne Meta (~250 px od góry, ~350 px od dołu);
format 4:5 zostawia dolne ~10% wolne. Kafelki foto/wideo w czacie to
placeholdery do podmiany na prawdziwe kadry z sesji.
