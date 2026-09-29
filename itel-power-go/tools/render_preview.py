"""Preview render of the POWER GO spot.

Mirrors the timeline in ae/build_power_go.jsx (same shots, timings, scales and
anchors) so the team can review motion before opening After Effects. The AE
project stays the master; this is a draft-quality stand-in.

usage: python3 render_preview.py <package_dir> <out.mp4> [width]
"""
import math
import subprocess
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

PKG, OUT = sys.argv[1], sys.argv[2]
OW = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
FPS, DUR, CW, CH = 30, 20.0, 1920, 1080
K = OW / CW
OH = int(round(CH * K))

RED = (228, 3, 46)
INK = (26, 26, 26)
FONT = PKG + "/fonts/Montserrat-ExtraBold.ttf"

hero = Image.open(PKG + "/footage/product_front_hero.png").convert("RGB")
box = Image.open(PKG + "/footage/box_studio.png").convert("RGB")
handle = Image.open(PKG + "/footage/handle_macro.png").convert("RGB")

HERO_C, HERO_LOGO = (1024, 1024), (1022, 1232)
BOX_C, BOX_SPEC, BOX_EN = (686, 424), (822, 188), (558, 182)
HANDLE_C = (688, 384)


def ease(t, t0, t1, a, b):
    if t <= t0:
        return a
    if t >= t1:
        return b
    p = (t - t0) / (t1 - t0)
    p = p * p * (3 - 2 * p)
    return a + (b - a) * p


def keys(t, ks):
    if t <= ks[0][0]:
        return ks[0][1]
    for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
        if t <= t1:
            return ease(t, t0, t1, v0, v1)
    return ks[-1][1]


def place(canvas, img, anchor, pos, scale, squash=1.0):
    """Draw img so that image point `anchor` lands at comp point `pos`, scaled by `scale` percent."""
    s = scale / 100.0 * K
    sx = s * squash
    px, py = pos[0] * K, pos[1] * K
    # visible source rect
    x0 = anchor[0] - px / sx
    y0 = anchor[1] - py / s
    x1 = anchor[0] + (OW - px) / sx
    y1 = anchor[1] + (OH - py) / s
    cx0, cy0 = max(0, int(math.floor(x0))), max(0, int(math.floor(y0)))
    cx1, cy1 = min(img.width, int(math.ceil(x1))), min(img.height, int(math.ceil(y1)))
    if cx1 <= cx0 or cy1 <= cy0:
        return
    crop = img.crop((cx0, cy0, cx1, cy1))
    w = max(1, int(round((cx1 - cx0) * sx)))
    h = max(1, int(round((cy1 - cy0) * s)))
    crop = crop.resize((w, h), Image.BILINEAR)
    dx = int(round(px + (cx0 - anchor[0]) * sx))
    dy = int(round(py + (cy0 - anchor[1]) * s))
    layer = Image.new("RGB", canvas.size, (255, 255, 255))
    layer.paste(crop, (dx, dy))
    canvas.paste(ImageChops.multiply(canvas, layer))


_font_cache = {}


def font(size):
    size = max(6, int(round(size * K)))
    if size not in _font_cache:
        _font_cache[size] = ImageFont.truetype(FONT, size)
    return _font_cache[size]


def text(canvas, s, size, color, cx, baseline, tracking=0, reveal=1.0, extra=0.0, alpha=1.0, skew=0.0):
    """Centered text with per-letter evolve: letters fade in left to right while tracking tightens."""
    if alpha <= 0:
        return
    f = font(size)
    trk = (tracking + extra * (1 - reveal)) / 1000.0 * size * K
    widths = [f.getlength(c) for c in s]
    total = sum(widths) + trk * (len(s) - 1)
    x = cx * K - total / 2
    asc = f.getmetrics()[0]
    layer = Image.new("L", canvas.size, 0)
    d = ImageDraw.Draw(layer)
    n = len(s)
    for i, c in enumerate(s):
        # ramp-up selector: letter i visible once reveal passes its slot
        a = max(0.0, min(1.0, reveal * (n + 1) - i))
        if a > 0:
            d.text((x, baseline * K - asc), c, font=f, fill=int(255 * a * alpha))
        x += widths[i] + trk
    if skew:
        layer = layer.transform(layer.size, Image.AFFINE, (1, skew, -skew * baseline * K, 0, 1, 0), Image.BILINEAR)
    canvas.paste(Image.new("RGB", canvas.size, color), (0, 0), layer)


