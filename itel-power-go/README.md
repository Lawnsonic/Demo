# itel Energy · POWER GO · IESS-320T (20s spot)

This is a 20 second product spot for the itel Energy POWER GO portable power station. The studio stills were generated with Higgsfield from the original product photos, and the edit is built as a fully editable After Effects project.

## Opening it in After Effects

1. Unzip `itel_POWER_GO_AE.zip` and keep the folder layout as it is.
2. Install `fonts/Montserrat-ExtraBold.ttf`.
3. In After Effects, go to **File > Scripts > Run Script File...** and choose `build_power_go.jsx`.
4. The script builds the `itel POWER GO` folder, the `POWER_GO_Main_20s` comp (1920x1080, 30fps) and the `LOGO_itel_Energy` precomp, then opens the main comp.

`preview/power_go_preview.mp4` is a draft render of the same timeline, so people can review it without opening AE.

## Shot map

| Time | Layers | What happens |
|---|---|---|
| 0:00 to 0:02 | `S01 Black`, `S01 Open Logo`, `S01 Charge Line`, `SFX Click (open)` | Black screen, a soft click, then the logo fades in with a thin red charge line filling underneath. |
| 0:02 to 0:05 | `S02 Box Hero`, `S02 Darkness`, `TXT POWER GO` | Light blooms from the center to reveal the box on white, with one slow push-in. POWER GO resolves letter by letter. No music yet. |
| 0:05 to 0:08 | `S03-04 Hero Product (3D)`, `TXT 100,000mAh` | The shot opens tight on the body, then pulls back so the handle glides into frame while the product turns slightly on Y. The capacity counts up to 100,000mAh. |
| 0:08 to 0:11 | Hero with `CC Light Sweep`, `S04 Box Spec Close-up`, `TXT 130W` | A light sweep crosses the body, then it cuts to the power rating printed on the box. The wattage counts up to 130W and the pulse starts at 8.5s. |
| 0:11 to 0:14 | `S05a` to `S05d`, `TXT POWER.`, `TXT SIMPLIFIED.` | Four centered macro cuts of 0.75s each: the itel mark, the Energy branding, the handle and the full station. |
| 0:14 to 0:17 | `S06 Hero Settle`, `BG Soft Edge`, `TXT IESS-320T` | The product settles dead center with a gentle overshoot, the grey edge expands out to pure white, and the music drops away. |
| 0:17 to 0:20 | `S07 Fade to White`, `S07 End Logo`, `TXT End POWER GO`, `S07 Charge Line`, `SFX Click (final)` | Everything fades to white, the logo lands with a final click, and POWER GO sits underneath a filling red line. |

Scene markers on the main comp match these rows.

## Editing notes

All copy, colors, fonts, file paths and image anchor points live in the `CONFIG` block at the top of `build_power_go.jsx`. You can edit them and re-run the script, or change the comp directly.

- The counters (`100,000mAh`, `130W`) are Source Text expressions. Change the number or unit in the expression, or in `CONFIG` before the build.
- The "evolve" text effect is a Text Animator called **Evolve In** (tracking plus opacity, with a ramp-up range selector). Retime it by sliding the Range Start keys.
- The `LOGO_itel_Energy` logo is built from vector shapes and text, so it stays sharp at any scale. Replace it with the official vector artwork before the final delivery.
- The product stills use the **Multiply** blending mode, so their white studio backgrounds disappear into the white comp.
- The audio comes as separate stems: `audio/sfx_click.wav` and `audio/music_pulse.wav`. Both are synthesized with sox, so they are royalty free. The music drop is also keyframed on the layer's Audio Levels, so you can reshape it in AE.

## Model number

The box prints the model as **IESS-320T**, not JESS-320T. The on-screen text follows the box. If the model name is actually JESS-320T, change `txtModel` in `CONFIG`.

## Rebuilding the package

`tools/package.sh` pulls the Higgsfield stills and this folder, synthesizes the audio (`tools/make_audio.sh`), renders the preview (`tools/render_preview.py`) and writes the zip.
