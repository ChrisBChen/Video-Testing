#!/bin/bash
# usage: tools/stills.sh name sec sec ...   -> renders stills at those times (seconds) and a contact sheet out/name.png
name=$1; shift
files=()
for t in "$@"; do f=$(python3 -c "print(round($t*30))"); npx remotion still src/index.ts Tunnel out/${name}_$t.png --frame=$f --gl=swangle --browser-executable=${REMOTION_BROWSER:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome} >/dev/null 2>&1; files+=(out/${name}_$t.png); done
python3 tools/contact.py out/$name.png "${files[@]}"
