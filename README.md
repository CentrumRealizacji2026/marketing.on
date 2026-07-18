# Website Template Extractor

Wklej link do dowolnej strony → dostajesz **pakiet szablonu** (zrzuty układu +
opis stylu + szkielet HTML), który wklejasz do **Claude Code** jako wzór layoutu.
Na tej bazie budujesz **nową stronę o zupełnie innej tematyce**, zachowując „look"
i układ oryginału.

Narzędzie **kopiuje układ i styl, nie treść** — teksty i obrazy oryginału są
zamieniane na placeholdery.

## Jak to działa

```
node extract.mjs <URL>
```

Powstaje folder `output/<domena>/` z pakietem:

| Plik | Co zawiera | Do czego |
| --- | --- | --- |
| `desktop.png` | pełny zrzut strony (desktop) | **główny wzór układu** — wklej do Claude Code |
| `mobile.png` | pełny zrzut (mobile) | układ responsywny |
| `design-notes.md` | paleta kolorów, fonty, struktura sekcji, komponenty | opis stylu do odtworzenia |
| `skeleton.html` | struktura DOM + klasy CSS, treść = placeholdery | czysty szkielet layoutu |
| `raw.html` | surowy render | pomocniczo |

## Instalacja

```bash
npm install
```

> Środowisko ma już zainstalowany Chromium (Playwright). **Nie** uruchamiaj
> `playwright install`. Jeśli pracujesz lokalnie bez przeglądarki, wykonaj raz:
> `npx playwright install chromium`.

## Użycie krok po kroku

1. Znajdź stronę, której układ Ci się podoba (wzór).
2. Uruchom:
   ```bash
   node extract.mjs https://przyklad-strony.com
   ```
3. Otwórz **nową sesję Claude Code**, wrzuć `desktop.png` + `design-notes.md`
   (opcjonalnie `skeleton.html`) i napisz np.:

   > „Zbuduj stronę o **[moja tematyka — np. kancelaria prawna]** używając
   > **tego układu i stylu**. Zachowaj kolejność sekcji, paletę i typografię,
   > ale całą treść napisz pod moją branżę."

4. Claude Code odtworzy layout z obrazu + notatek i wypełni go Twoją treścią.

## Przykład

```bash
node extract.mjs https://stripe.com
# -> output/stripe.com/desktop.png, design-notes.md, skeleton.html, ...
```

## Alternatywy zewnętrzne (gdyby ktoś wolał gotowy SaaS)

- **v0.dev** (Vercel) — generuje UI z opisu/obrazu; wklejasz zrzut z tego narzędzia.
- **Builder.io „Visual Copilot" / HTML-to-Figma** — import layoutu z URL do Figmy/kodu.
- **Framer** — import i przebudowa układów.
- **HTTrack / „website downloader"** — pobiera cały statyczny HTML/CSS (ciężkie, kopiuje też treść).

To narzędzie celowo jest lekkie i „Claude-Code-first": daje dokładnie to, co
najlepiej wkleić do Claude Code — obraz układu + zwięzły opis stylu.

## Uwaga o prawach

Kopiuj **układ i styl** dla inspiracji własnego projektu — nie kopiuj cudzej
treści, logotypów ani chronionych zasobów. Szkielet celowo usuwa treść oryginału.