def logo(canvas, cx, cy, scale, alpha, on_dark=False):
    """Vector itel Energy lockup, same geometry as the LOGO_itel_Energy precomp (1400x420)."""
    if alpha <= 0:
        return
    s = scale / 100.0
    ox, oy = cx - 700 * s, cy - 210 * s
    mask = Image.new("L", canvas.size, 0)
    d = ImageDraw.Draw(mask)
    bx, by = ox + 250 * s, oy + 210 * s
    d.ellipse([(bx - 200 * s) * K, (by - 115 * s) * K, (bx + 200 * s) * K, (by + 115 * s) * K], fill=255)
    d.polygon([((bx - 150 * s) * K, (by + 60 * s) * K), ((bx - 190 * s) * K, (by + 128 * s) * K),
               ((bx - 95 * s) * K, (by + 95 * s) * K)], fill=255)
    mask = mask.point(lambda v: int(v * alpha))
    canvas.paste(Image.new("RGB", canvas.size, RED), (0, 0), mask)
    text(canvas, "itel", 150 * s, (255, 255, 255), ox + 250 * s, oy + 262 * s, -10, alpha=alpha)
    text(canvas, "Energy", 190 * s, RED, ox + 900 * s, oy + 278 * s, 0, alpha=alpha, skew=0.21)


def radial_mask(rx, ry, cx, cy, feather, grow):
    m = Image.new("L", (OW, OH), 0)
    d = ImageDraw.Draw(m)
    rx, ry = max(1, (rx + grow) * K), max(1, (ry + grow) * K)
    d.ellipse([cx * K - rx, cy * K - ry, cx * K + rx, cy * K + ry], fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather * K / 2))


def light_sweep(canvas, t, pos, scale):
    """CC Light Sweep stand-in: a soft diagonal band crossing the product 8.0 to 9.4s."""
    if not 8.0 <= t <= 9.5:
        return
    cx_img = keys(t, [(8.0, -300), (9.4, 2350)])
    cx = pos[0] + (cx_img - HERO_C[0]) * scale / 100.0
    band = Image.new("L", (OW, OH), 0)
    d = ImageDraw.Draw(band)
    w = 140 * scale / 100.0 * K
    sk = math.tan(math.radians(25)) * OH
    x = cx * K
    d.polygon([(x - w, 0), (x + w, 0), (x + w - sk, OH), (x - w - sk, OH)], fill=150)
    band = band.filter(ImageFilter.GaussianBlur(w / 2.5))
    canvas.paste(ImageChops.screen(canvas, Image.merge("RGB", (band, band, band))))


