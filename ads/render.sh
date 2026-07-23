#!/bin/bash
# Renderuje podglady (previews/) oraz paczke pod Meta Ads (meta/) w 1x i 2x.
set -e
cd "$(dirname "$0")"
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
FLAGS="--disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=6000"
mkdir -p previews meta /tmp/ads-build
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
variant v4-rozmowa-z-nami.html story  1080x1920 meta/marketingon-story-9x16-1080x1920.png 1
variant v4-rozmowa-z-nami.html story  1080x1920 meta/marketingon-story-9x16-2160x3840.png 2
variant v4-rozmowa-z-nami.html feed   1080x1350 meta/marketingon-feed-4x5-1080x1350.png 1
variant v4-rozmowa-z-nami.html feed   1080x1350 meta/marketingon-feed-4x5-2160x2700.png 2
variant v4-rozmowa-z-nami.html square 1080x1080 meta/marketingon-feed-1x1-1080x1080.png 1
variant v4-rozmowa-z-nami.html square 1080x1080 meta/marketingon-feed-1x1-2160x2160.png 2
ls previews/ meta/
