# Audyt kreacji + ustawienia kampanii Meta Ads
Kampania leadowa — elgreen · stan na 2026-07-24

## 1. Audyt kreacji

### Weryfikacja techniczna (wszystkie 24 pliki)
- ✅ Wymiary zgodne ze specyfikacją Meta: 1080×1920 (9:16), 1080×1350 (4:5), 1080×1080 (1:1) + wersje 2× (2160 px)
- ✅ PNG bez przezroczystości, polskie znaki renderowane poprawnie (fonty wbudowane — Manrope)
- ✅ Story: treść krytyczna poza strefami nakładek (górne ~250 px, dolne ~350 px)
- ✅ Feed 4:5: CTA ponad dolnym paskiem umiejscowienia

### Do potwierdzenia PRZED emisją
- ⚠️ **Logo = placeholder.** Sygnet i logotyp na kreacjach to rekonstrukcja robocza — podmień na oryginalne pliki (folder z logo i sygnetem elgreen), przelicz `ads-elgreen/render.sh` i wymień PNG.
- ⚠️ **Liczby z elgreen.pl** (15+ lat, 3000+ projektów, odpowiedź w 48 h) — potwierdź u klienta, że są aktualne i obronne.
- ⚠️ Obietnica „odpowiedź w 48 h" wiąże procesowo — upewnij się, że handlowcy odpowiadają w tym czasie.

### Ocena per kreacja

| Kreacja | Status | Uwagi |
|---|---|---|
| 1A — czat | ✅ GOTOWA (po podmianie logo) | hook narracyjny; scenariusz „teren pod PV → my bierzemy formalności" |
| 1B — oferta | ✅ GOTOWA (po podmianie logo) | najczytelniejsza w 2 s; „48 h" jako kotwica zamiast ceny (usługi wyceniane projektowo) |
| 2 — proces | ✅ GOTOWA (po podmianie logo) | najlepsza dla „zimnego" odbiorcy, który boi się formalności |
| 3 — typograficzna | ✅ GOTOWA (po podmianie logo) | najsilniejszy pattern-interrupt (pełna zieleń) |

### Zgodność z zasadami Meta
- Brak porównań do konkurencji, brak „gwarantowanych efektów", brak cen (usługi projektowe B2B) — niskie ryzyko odrzucenia.
- Komunikacja B2B (inwestorzy, firmy, samorządy) — spójna z celem pozyskiwania leadów.

### Przewidywany ranking CTR (do weryfikacji testami)
1. **3 — typograficzna** (pełnokolorowe tło najmocniej zatrzymuje scroll)
2. **1A — czat** (natywny wzorzec konwersacji)
3. **1B — oferta** (konkret zakresu — mniej kliknięć, lepsze leady)
4. **2 — proces** (edukacyjna — lepsza na retargeting niż na zimny ruch)

## 2. Ustawienia kampanii w Meta Ads

### Struktura konta
```
Kampania: ELG | Leady                 (cel: Pozyskiwanie kontaktów LUB Wiadomości)
└── Zestaw: PL / B2B / Advantage+     (budżet CBO 60–100 zł/dzień)
    ├── Reklama 1A (test A/B ─┐
    ├── Reklama 1B (test A/B ─┘ przez narzędzie Eksperymenty)
    ├── Reklama 3
    └── (później: 2 na retargeting)
```

### Cel kampanii — rekomendacja
- **Pozyskiwanie kontaktów (formularz błyskawiczny)** — pola: imię, firma, telefon,
  typ inwestycji (PV / magazyn / ładowarki / przyłącze), lokalizacja. Dla B2B
  formularz prekwalifikuje lepiej niż czat.
- Alternatywa: **Wiadomości** — spójna z kreacją 1A, ale leady bywają zimniejsze.
- Rozważ też **LinkedIn Ads** dla większych inwestorów — te same kreacje 1:1 i 4:5.

### Zestaw reklam
| Ustawienie | Wartość |
|---|---|
| Lokalizacja | obszar realnej obsługi projektów (region lub PL, wg zasięgu elgreen) |
| Wiek / płeć | 28–60, wszyscy |
| Język | polski |
| Odbiorcy | Advantage+ z sugestiami: właściciele firm, deweloperzy, zarządzanie nieruchomościami, rolnictwo, flota pojazdów, energetyka |
| Umiejscowienia | Advantage+ z dopasowaniem zasobów: 9:16 → Stories/Reels, 4:5 → aktualności, 1:1 → pozostałe |
| Budżet | 60–100 zł/dzień (B2B: droższy lead, min. ~2 000 zł/mies. na sensowny test) |
| Optymalizacja | liczba leadów (domyślna dla celu) |
| Harmonogram | całodobowo, bez edycji przez min. 7 dni (faza uczenia) |

### Test A/B reklamy 1 (A vs B)
- Narzędzie: Ads Manager → **Eksperymenty → Test A/B**, zmienna: **kreacja**.
- Metryka zwycięstwa: **koszt na lead** (nie CTR!).
- Czas: 7–14 dni (B2B wolniej zbiera zdarzenia), równy budżet, zero edycji w trakcie.
- Po rozstrzygnięciu: przegrany STOP, dokładasz reklamę 3, potem 2 na retargeting.

### Poziom reklamy
- **Pliki:** wgrywaj wersje 2× (2160 px).
- **Przycisk CTA:** „Uzyskaj wycenę" / „Wyślij wiadomość".
- **Nagłówek reklamy:** `Energetyka, OZE i e-mobility pod klucz — bezpłatna konsultacja w 48 h`
- **Teksty główne (primary text):**
  - 1A/1B: `Planujesz instalację PV, magazyn energii, ładowarki albo przyłącze? Nie musisz znać się na formalnościach — projektujemy i budujemy od koncepcji po odbiór, z uzgodnieniami z operatorem po naszej stronie. 15+ lat w energetyce, 3000+ projektów. Napisz — bezpłatna konsultacja w 48 h.`
  - 2: `Inwestycja energetyczna w 3 krokach: rozmawiamy o projekcie → projektujemy i załatwiamy formalności → budujemy i serwisujemy. Jeden wykonawca od sieci SN po ładowarkę EV. Bezpłatna konsultacja w 48 h.`
  - 3: `Nie musisz się znać na energetyce. My się znamy — projekt, formalności z operatorem i budowa po naszej stronie. 3000+ projektów, 15+ lat doświadczenia. Bezpłatna konsultacja w 48 h.`

### Pomiar i higiena kampanii
- Podepnij **Piksel Meta + Konwersje API** na stronie elgreen.pl (zdarzenie: wysłanie formularza).
- Oceniaj po **koszcie i jakości leada** (czy to realny inwestor?), nie po CTR/zasięgu.
- Częstotliwość > 2,5–3 → rotuj kreację (masz w zapasie 2).
- Odpowiadaj na leady < 48 h — kreacje to obiecują.
