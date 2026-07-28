# Propozycje reklam elgreen

Cztery kreacje reklamowe (Instagram/Facebook/LinkedIn) w trzech formatach:
Story 9:16 (1080×1920), feed 4:5 (1080×1350) i feed 1:1 (1080×1080).

Główny motyw kampanii: **inwestor nie musi znać się na energetyce ani
chodzić po urzędach** — elgreen projektuje i buduje od koncepcji po odbiór
(energetyka / OZE / e-mobility). Przekaz wyłącznie pozytywny.

| Kreacja | Plik | Styl |
|---|---|---|
| 1A. Czat (narracja) | `el1a-czat.html` | jasne tło, rozmowa z elgreen: inwestor pyta o przyłącze → my bierzemy formalności |
| 1B. Oferta wprost | `el1b-oferta.html` | ciemne tło, „odpowiedź w 48 h" na froncie, checklist zakresu |
| 2. Proces | `el2-proces.html` | 3 kroki: rozmowa → projekt i formalności → budowa i serwis |
| 3. Typograficzna | `el3-typograficzna.html` | pełna zieleń, pattern-interrupt „Nie musisz się znać. My się znamy." |

## Branding (PLACEHOLDER — do podmiany!)

Sygnet (zaokrąglony kwadrat z piorunem, SVG inline) i logotyp `el` + `green`
to **robocza rekonstrukcja** — w plikach HTML oznaczona blokiem `.brand`.
Po otrzymaniu oryginalnego logo i sygnetu elgreen podmień blok `.brand`
w każdym pliku na `<img>` z właściwymi plikami i dopasuj paletę:

- zieleń jasna `#3BD46C` (na ciemnym tle) / `#35C563` (tła), zieleń głęboka `#1D9A48`
- ciemna zieleń-czerń `#0A1510`, jasne tło `#F1F6F0`
- typografia: Manrope (500/700/800), subset latin + latin-ext

Liczby na kreacjach (15+ lat, 3000+ projektów, odpowiedź w 48 h) pochodzą
z elgreen.pl — **potwierdź je przed emisją**.

## Render podglądów

```
./render.sh
```

Podglądy trafiają do `previews/`, finalne pliki kampanii (1× i 2×) do
`../reklamy/elg/`. Skrypt używa preinstalowanego Chromium headless-shell;
wersje feed/square generuje podmieniając klasę `body` ze `story`.

## Test A/B

- **Wersja A** — kreacja narracyjna: rozmowa na czacie (`el1a-czat.html`).
- **Wersja B** — oferta wprost: zakres + „48 h" (`el1b-oferta.html`).
