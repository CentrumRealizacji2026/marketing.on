#!/bin/bash
# Renderuje podglady (previews/) oraz finalne pliki kampanii do ../reklamy/mon/www/1 (A i B, 1x i 2x).
set -e
cd "$(dirname "$0")"
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
FLAGS="--disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=6000"
OUT=../reklamy/mon/www/1
mkdir -p previews "$OUT/A" "$OUT/B" /tmp/ads-build
cp -r fonts /tmp/ads-build/ 2>/dev/null || true

variant() { # $1 plik.html  $2 klasa-body  $3 WxH  $4 wyjscie.png  $5 scale
  local src=$1 cls=$2 size=$3 out=$4 scale=${5:-1}
  local w=${size%x*} h=${size#*x}
  if [ "$cls" = "story" ]; then
    local page="$PWD/$src"
  else
    sed "s/<body class=\"story\">/<body class=\"$cls\">/" $src > /tmp/ads-build/${src%.html}-$cls.html
    local page="/tmp/ads-build/${src%.html}-$cls.html"
  fi
  $HS $FLAGS --force-device-scale-factor=$scale --window-size=$w,$h --screenshot=$out "file://$page" 2>/dev/null
}

# podglady robocze
for f in v1-jasny-premium v2-oferta-cenowa v4-rozmowa-z-nami; do
  variant $f.html story 1080x1920 previews/$f-story.png
  variant $f.html feed  1080x1350 previews/$f-feed.png
done
variant v4-rozmowa-z-nami.html square 1080x1080 previews/v4-rozmowa-z-nami-square.png

# paczka Meta: glowna kreacja w 3 formatach, 1x + 2x
variant v4-rozmowa-z-nami.html story  1080x1920 $OUT/A/mon-www-1A-story-9x16-1080x1920.png 1
variant v4-rozmowa-z-nami.html story  1080x1920 $OUT/A/mon-www-1A-story-9x16-2160x3840.png 2
variant v4-rozmowa-z-nami.html feed   1080x1350 $OUT/A/mon-www-1A-feed-4x5-1080x1350.png 1
variant v4-rozmowa-z-nami.html feed   1080x1350 $OUT/A/mon-www-1A-feed-4x5-2160x2700.png 2
variant v4-rozmowa-z-nami.html square 1080x1080 $OUT/A/mon-www-1A-feed-1x1-1080x1080.png 1
variant v4-rozmowa-z-nami.html square 1080x1080 $OUT/A/mon-www-1A-feed-1x1-2160x2160.png 2

# wersja B (test A/B): oferta wprost
variant ad1-wersja-b.html story  1080x1920 previews/ad1-wersja-b-story.png
variant ad1-wersja-b.html feed   1080x1350 previews/ad1-wersja-b-feed.png
variant ad1-wersja-b.html square 1080x1080 previews/ad1-wersja-b-square.png
variant ad1-wersja-b.html story  1080x1920 $OUT/B/mon-www-1B-story-9x16-1080x1920.png 1
variant ad1-wersja-b.html story  1080x1920 $OUT/B/mon-www-1B-story-9x16-2160x3840.png 2
variant ad1-wersja-b.html feed   1080x1350 $OUT/B/mon-www-1B-feed-4x5-1080x1350.png 1
variant ad1-wersja-b.html feed   1080x1350 $OUT/B/mon-www-1B-feed-4x5-2160x2700.png 2
variant ad1-wersja-b.html square 1080x1080 $OUT/B/mon-www-1B-feed-1x1-1080x1080.png 1
variant ad1-wersja-b.html square 1080x1080 $OUT/B/mon-www-1B-feed-1x1-2160x2160.png 2
ls "$OUT/A" "$OUT/B"

# reklamy 2-4 (kalkulator, proces, typograficzna) -> reklamy/mon/www/{2,3,4}
ROOT=../reklamy/mon/www
render_ad() { # $1 nr  $2 zrodlo.html
  local n=$1 src=$2
  mkdir -p "$ROOT/$n"
  variant $src story  1080x1920 previews/${src%.html}-story.png
  variant $src feed   1080x1350 previews/${src%.html}-feed.png
  variant $src square 1080x1080 previews/${src%.html}-square.png
  variant $src story  1080x1920 "$ROOT/$n/mon-www-$n-story-9x16-1080x1920.png" 1
  variant $src story  1080x1920 "$ROOT/$n/mon-www-$n-story-9x16-2160x3840.png" 2
  variant $src feed   1080x1350 "$ROOT/$n/mon-www-$n-feed-4x5-1080x1350.png" 1
  variant $src feed   1080x1350 "$ROOT/$n/mon-www-$n-feed-4x5-2160x2700.png" 2
  variant $src square 1080x1080 "$ROOT/$n/mon-www-$n-feed-1x1-1080x1080.png" 1
  variant $src square 1080x1080 "$ROOT/$n/mon-www-$n-feed-1x1-2160x2160.png" 2
}
render_ad 2 prop1-kalkulator.html
render_ad 3 prop2-proces.html
render_ad 4 prop4-typograficzna.html
