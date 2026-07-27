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
| **Kreator `/start`** | 15 kroków konfiguracji. Leki, trening, rekordy, nauka i projekty to listy dynamiczne — „+ dodaj” dokłada wiersz, a nazwy dyscyplin i dziedzin wpisujesz własnymi słowami |
| **Panel `/ustawienia`** | Te same formularze bezterminowo. Wyłączenie pozycji zachowuje historię zamiast ją kasować |
| **Raport `/raport`** | Jeden formularz na cały dzień: finanse (stan środków, wydane, wpłynęło), dopłaty na cele oszczędnościowe, rachunki do odhaczenia, sprzedaż i umowy, leki, waga i woda, zadania, trening z możliwością zgłoszenia rekordu, nauka oraz zdrowie psychiczne (samopoczucie, energia, stres, myśli, co dobrego się wydarzyło) |
| **Kategorie** | `/finanse` (stan środków, przepływy, oszczędności, płatności, pozycja na tle świata), `/sprzedaz` (lejek „do podpisania”, konwersje, umowy), `/rodzina`, `/zdrowie` (leki, waga, nawodnienie, testy stanu psychicznego), `/zadania`, `/trening`, `/nauka`, `/projekty` |
| **Mentor `/mentor`** | Trzy tryby (mentor / trener / kierownik projektów). Analizuje agregaty z 7 i 30 dni i zwraca rekomendacje „obserwacja → działanie” ze statusami |
| **PWA** | Instalowalna na telefonie, ze skrótami do raportu, zadań i mentora |

Prawy pasek kategorii rozwija się na podkategorie, zwija do samych ikon, a na telefonie wysuwa się
jako panel z prawej strony.

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env          # uzupełnij DATABASE_URL
npm run db:migrate            # zakłada 30 tabel
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
- **Postgres + Drizzle ORM** — schemat w `lib/db/schema.ts` (30 tabel), migracje w `drizzle/`
- **Własne sesje** — nieprzezroczysty token w bazie (przechowywany jako skrót), ciasteczko `httpOnly`; middleware odsiewa żądania bez ciasteczka, a `requireUser()` weryfikuje token po stronie serwera
- **Claude API** (`claude-opus-5`) ze structured outputs — mentor zwraca zwalidowany JSON, nie tekst do parsowania
- **Wykresy** pisane ręcznie (SVG i CSS) — brak zależności, renderują się po stronie serwera. Wykres dzienny ma oś z zaokrągloną skalą, wartość nad każdym słupkiem i przerywaną linię celu; na wąskim ekranie podpisy skracają się do numeru dnia

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

## Wydatki i wpływy

Sam stan środków mówi tylko, ile zostało. Żeby było widać, ile wychodzi, raport pyta osobno o
**wydane** i **to, co wpłynęło** — kwoty wpisujesz bez znaku, minus dokłada widok. Dzięki temu
dzień, w którym wydałeś 300 zł i tyle samo wpłynęło, nie wygląda na dzień bez wydatków, choć
saldo się nie zmieniło.

Gdy kwot nie podasz, aplikacja nadal pokazuje wynik dnia, ale wylicza go z różnicy między
kolejnymi wpisami stanu środków — to gorsze źródło i tak jest opisane w podpowiedziach. Wpisane
kwoty zawsze mają pierwszeństwo. Sumy i średnie liczą się wyłącznie z dni z wpisem: brak raportu
to brak danych, a nie zero wydatków. Mentor dostaje te same liczby wraz z informacją, z ilu dni
pochodzą.

## Do podpisania

Tabela na `/sprzedaz` z klientami, z którymi umowa jeszcze nie jest zamknięta, i szacowaną kwotą przy
każdym. Startuje z dziesięcioma pustymi wierszami, kolejne dokłada przycisk. Pod tabelą podsumowanie:
ile kontraktów czeka i ile jest do zdobycia — liczone na żywo, w trakcie wpisywania, a nie dopiero po
zapisie. Puste wiersze są odsiewane przy zapisie, więc dziesięć miejsc na start nie oznacza dziesięciu
błędów walidacji.

