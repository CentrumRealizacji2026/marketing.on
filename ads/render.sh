#!/bin/bash
# Renderuje wszystkie warianty do PNG (story 1080x1920 i feed 1080x1350).
set -e
cd "$(dirname "$0")"
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
FLAGS="--disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=5000"
mkdir -p previews /tmp/ads-build

for f in v1-jasny-premium v2-oferta-cenowa v3-z-pazurem; do
  # story
  $HS $FLAGS --window-size=1080,1920 --screenshot=previews/$f-story.png "file://$PWD/$f.html" 2>/dev/null
  # feed: podmiana klasy body i wysokości
  sed 's/<body class="story">/<body class="feed">/' $f.html > /tmp/ads-build/$f-feed.html
  cp -r fonts /tmp/ads-build/ 2>/dev/null || true
  $HS $FLAGS --window-size=1080,1350 --screenshot=previews/$f-feed.png "file:///tmp/ads-build/$f-feed.html" 2>/dev/null
done
ls -la previews/
