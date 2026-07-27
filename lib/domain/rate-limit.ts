/**
 * Zasady blokowania po nieudanych próbach logowania.
 *
 * Kokpit stoi pod publicznym adresem, więc formularz logowania widzi każdy, kto
 * zna URL. Bez licznika hasło można zgadywać w nieskończoność — z licznikiem
 * atak zwalnia do tempa, przy którym przestaje mieć sens.
 *
 * Liczymy w dwóch wymiarach, bo każdy łapie inny scenariusz:
 * — po adresie e-mail: ktoś dobiera się do konkretnego konta,
 * — po adresie IP: ktoś próbuje wielu adresów e-mail z jednej maszyny.
 *
 * Limit na IP jest luźniejszy, bo za jednym adresem potrafi siedzieć cała sieć
 * domowa albo firmowa, a nie chcemy zablokować domownikom dostępu przez pomyłkę
 * jednej osoby.
 *
 * Reguły są tutaj jako czyste funkcje — bez bazy i bez zegara systemowego —
 * żeby dało się je przetestować, a nie tylko przeczytać.
 */

export const OKNO_MINUT = 15;

export const LIMIT_EMAIL = 8;
export const LIMIT_IP = 25;

export type Blokada = {
  zablokowane: boolean;
  /** Ile pełnych minut zostało do odblokowania. Zero, gdy nie ma blokady. */
  minutDoKonca: number;
};

/**
 * Czy dany identyfikator jest zablokowany.
 *
 * `proby` to znaczniki czasu nieudanych logowań — kolejność nie ma znaczenia,
 * bo i tak odsiewamy te spoza okna.
 */
export function ocenBlokade(proby: Date[], limit: number, teraz: Date): Blokada {
  const poczatekOkna = teraz.getTime() - OKNO_MINUT * 60_000;
  const wOknie = proby.filter((proba) => proba.getTime() > poczatekOkna);

  if (wOknie.length < limit) return { zablokowane: false, minutDoKonca: 0 };

  // Blokada mija, gdy najstarsza z liczonych prób wypadnie z okna.
  const najstarsza = Math.min(...wOknie.map((proba) => proba.getTime()));
  const koniec = najstarsza + OKNO_MINUT * 60_000;
  const minut = Math.max(1, Math.ceil((koniec - teraz.getTime()) / 60_000));

  return { zablokowane: true, minutDoKonca: minut };
}

/** Komunikat dla użytkownika — mówi, ile czekać, i nie zdradza, czy konto istnieje. */
export function opiszBlokade(minutDoKonca: number): string {
  const jednostka = minutDoKonca === 1 ? "minutę" : minutDoKonca < 5 ? "minuty" : "minut";
  return `Za dużo nieudanych prób logowania. Spróbuj ponownie za ${minutDoKonca} ${jednostka}.`;
}

/**
 * Adres IP żądania. Za proxy (a Vercel jest proxy) prawdziwy adres siedzi
 * w nagłówku `x-forwarded-for`, gdzie pierwszy wpis to klient.
 */
export function adresIp(naglowki: Headers): string {
  const forwarded = naglowki.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return naglowki.get("x-real-ip")?.trim() || "nieznany";
}
