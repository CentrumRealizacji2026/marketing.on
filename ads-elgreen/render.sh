#!/bin/bash
# Renderuje podglady (previews/) oraz finalne pliki kampanii do ../reklamy/elg (1x i 2x).
set -e
cd "$(dirname "$0")"
HS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -1)
[ -x "$HS" ] || HS=/opt/pw-browsers/chromium
FLAGS="--disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=6000"
ROOT=../reklamy/elg
mkdir -p previews /tmp/elg-build
cp -r fonts /tmp/elg-build/ 2>/dev/null || true

variant() { # $1 plik.html  $2 klasa-body  $3 WxH  $4 wyjscie.png  $5 scale
  local src=$1 cls=$2 size=$3 out=$4 scale=${5:-1}
  local w=${size%x*} h=${size#*x}
  if [ "$cls" = "story" ]; then
    local page="$PWD/$src"
  else
    sed "s/<body class=\"story\">/<body class=\"$cls\">/" $src > /tmp/elg-build/${src%.html}-$cls.html
    local page="/tmp/elg-build/${src%.html}-$cls.html"
  fi
  $HS $FLAGS --force-device-scale-factor=$scale --window-size=$w,$h --screenshot=$out "file://$page" 2>/dev/null
}

# paczka Meta: kazda kreacja w 3 formatach, 1x + 2x, plus podglady
render_ad() { # $1 katalog-docelowy (np. 1/A)  $2 prefiks pliku (np. elg-1A)  $3 zrodlo.html
  local dir=$1 pfx=$2 src=$3
  mkdir -p "$ROOT/$dir"
  variant $src story  1080x1920 previews/${src%.html}-story.png
  variant $src feed   1080x1350 previews/${src%.html}-feed.png
  variant $src square 1080x1080 previews/${src%.html}-square.png
  variant $src story  1080x1920 "$ROOT/$dir/$pfx-story-9x16-1080x1920.png" 1
  variant $src story  1080x1920 "$ROOT/$dir/$pfx-story-9x16-2160x3840.png" 2
  variant $src feed   1080x1350 "$ROOT/$dir/$pfx-feed-4x5-1080x1350.png" 1
  variant $src feed   1080x1350 "$ROOT/$dir/$pfx-feed-4x5-2160x2700.png" 2
  variant $src square 1080x1080 "$ROOT/$dir/$pfx-feed-1x1-1080x1080.png" 1
  variant $src square 1080x1080 "$ROOT/$dir/$pfx-feed-1x1-2160x2160.png" 2
}

render_ad 1/A elg-1A el1a-czat.html
render_ad 1/B elg-1B el1b-oferta.html
render_ad 2   elg-2  el2-proces.html
render_ad 3   elg-3  el3-typograficzna.html
ls -R "$ROOT"
