#!/usr/bin/env bash
#
# Uruchomienie kokpitu na własnym komputerze jedną komendą:
#
#   npm run kokpit
#
# Skrypt robi po kolei to, co inaczej trzeba by wyklikać ręcznie: podnosi bazę,
# instaluje zależności, zakłada tabele, wypełnia dane pokazowe i startuje
# aplikację. Każdy krok pomija się sam, jeśli został już zrobiony wcześniej,
# więc kolejne uruchomienie jest szybkie i niczego nie kasuje.

set -euo pipefail
cd "$(dirname "$0")/.."

krok() { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }
blad() { printf "\n\033[31m✗ %s\033[0m\n\n" "$1" >&2; exit 1; }

DB_URL_DOMYSLNY="postgres://postgres:postgres@localhost:5432/zycie"

# ------------------------------------------------------------------ 1. Node

command -v node >/dev/null || blad "Nie znaleziono Node.js. Zainstaluj wersję 20 lub nowszą: https://nodejs.org"

WERSJA_NODE="$(node -p 'process.versions.node.split(".")[0]')"
[ "$WERSJA_NODE" -ge 20 ] || blad "Masz Node $(node -v), a potrzebna jest wersja 20 lub nowsza: https://nodejs.org"

# --------------------------------------------------------------- 2. plik .env

if [ ! -f .env ]; then
  krok "Tworzę plik .env z ustawieniami"
  cp .env.example .env
fi

# Connection string z .env, żeby skrypt uszanował własną bazę użytkownika.
DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ' || true)"
DB_URL="${DB_URL:-$DB_URL_DOMYSLNY}"

# --------------------------------------------------------------- 3. Postgres

# Bazę z Dockera podnosimy tylko wtedy, gdy .env wskazuje na localhost —
# przy własnym serwerze Postgresa nie ma czego uruchamiać.
if [[ "$DB_URL" == *"@localhost"* || "$DB_URL" == *"@127.0.0.1"* ]]; then
  if ! node -e "require('net').connect(5432,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
    command -v docker >/dev/null || blad "Nie znaleziono Postgresa na porcie 5432 ani Dockera, który mógłby go uruchomić.
Zainstaluj Docker Desktop (https://docker.com) albo wpisz w pliku .env adres własnej bazy."

    # Sam plik wykonywalny to za mało — Docker Desktop bywa zainstalowany, ale wyłączony.
    docker info >/dev/null 2>&1 || blad "Docker jest zainstalowany, ale nie działa.
Uruchom Docker Desktop i poczekaj, aż ikona przestanie się animować, a potem odpal to jeszcze raz:

    npm run kokpit"

    krok "Uruchamiam bazę danych w Dockerze"
    docker compose up -d

    printf "   czekam, aż baza będzie gotowa"
    for _ in $(seq 1 40); do
      if node -e "require('net').connect(5432,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
        printf " gotowa\n"
        break
      fi
      printf "."
      sleep 1
    done

    node -e "require('net').connect(5432,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null \
      || blad "Baza nie wstała w 40 sekund. Sprawdź: docker compose logs db"
  fi
fi

# ------------------------------------------------------------ 4. zależności

if [ ! -d node_modules ]; then
  krok "Instaluję zależności (to potrwa chwilę, tylko za pierwszym razem)"
  npm install
fi

# --------------------------------------------------------------- 5. migracje

krok "Zakładam tabele w bazie"
npm run db:migrate --silent

# ------------------------------------------------------------ 6. dane pokazowe

# Seed odpalamy raz — przy pustej bazie. Później dane należą do użytkownika
# i nikt ich nie nadpisuje bez wyraźnej komendy `npm run db:seed-demo`.
LICZBA_KONT="$(node -e "
  const postgres = require('postgres');
  const sql = postgres(process.argv[1]);
  sql\`select count(*)::int as n from users\`
    .then(([r]) => { console.log(r.n); return sql.end(); })
    .catch(() => { console.log('0'); process.exit(0); });
" "$DB_URL" 2>/dev/null || echo 0)"

if [ "$LICZBA_KONT" = "0" ]; then
  krok "Wypełniam bazę danymi pokazowymi"
  npm run db:seed-demo --silent
fi

# ------------------------------------------------------------------ 7. port

# Port 3000 bywa zajęty przez inny projekt — wtedy pod „localhost:3000" otworzy
# się cudza strona i wygląda to, jakby kokpit nie działał. Szukamy wolnego portu
# i wypisujemy dokładny adres, zamiast zakładać, że 3000 jest nasze.
PORT=3000
for kandydat in 3000 3001 3002 3003 3004 3005; do
  if ! node -e "require('net').connect($kandydat,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
    PORT=$kandydat
    break
  fi
done

ADRES="http://localhost:${PORT}"

cat <<INFO

────────────────────────────────────────────────────────────
  Kokpit startuje. Otwórz w przeglądarce:

      ${ADRES}

  ↑ dokładnie ten adres, razem z numerem po dwukropku.
    Sam „localhost" to inna strona.

  Zaloguj się danymi konta pokazowego:

      e-mail:  demo@kokpit.local
      hasło:   demo12345

  Zatrzymanie: Ctrl+C w tym oknie.
────────────────────────────────────────────────────────────

INFO

# ------------------------------------------------------------ 8. przeglądarka

# Otwarcie okna w tle: czekamy, aż serwer odpowie, i dopiero wtedy pokazujemy stronę.
(
  for _ in $(seq 1 60); do
    if node -e "require('net').connect(${PORT},'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
      if command -v open >/dev/null; then open "$ADRES"            # macOS
      elif command -v xdg-open >/dev/null; then xdg-open "$ADRES"  # Linux
      elif command -v explorer.exe >/dev/null; then explorer.exe "$ADRES"  # Windows
      fi
      exit 0
    fi
    sleep 1
  done
) >/dev/null 2>&1 &

npm run dev -- --port "$PORT"