def frame(t):
    c = Image.new("RGB", (OW, OH), (255, 255, 255))

    # soft grey edge, expanding to pure white at 14s
    if 5.0 <= t < 17.0:
        hole = radial_mask(820, 520, 960, 540, 420, keys(t, [(14.0, 0), (15.4, 900)]))
        grey = Image.new("RGB", (OW, OH), (236, 236, 238))
        c.paste(grey, (0, 0), ImageChops.invert(hole))

    if 2.0 <= t < 5.0:
        s = keys(t, [(2.0, 112), (5.0, 124)])
        place(c, box, BOX_C, (960, 500), s)
        if t < 4.0:
            op = keys(t, [(2.0, 1.0), (3.8, 0.0)])
            hole = radial_mask(260, 320, 960, 500, 300, keys(t, [(2.0, -300), (3.8, 900)]))
            dark = ImageChops.invert(hole).point(lambda v: int(v * op))
            c.paste(Image.new("RGB", (OW, OH), (0, 0, 0)), (0, 0), dark)
        if t >= 3.3:
            out = keys(t, [(4.75, 1.0), (5.0, 0.0)])
            text(c, "POWER GO", 64, RED, 960, 1000, 120, keys(t, [(3.3, 0), (4.2, 1)]), 80, out)

    if 5.0 <= t < 9.5:
        pos = (960, keys(t, [(5.0, 480), (7.4, 548), (9.5, 540)]))
        s = keys(t, [(5.0, 90), (7.4, 53), (9.5, 55)])
        ry = keys(t, [(5.0, -10), (7.6, 3), (9.5, 0)])
        place(c, hero, HERO_C, pos, s, math.cos(math.radians(ry)))
        light_sweep(c, t, pos, s)
        if 5.6 <= t < 8.0:
            n = int(round(100000 * ease(t, 5.7, 6.9, 0, 1)))
            a = min(keys(t, [(5.6, 0), (5.9, 1)]), keys(t, [(7.75, 1), (8.0, 0)]))
            text(c, "{:,}mAh".format(n), 64, INK, 960, 1000, 40, alpha=a)

    if 9.5 <= t < 11.0:
        place(c, box, BOX_SPEC, (960, 470), keys(t, [(9.5, 330), (11.0, 352)]))
        if t >= 9.6:
            n = int(round(130 * ease(t, 9.6, 10.4, 0, 1)))
            text(c, "{}W".format(n), 120, RED, 960, 1000, 20, alpha=keys(t, [(9.6, 0), (9.8, 1)]))

    if 11.0 <= t < 14.0:
        if t < 11.75:
            place(c, hero, HERO_LOGO, (960, 470), keys(t, [(11.0, 250), (11.75, 266)]))
        elif t < 12.5:
            place(c, box, BOX_EN, (960, 470), keys(t, [(11.75, 380), (12.5, 400)]))
        elif t < 13.25:
            place(c, handle, HANDLE_C, (960, 540), keys(t, [(12.5, 141), (13.25, 150)]))
        else:
            place(c, hero, HERO_C, (960, 520), keys(t, [(13.25, 46), (14.0, 49)]))
        if t >= 11.15:
            text(c, "POWER.", 60, INK, 960, 960, 60, keys(t, [(11.15, 0), (11.6, 1)]), 60)
        if t >= 12.4:
            text(c, "SIMPLIFIED.", 60, RED, 960, 1036, 60, keys(t, [(12.4, 0), (12.95, 1)]), 60)

    if 14.0 <= t < 17.8:
        s = keys(t, [(14.0, 58), (15.2, 47.6), (16.0, 48), (17.8, 47)])
        place(c, hero, HERO_C, (960, 510), s)
        if 14.6 <= t < 17.0:
            text(c, "IESS-320T", 58, INK, 960, 1010, 200, keys(t, [(14.6, 0), (15.4, 1)]), 120,
                 keys(t, [(16.6, 1), (17.0, 0)]))

    if t >= 17.0:
        wop = keys(t, [(17.0, 0), (17.8, 1)])
        c = Image.blend(c, Image.new("RGB", (OW, OH), (255, 255, 255)), wop)
        if t >= 17.9:
            logo(c, 960, 500, keys(t, [(17.9, 62), (18.7, 66)]), keys(t, [(17.9, 0), (18.5, 1)]))
        if t >= 18.8:
            text(c, "POWER GO", 46, INK, 960, 690, 180, keys(t, [(18.8, 0), (19.4, 1)]), 100)
        if t >= 18.9:
            w = 360 * keys(t, [(18.9, 0), (19.7, 1)])
            d = ImageDraw.Draw(c)
            d.rectangle([(960 - 180) * K, (730 - 2.5) * K, (960 - 180 + w) * K, (730 + 2.5) * K], fill=RED)

    if t < 2.0:
        c = Image.new("RGB", (OW, OH), (0, 0, 0))
        if t >= 0.35:
            a = min(keys(t, [(0.35, 0), (1.15, 1)]), keys(t, [(1.7, 1), (2.0, 0)]))
            logo(c, 960, 540, keys(t, [(0.35, 60), (1.9, 64)]), a, on_dark=True)
            if t >= 0.7:
                w = 300 * keys(t, [(0.7, 0), (1.6, 1)])
                la = keys(t, [(1.7, 1), (2.0, 0)])
                col = tuple(int(v * la) for v in RED)
                ImageDraw.Draw(c).rectangle([(960 - 150) * K, (700 - 2.5) * K, (960 - 150 + w) * K, (700 + 2.5) * K], fill=col)
    return c


cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (OW, OH),
       "-r", str(FPS), "-i", "-", "-i", PKG + "/audio/preview_mix.wav", "-c:v", "libx264", "-preset", "medium",
       "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
total = int(DUR * FPS)
for i in range(total):
    p.stdin.write(frame(i / FPS).tobytes())
    if i % 60 == 0:
        print("frame", i, "/", total, flush=True)
p.stdin.close()
p.wait()
print("preview ok", OUT)
