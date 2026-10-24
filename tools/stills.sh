#!/bin/bash
# usage: tools/stills.sh name frame frame ...   -> out/name_<frame>.png and a contact sheet out/name.png
name=$1; shift
files=()
for f in "$@"; do npx remotion still src/index.ts Friction out/${name}_$f.png --frame=$f --browser-executable=${REMOTION_BROWSER:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome} >/dev/null 2>&1; files+=(out/${name}_$f.png); done
python3 tools/contact.py out/$name.png "${files[@]}"