Do sumy „do zdobycia” wchodzą wyłącznie pozycje ze statusem *do podpisania*. Podpisana umowa liczy się
już w kontraktach z raportu dziennego, a przepadła nie liczy się nigdzie — inaczej ta sama złotówka
byłaby w dwóch miejscach naraz.

## Rodzina

Osoby z datami urodzin i wydarzenia: rocznice, randki, wspólne wyjazdy. Urodziny i rocznice wracają
co roku same — 29 lutego w roku nieprzestępnym wypada 28 lutego, żeby nikt nie tracił urodzin co
cztery lata. Wszystko trafia do kalendarza jako osobna kategoria: własna kropka w siatce miesiąca,
własny wiersz w pasku tygodnia i lista w szczegółach dnia.

### Drobne gesty

Aplikacja planuje w tygodniu kilka drobnych rzeczy do zrobienia dla bliskiej osoby (domyślnie dwie,
zmienisz w **Celach i normach**, zero wyłącza). Plan jest deterministyczny — ten sam tydzień daje ten
sam zestaw, więc odświeżenie strony niczego nie podmienia — i przesuwa się przez katalog, żeby
propozycje nie zaczęły się powtarzać po dwóch tygodniach.

Katalog nie jest zbiorem porad z internetu. Każda pozycja wynika z jednego z czterech mechanizmów
opisanych w badaniach:

