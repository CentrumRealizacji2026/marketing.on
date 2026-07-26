# Kokpit

Dashboard do zarządzania życiem: finanse, sprzedaż, zdrowie, zadania, trening, nauka i projekty
w jednym miejscu. Dane uzupełniasz jednym raportem dziennym, a warstwa AI działa jak mentor,
trener i kierownik projektów.

**Zasada przewodnia: w kodzie nie ma żadnych Twoich danych.** Leki, dyscypliny sportowe, dziedziny
nauki, cele i normy powstają z tego, co wpiszesz w kreatorze przy pierwszym logowaniu, i zmieniasz
je później w panelu zarządzania.

## Co jest w środku

| Obszar | Co robi |
|---|---|
| **Dashboard `/`** | Podsumowanie z każdej kategorii: stan środków, sprzedaż z konwersjami, leki i suplementy do odhaczenia, 3 priorytety i side questy, trening, blok nauki, nawodnienie z oceną, waga, rekordy, projekty, rekomendacje mentora. Do tego **plan na dziś** — jedna oś czasu złożona ze wszystkich kategorii — i **pasek tygodnia** z kategoriami w wierszach i dniami w kolumnach |
| **Kalendarz `/kalendarz`** | Siatka miesiąca z kropkami kategorii przy każdym dniu, tydzień wybranego dnia w układzie kategorie × dni i szczegóły dnia z podziałem na kategorie. Dni w przód pokazują plan, dni wstecz — plan i realizację |
| **Kreator `/start`** | 11 kroków konfiguracji. Leki, trening, rekordy, nauka i projekty to listy dynamiczne — „+ dodaj” dokłada wiersz, a nazwy dyscyplin i dziedzin wpisujesz własnymi słowami |
| **Panel `/ustawienia`** | Te same formularze bezterminowo. Wyłączenie pozycji zachowuje historię zamiast ją kasować |
| **Raport `/raport`** | Jeden formularz na cały dzień: finanse, sprzedaż i umowy, leki, waga i woda, zadania, trening z możliwością zgłoszenia rekordu, nauka oraz zdrowie psychiczne (samopoczucie, energia, stres, myśli, co dobrego się wydarzyło) |
| **Kategorie** | `/finanse`, `/sprzedaz`, `/zdrowie`, `/zadania`, `/trening`, `/nauka`, `/projekty` — szczegóły i historia |
| **Mentor `/mentor`** | Trzy tryby (mentor / trener / kierownik projektów). Analizuje agregaty z 7 i 30 dni i zwraca rekomendacje „obserwacja → działanie” ze statusami |
| **PWA** | Instalowalna na telefonie, ze skrótami do raportu, zadań i mentora |

