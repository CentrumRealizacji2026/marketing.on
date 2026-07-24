# Audyt kreacji + ustawienia kampanii Meta Ads
Kampania WWW — marketing.on · stan na 2026-07-24

## 1. Audyt kreacji

### Weryfikacja techniczna (wszystkie 30 plików)
- ✅ Wymiary zgodne ze specyfikacją Meta: 1080×1920 (9:16), 1080×1350 (4:5), 1080×1080 (1:1) + wersje 2× (2160 px)
- ✅ Wagi 82–686 KB — daleko poniżej limitu 30 MB
- ✅ PNG bez przezroczystości, polskie znaki renderowane poprawnie (fonty wbudowane)
- ✅ Story: treść krytyczna poza strefami nakładek (górne ~250 px, dolne ~350 px)
- ✅ Feed 4:5: CTA ponad dolnym paskiem umiejscowienia (dolne ~10% wolne)

### Ocena per kreacja

| Kreacja | Status | Uwagi |
|---|---|---|
| 1A — czat | ✅ GOTOWA | najmocniejszy hook narracyjny; spójna mechanika czatu (kolory ról, godziny, ✓✓) |
| 1B — oferta | ✅ GOTOWA | najczytelniejsza oferta w 2 s; duża cena = prekwalifikacja leadów |
| 2 — paragon | ⚠️ GOTOWA z zastrzeżeniem | kwoty rynkowe (~4 000 / ~900 / ~1 200 / ~1 400 zł) są orientacyjne — potwierdź, że umiesz je obronić, albo podaj własne; gwiazdka z wyjaśnieniem jest na kreacji |
| 3 — proces | ✅ GOTOWA | najlepsza dla „zimnego" odbiorcy, który boi się, że strona = dużo pracy |
| 4 — typograficzna | ✅ GOTOWA | najsilniejszy pattern-interrupt (pełna limonka); poprawione ucięte litery |

### Zgodność z zasadami Meta
- Brak porównań do konkurencji z nazwy, brak obietnic „gwarantowanych efektów", brak atrybutów osobistych („Ty" w kontekście firmy jest OK) — niskie ryzyko odrzucenia.
- Ceny netto → kampanię kierujemy do firm (B2B), co jest spójne.
- Przekreślona suma na paragonie to porównanie „osobno vs pakiet", nie fikcyjna promocja „z 7500 na 980" — opis gwiazdką na kreacji zabezpiecza rzetelność. Nie używaj w tekście reklamy sformułowania „przecena z 7 500 zł".

### Przewidywany ranking CTR (do weryfikacji testami)
1. **4 — typograficzna** (pełnokolorowe tło najmocniej zatrzymuje scroll)
2. **1A — czat** (natywny wzorzec konwersacji)
3. **1B — oferta** (cena na froncie — mniej kliknięć, ale lepsze leady)
4. **2 — paragon** (wymaga 2–3 s czytania, ale mocno konwertuje zainteresowanych)
5. **3 — proces** (edukacyjna — lepsza na retargeting niż na zimny ruch)

## 2. Ustawienia kampanii w Meta Ads

### Struktura konta
```
Kampania: MON | WWW | Leady           (cel: Wiadomości LUB Pozyskiwanie kontaktów)
└── Zestaw: PL / firmy / Advantage+   (budżet CBO 50–70 zł/dzień)
    ├── Reklama 1A (test A/B ─┐
    ├── Reklama 1B (test A/B ─┘ przez narzędzie Eksperymenty)
    ├── Reklama 4
    └── (później: 2, 3)
```

