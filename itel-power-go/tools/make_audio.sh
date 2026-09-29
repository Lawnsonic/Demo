#!/usr/bin/env bash
# Synthesizes the spot's sound with sox (no samples, fully royalty free).
#   audio/sfx_click.wav   : the soft "click" used at 0.3s and 18.6s
#   audio/music_pulse.wav : 20s bed, silent until 8.5s, refined electronic pulse,
#                           drops away 14.0-16.4s, soft resolve into the end card
#   audio/preview_mix.wav : everything mixed, used by the preview render
set -euo pipefail
OUT="${1:-audio}"
mkdir -p "$OUT"
T=$(mktemp -d)
R=48000

# Click: short high tick plus a tiny low body, very fast decay
sox -n -r $R -c 1 $T/tick.wav synth 0.03 sine 2600 fade q 0 0.03 0.028 gain -8
sox -n -r $R -c 1 $T/body.wav synth 0.06 sine 180 fade q 0 0.06 0.055 gain -14
sox -m $T/tick.wav $T/body.wav -c 2 "$OUT/sfx_click.wav"

# Pulse section 8.5s -> 14.0s (5.5s): 55 Hz sub pulsing at 2 Hz (120 bpm) + airy shimmer
sox -n -r $R -c 1 $T/sub.wav synth 5.5 sine 55 tremolo 2 100 gain -4
sox -n -r $R -c 1 $T/mid.wav synth 5.5 sine 110 tremolo 2 100 gain -14
sox -n -r $R -c 1 $T/air.wav synth 5.5 sine 1760 tremolo 4 100 gain -34
sox -m $T/sub.wav $T/mid.wav $T/air.wav $T/pulse.wav fade q 1.2 5.5 0.25

# Resolve 16.4s -> 20s (3.6s): open fifth pad, fades out under the end card
sox -n -r $R -c 1 $T/p1.wav synth 3.6 sine 110 gain -12
sox -n -r $R -c 1 $T/p2.wav synth 3.6 sine 165 gain -16
sox -n -r $R -c 1 $T/p3.wav synth 3.6 sine 220 tremolo 1 40 gain -20
sox -m $T/p1.wav $T/p2.wav $T/p3.wav $T/pad.wav fade q 0.6 3.6 1.6

# Place on the 20s timeline
sox $T/pulse.wav $T/pulse_t.wav pad 8.5 6.0
sox $T/pad.wav $T/pad_t.wav pad 16.4 0
sox -m $T/pulse_t.wav $T/pad_t.wav -c 2 "$OUT/music_pulse.wav" trim 0 20 norm -3

# Preview mix with both clicks
sox "$OUT/sfx_click.wav" $T/c1.wav pad 0.3 0
sox "$OUT/sfx_click.wav" $T/c2.wav pad 18.6 0
sox -m "$OUT/music_pulse.wav" $T/c1.wav $T/c2.wav "$OUT/preview_mix.wav" trim 0 20
rm -rf $T
echo "audio ok"