Prawy pasek kategorii rozwija się na podkategorie, zwija do samych ikon, a na telefonie wysuwa się
jako panel z prawej strony.

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env          # uzupełnij DATABASE_URL
npm run db:migrate            # zakłada 21 tabel
npm run dev                   # http://localhost:3000
```

Pierwsze wejście na `/` przekieruje na `/login`. Pierwsze konto w pustej bazie założysz bez
ograniczeń — kolejne wymagają dopisania adresu do `ALLOWED_SIGNUP_EMAILS`.

## Zmienne środowiskowe

| Zmienna | Wymagana | Do czego |
|---|---|---|
| `DATABASE_URL` | tak | Postgres. Na produkcji connection string z Neon (Vercel Marketplace) |
| `ANTHROPIC_API_KEY` | do mentora | Klucz z [console.anthropic.com](https://console.anthropic.com). Bez niego reszta aplikacji działa normalnie, a mentor mówi, czego brakuje |
| `ALLOWED_SIGNUP_EMAILS` | nie | Lista adresów po przecinku, które mogą założyć konto po pierwszym |
| `CRON_SECRET` | do crona | Chroni `/api/cron/mentor`, który generuje rekomendacje o poranku |

## Skrypty

```bash
npm run dev         # serwer deweloperski
npm run build       # build produkcyjny
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # testy reguł domenowych (vitest)
npm run db:generate # nowa migracja po zmianie schematu
npm run db:migrate  # wykonanie migracji
npm run icons       # regeneracja ikon PWA
```

## Jak to jest zbudowane

- **Next.js 15** (App Router, React 19, server actions) + **TypeScript**
- **Tailwind CSS v4** — tokeny kolorów w `app/globals.css`, motyw ciemny domyślnie, jasny zgodnie z ustawieniem systemu
- **Postgres + Drizzle ORM** — schemat w `lib/db/schema.ts`, migracje w `drizzle/`
- **Własne sesje** — nieprzezroczysty token w bazie (przechowywany jako skrót), ciasteczko `httpOnly`; middleware odsiewa żądania bez ciasteczka, a `requireUser()` weryfikuje token po stronie serwera
- **Claude API** (`claude-opus-5`) ze structured outputs — mentor zwraca zwalidowany JSON, nie tekst do parsowania
- **Wykresy** pisane ręcznie w SVG — brak zależności, renderują się po stronie serwera

### Warstwy

```
app/            strony i server actions
components/     komponenty UI, formularze, wykresy
lib/domain/     reguły biznesowe (bez zależności od bazy) — pokryte testami
lib/queries/    odczyt danych
lib/actions/    zapis danych
lib/db/         schemat i połączenie
lib/ai/         mentor
```

Reguły domenowe są celowo oddzielone od bazy: progi nawodnienia, składanie planu nauki z planu
tygodniowego i rocznego, harmonogram leków na dany dzień, wyliczanie rekordów, sortowanie agendy
dnia i siatka miesiąca to czyste funkcje w `lib/domain/`, przetestowane w `lib/domain/domain.test.ts`.

## Wdrożenie na Vercel

1. Podłącz repozytorium do projektu na Vercel.
2. Dodaj bazę Neon z Vercel Marketplace — `DATABASE_URL` ustawi się samo.
3. Uzupełnij pozostałe zmienne środowiskowe.
4. Uruchom migracje względem bazy produkcyjnej: `DATABASE_URL="..." npm run db:migrate`.
5. `vercel.json` konfiguruje crona mentora na 05:00 UTC (07:00 w Warszawie).

## Plan wagowy

Sama waga docelowa mówi tylko, ile brakuje. Żeby aplikacja odpowiadała na pytanie „czy idę zgodnie
z planem", potrzebuje czterech wartości: wagi startowej, daty startu, wagi docelowej i terminu.
Ustawia się je w **Cele i normy**. Aplikacja prowadzi wtedy prostą linię od startu do celu, wylicza,
ile waga powinna wynosić dzisiaj, i porównuje to z ostatnim pomiarem — z tolerancją 0,5 kg.
Kierunek liczy się poprawnie w obie strony: przy chudnięciu lepiej być poniżej linii, przy budowaniu
masy powyżej. Kafelek pokazuje też tempo rzeczywiste obok planowanego, w kg na tydzień.

## Uwaga

Mentor nie udziela porad medycznych. Może zauważyć, że realizacja przyjmowania leków spadła, ale
nigdy nie zaproponuje zmiany dawki ani nowego preparatu — dawki wpisujesz sam, a decyzje zdrowotne
zostają między Tobą a lekarzem.

To samo dotyczy zdrowia psychicznego: mentor dostaje wpisy o samopoczuciu, myślach i dobrych
rzeczach, może zauważyć zależności (na przykład między snem, stresem a realizacją planu) i
przypomnieć zapisane wygrane, ale nie stawia diagnoz. Jeśli wpisy wskazują na poważny kryzys,
zamiast „działania na tydzień" kieruje do specjalisty i podaje kontakt. W samym raporcie i na
stronie zdrowia widnieją numery: 800 70 2222 (całodobowe Centrum Wsparcia), 116 123 (kryzysowy
telefon zaufania), 112 przy zagrożeniu życia.
