#!/usr/bin/env bash
# Assembles the After Effects package: pulls the Higgsfield stills, the AE script and
# tools from this repo, synthesizes audio, renders the preview, and zips everything.
#   usage: package.sh <workdir>
set -euo pipefail
W="${1:-$PWD/pkg}"
RAW="https://raw.githubusercontent.com/Lawnsonic/Demo/claude/itel-energy-video-script-ljrbjx/itel-power-go"
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3K0FvzsLZGMOdpCguqX4MazV3wq"
P="$W/itel_POWER_GO_AE"
rm -rf "$P" && mkdir -p "$P"/{footage,audio,fonts,preview,source,tools}

curl -sfL -o "$P/build_power_go.jsx" "$RAW/ae/build_power_go.jsx"
curl -sfL -o "$P/README.md" "$RAW/README.md"
for f in make_audio.sh render_preview.py package.sh; do curl -sfL -o "$P/tools/$f" "$RAW/tools/$f"; done
for f in box itel_mark itel_energy_logo product_handle product_back; do curl -sfL -o "$P/source/$f.png" "$RAW/source/$f.png"; done

# Higgsfield generations (Nano Banana 2, project "itel Energy POWER GO JESS-320T Spot")
curl -sfL -o "$P/footage/product_front_hero.png" "$CDN/hf_20260929_134045_16370a59-8bab-4f5d-b1f5-422c3eabb7d6.png"
curl -sfL -o "$P/footage/box_studio.png"         "$CDN/hf_20260929_134143_adced020-c3a3-4b21-95d4-7b1d008f02a4.png"
curl -sfL -o "$P/footage/handle_macro.png"       "$CDN/hf_20260929_134142_5ac23359-1436-4fdb-ad8b-84af7e564be2.png"

cp /usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf "$P/fonts/"
printf 'Montserrat by Julieta Ulanovsky, SIL Open Font License 1.1 (https://openfontlicense.org).\n' > "$P/fonts/LICENSE.txt"

bash "$P/tools/make_audio.sh" "$P/audio"
python3 "$P/tools/render_preview.py" "$P" "$P/preview/power_go_preview.mp4" 1280

(cd "$W" && rm -f itel_POWER_GO_AE.zip && zip -qr itel_POWER_GO_AE.zip itel_POWER_GO_AE)
ls -la "$W"
echo "package ok"