### Cel kampanii — rekomendacja
- **Wiadomości (Messenger/WhatsApp)** — naturalnie kontynuuje scenariusz kreacji 1A
  (klient „wchodzi" w czat, który widział na reklamie). Odpowiadaj w 24 h, jak obiecuje kreacja.
- Alternatywa: **Pozyskiwanie kontaktów (formularz błyskawiczny)** — pola: imię, telefon,
  branża, miejscowość. Mniej tarcia, ale leady zimniejsze.
- Nie ustawiaj celu „Ruch" ani „Aktywność" — płacisz wtedy za kliknięcia, nie za leady.

### Zestaw reklam
| Ustawienie | Wartość |
|---|---|
| Lokalizacja | obszar realnego dojazdu na sesję (np. promień 100 km od siedziby) — NIE cała Polska, skoro przyjeżdżacie ze sprzętem |
| Wiek / płeć | 24–55, wszyscy |
| Język | polski |
| Odbiorcy | Advantage+ z sugestiami: mała firma, przedsiębiorczość, działalność gospodarcza, samozatrudnienie |
| Umiejscowienia | Advantage+ (automatyczne) z dopasowaniem zasobów: 9:16 → Stories/Reels, 4:5 → aktualności FB/IG, 1:1 → pozostałe |
| Budżet | 50–70 zł/dzień (min. ~1 500 zł/mies., inaczej test nie zbierze danych) |
| Optymalizacja | liczba rozmów / leadów (domyślna dla celu) |
| Harmonogram | całodobowo, bez zmian przez min. 7 dni (faza uczenia ≈ 50 zdarzeń/tydzień) |

### Test A/B reklamy 1 (A vs B)
- Narzędzie: Ads Manager → **Eksperymenty → Test A/B**, zmienna: **kreacja** (nie dwie luźne reklamy w zestawie — Meta musi rozdzielić odbiorców).
- Metryka zwycięstwa: **koszt na lead/rozmowę** (nie CTR!).
- Czas: 7 dni, równy budżet, zero edycji w trakcie (edycja resetuje uczenie).
- Po rozstrzygnięciu: przegrany STOP, zwycięzca zostaje, dokładasz reklamę 4, potem 2.

### Poziom reklamy
- **Pliki:** wgrywaj wersje 2× (2160 px) — Meta przeskaluje, obraz ostrzejszy.
- **Przycisk CTA:** „Wyślij wiadomość" (cel: Wiadomości) / „Uzyskaj wycenę" (formularz).
- **Nagłówek reklamy:** `Strona WWW od 980 zł netto — sesja i wideo w cenie`
- **Teksty główne (primary text):**
  - 1A/1B: `Planujesz stronę WWW, ale nie masz zdjęć ani filmów? U nas masz sesję zdjęciową i wideo w cenie strony — przyjeżdżamy do Ciebie i robimy wszystko na miejscu. Strony od 980 zł netto, na start miesiąc prowadzenia social mediów gratis. Napisz — bezpłatna wycena w 24 h.`
  - 2: `Strona u jednego, zdjęcia u drugiego, wideo u trzeciego? Osobno zapłacisz kilka razy więcej. W marketing.on masz wszystko w jednym pakiecie od 980 zł netto — z dojazdem, sesją i miesiącem social mediów gratis. Bezpłatna wycena w 24 h.`
  - 3: `Gotowa strona w 3 krokach: piszesz do nas → przyjeżdżamy z sesją i kamerą → odbierasz stronę, która wyróżnia Cię na tle konkurencji. Od 980 zł netto + miesiąc social mediów gratis.`
  - 4: `Nie znasz się na stronach? Nie musisz. My zrobimy to za Ciebie — zdjęcia, wideo i stronę. Ty skupiasz się na prowadzeniu biznesu. Od 980 zł netto. Bezpłatna wycena w 24 h.`

### Pomiar i higiena kampanii
- Podepnij **Piksel Meta + Konwersje API**, gdy powstanie strona docelowa; do tego czasu zdarzenia z formularzy/wiadomości wystarczą.
- Oceniaj po **koszcie leada** i jakości rozmów, nie po CTR/zasięgu.
- Częstotliwość > 2,5–3 → rotuj kreację (masz w zapasie 2 i 3).
- Odpowiadaj na wiadomości < 1 h w godzinach pracy — Meta premiuje responsywne profile, a kreacja obiecuje wycenę w 24 h.
- Wyklucz z odbiorców fanów własnej strony przy kampanii na zimny ruch (opcjonalnie).