| Mechanizm | Co z tego wynika | Źródło |
|---|---|---|
| Reagowanie na drobne zaczepki | Pary, które przetrwały, odpowiadały na nie w 86% przypadków; te, które się rozstały — w 33%. Stąd „małe rzeczy, często” zamiast wielkich gestów raz na kwartał | [Gottman Institute](https://www.gottman.com/blog/the-magic-ratio-the-key-to-relationship-satisfaction/) |
| Wdzięczność mówiąca o drugiej osobie | Działa ta odmiana, która nazywa cechę („to pokazuje, jaki jesteś”), a nie własną korzyść („bardzo mi pomogłeś”) | [Algoe, Kurtz, Hilaire (2016)](https://journals.sagepub.com/doi/full/10.1177/1948550616651681) |
| Wspólne nowe aktywności | Nowość i pobudzenie zwiększają poczucie bliskości mocniej niż powtarzalna rozrywka; liczy się nowość, nie koszt | [Aron, Tomlinson](https://assets.cambridge.org/97811084/75686/excerpt/9781108475686_excerpt.pdf) |
| Rytuały i aktualna wiedza o drugiej osobie | Powitania, rozmowa o dniu bez doradzania, pytania o to, czym ktoś żyje teraz | [Gottman Institute](https://www.gottman.com/blog/the-magic-ratio-the-key-to-relationship-satisfaction/) |

Świadomie **nie** opieramy tego na „językach miłości”: [przegląd Impett, Park i Muise (2024)](https://journals.sagepub.com/doi/10.1177/09637214231217663)
pokazuje, że trzy założenia tej koncepcji — jeden dominujący język, dokładnie pięć języków i wyższa
satysfakcja przy dopasowaniu — nie mają mocnego wsparcia w danych.

Dane rodzinne **nie idą do mentora AI**. Mentor dostaje liczby o finansach, sprzedaży, zdrowiu
i realizacji planów; imiona bliskich, daty i notatki zostają w bazie.

## Odliczanie

Licznik dni do wydarzenia: data i podpis, do czego odliczamy — na przykład „wakacje Włochy 2027".
Na dashboardzie najbliższe wydarzenie zajmuje kafelek z dużą liczbą dni i nazwą pod spodem, a pod
nim skrót pozostałych. Wydarzeń dodajesz dowolnie wiele; minione schodzą na koniec listy z liczbą
dni ze znakiem minus, zamiast przykrywać to, co dopiero przed Tobą. Podpis pod liczbą dobiera
jednostkę do odległości: „jutro", „za 4 dni", „za 3 tygodnie", „za 6 miesięcy".

## Cele oszczędnościowe

Cel to nazwa, kwota i opcjonalny termin — dodajesz ich dowolnie wiele. Każdy raport dzienny pyta,
ile na który cel odłożyłeś; postęp to suma dopłat plus kwota, którą miałeś odłożoną przed wpisaniem
celu. Pasek i procent aktualizują się od razu w formularzu, jeszcze przed zapisem.

Odłożona kwota **nie jest wydatkiem** — pieniądze nie znikają, tylko zmieniają przeznaczenie, więc
nie wchodzą do „wydane". W pasku tygodnia widać je osobno, ze strzałką.

Gdy cel ma termin, aplikacja liczy, ile trzeba odkładać tygodniowo, i porównuje to z tym, ile
faktycznie odkładasz (średnia z 28 dni). Stąd bierze się ocena „tempo zgodne z planem" albo
„odkładasz wolniej, niż wymaga termin".

## Płatności i koszty stałe

Zobowiązanie opisujesz raz: nazwa, kwota, kategoria, rytm (od jednorazowo do raz na rok), termin
pierwszej płatności i koniec okresu. Terminy nie są zapisywane w bazie — powstają z pierwszej daty
i rytmu, więc zmiana kwoty nie wymaga poprawiania przyszłych rat, a rata kredytu na pięć lat sama
znika z kalendarza po ostatniej płatności. Termin 31. dnia miesiąca cofa się do ostatniego dnia
w krótszych miesiącach.

Płatności są osobną kategorią w kalendarzu: w siatce miesiąca mają własną kropkę, w pasku tygodnia
własny wiersz, a w szczegółach dnia listę z kwotami. Termin miniony bez potwierdzenia zapłaty staje
się zaległością i jest oznaczany na czerwono — w kafelku, w kalendarzu i w raporcie, gdzie można go
odhaczyć wstecz.

Suma kosztów stałych jest sprowadzana do miesiąca (rata roczna dzielona przez 12, kwartalna przez 3),
z podziałem na kategorie. Płatności jednorazowe liczone są osobno, bo doliczenie ich zawyżałoby
stałe obciążenie.

## Zarobki na tle świata

Karta „Zarobki na tle świata" na stronie finansów pokazuje, w którym miejscu światowego rozkładu
dochodów stawia Cię to, co wpłynęło w ostatnich 30 dniach. To szacunek, nie pomiar: model opiera się
na opublikowanych progach i przybliża rozkład między nimi funkcją potęgową.

| Rozkład | Kotwice | Źródło |
|---|---|---|
| Świat | mediana 6 000 $/rok, próg górnych 10% — 65 500 $/rok, próg górnego 1% — 250 300 $/rok (dochód brutto na dorosłego, PPP) | World Inequality Report 2026, WID.world |
| Polska | decyl 1 — 4 806 zł, mediana — 7 447,16 zł, decyl 9 — 15 500 zł (miesięcznie brutto) | GUS, struktura wynagrodzeń, styczeń 2026 |

Przelicznik: 2,0 zł za dolara międzynarodowego (PPP). Rozkład GUS obejmuje zatrudnionych w firmach
powyżej 9 osób — nie ma w nim przedsiębiorców, więc dla właściciela firmy to punkt odniesienia,
a nie ranking. Poniżej najniższej kotwicy aplikacja nie zgaduje pozycji, tylko mówi „poniżej mediany".

## Plan wagowy

Sama waga docelowa mówi tylko, ile brakuje. Żeby aplikacja odpowiadała na pytanie „czy idę zgodnie
z planem", potrzebuje czterech wartości: wagi startowej, daty startu, wagi docelowej i terminu.
Ustawia się je w **Cele i normy**. Aplikacja prowadzi wtedy prostą linię od startu do celu, wylicza,
ile waga powinna wynosić dzisiaj, i porównuje to z ostatnim pomiarem — z tolerancją 0,5 kg.
Kierunek liczy się poprawnie w obie strony: przy chudnięciu lepiej być poniżej linii, przy budowaniu
masy powyżej. Kafelek pokazuje też tempo rzeczywiste obok planowanego, w kg na tydzień.

## Ocena stanu psychicznego

Suwak „samopoczucie 1–5" w raporcie jest pulsem dnia — zależy od godziny, pogody i tego, co się
akurat wydarzyło, więc nie da się z niego odczytać, czy jest lepiej niż miesiąc temu. Ocenę stanu
niesie osobny wynik: krótki test z pytań o ustalonej punktacji i progach. Testy wypełnia się
w `/zdrowie/test/<test>`, a wynik trafia na stronę zdrowia, na dashboard i do pakietu danych mentora.

| Test | Co mierzy | Skala | Rytm |
|---|---|---|---|
| **WHO-5** | ogólny dobrostan psychiczny w ostatnich dwóch tygodniach | 0–100 (surowe 0–25 × 4) | co 7 dni |
| **GAD-7** | nasilenie objawów lękowych | 0–21 | co 30 dni |
| **PHQ-9** | nasilenie objawów depresyjnych | 0–27 | co 30 dni |

Progi pochodzą z narzędzi, nie z tej aplikacji. W WHO-5 wynik ≤ 50 jest zalecanym progiem do
dalszego sprawdzenia, a ≤ 28 odpowiada poziomowi dobrostanu spotykanemu przy depresji. W GAD-7
i PHQ-9 dziesięć punktów to próg dalszej diagnostyki. **Żaden z tych wyników nie jest diagnozą** —
to wskaźnik do obserwacji i rozmowy ze specjalistą, i aplikacja mówi to wprost przy każdym wyniku.

Zasady, które wynikają z tego, jak te narzędzia działają:

- **Test liczy się tylko w komplecie.** Zapis jest zablokowany, dopóki brakuje odpowiedzi —
  częściowa suma nie jest porównywalna z progami z badań.
- **Punktację liczy serwer**, z zapisanych odpowiedzi. Formularz wysyła wyłącznie odpowiedzi, więc
  wyniku nie da się podstawić z boku, a korekta progów w kodzie od razu obejmuje całą historię.
- **Pytanie 9 w PHQ-9** (myśli o śmierci lub samookaleczeniu) ma własną ścieżkę: każda odpowiedź
  inna niż „wcale" wywołuje ramkę z numerami wsparcia niezależnie od sumy punktów, także przy
  wyniku z najlepszego przedziału. Mentor dostaje ten sygnał osobnym polem i traktuje go
  priorytetowo zamiast wpisywać w ranking obszarów.
- **Powtórne wypełnienie tego samego dnia nadpisuje wpis** — to poprawka pomyłki, nie druga
  obserwacja. Historia trzyma po jednym wyniku na dzień i test.
- Raport dzienny i strona zdrowia przypominają o teście, którego termin minął.

Źródła: WHO-5 —
[przegląd systematyczny (Topp i in., 2015)](https://karger.com/pps/article/84/3/167/282903/The-WHO-5-Well-Being-Index-A-Systematic-Review-of),
narzędzie dostępne bezpłatnie w wielu językach na who-5.org. PHQ-9 (Kroenke, Spitzer, Williams)
i GAD-7 (Spitzer i in.) —
[udostępnione przez Pfizer bez ograniczeń licencyjnych](https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care).
Polskie sformułowania pytań przygotowano na potrzeby kokpitu — są wierne treści oryginałów, ale nie
są oficjalnym, walidowanym tłumaczeniem, i interfejs mówi o tym wprost.

## Uwaga

Mentor nie udziela porad medycznych. Może zauważyć, że realizacja przyjmowania leków spadła, ale
nigdy nie zaproponuje zmiany dawki ani nowego preparatu — dawki wpisujesz sam, a decyzje zdrowotne
zostają między Tobą a lekarzem.

To samo dotyczy zdrowia psychicznego: mentor dostaje wyniki testów przesiewowych razem z wpisami
o samopoczuciu, myślach i dobrych rzeczach, może zauważyć zależności (na przykład między snem,
stresem a realizacją planu) i przypomnieć zapisane wygrane, ale nie stawia diagnoz — przedział
z testu powtarza jako wynik przesiewu, nigdy jako rozpoznanie. Jeśli wpisy wskazują na poważny kryzys,
zamiast „działania na tydzień" kieruje do specjalisty i podaje kontakt. W samym raporcie i na
stronie zdrowia widnieją numery: 800 70 2222 (całodobowe Centrum Wsparcia), 116 123 (kryzysowy
telefon zaufania), 112 przy zagrożeniu życia.
