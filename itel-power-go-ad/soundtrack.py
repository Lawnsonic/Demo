"""Synthesises the 20 s, 120 BPM soundtrack (beat = 0.5 s) so every hit lands on a visual cut."""
import numpy as np, wave

SR, DUR = 44100, 20.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rs = np.random.default_rng(1)

def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414
    R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.414

def smooth(x, k):
    c = np.cumsum(np.insert(x, 0, 0)); y = (c[k:] - c[:-k]) / k
    return np.concatenate([y, np.full(k - 1, y[-1])])

def kick(d=0.35, f0=150, f1=45):
    n = int(SR * d); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, d / 2.5)

def noise(d): return rs.uniform(-1, 1, int(SR * d))
def clap(d=0.25):
    n = noise(d); n = n - smooth(n, 8)
    e = env(len(n), .001, .06)
    for off in (0.01, 0.02): e += np.roll(env(len(n), .001, .01), int(off * SR)) * .6
    return n * e
def hat(d=0.06): n = noise(d); return (n - smooth(n, 3)) * env(len(n), .001, .015)
def tone(f, d, harm=(1,), dec=.3, a=.005):
    n = int(SR * d); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * t) / h for h in harm)
    return s * env(n, a, dec)
def sweep(f0, f1, d, amp_in=True):
    n = int(SR * d); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / d)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * ((t / d) ** 2 if amp_in else np.exp(-t * 3))
def riser(d):
    n = noise(d); k = np.linspace(0, 1, len(n))
    hp = n - smooth(n, 4)
    return hp * k ** 3
def impact(d=2.0):
    n = int(SR * d); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(55 * np.exp(-t * 1.2) + 28) / SR) * np.exp(-t * 1.6)
    nz = smooth(noise(d), 6) * np.exp(-t * 6) * 2
    return sub + nz + np.pad(kick(.5), (0, n - int(SR * .5)))
def pad(freqs, d):
    n = int(SR * d); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.12):
            s += sum(np.sin(2 * np.pi * (f + det) * h * t + h) / (h * 1.4) for h in (1, 2, 3, 4))
    e = np.minimum(1, t / .25) * np.minimum(1, (d - t) / .3)
    return s * e / len(freqs)

A, F, C, G = [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]
BASS = {0: 55, 1: 43.65, 2: 65.41, 3: 49.0}

# 0-2: low battery beeps, heartbeat, glitch
for t0 in (.3, .9, 1.5): put(tone(880, .12, (1, 3), .05), t0, .25); put(tone(660, .12, (1, 3), .05), t0 + .13, .2)
for t0 in (0, .27, .9, 1.17): put(kick(.25, 90, 40), t0, .5)
put(noise(.2) * env(int(SR * .2), .001, .05), 1.8, .25)

# 2-5: slam hits on each word + riser
for i, t0 in enumerate((2, 2.5, 3, 3.5, 4, 4.5)):
    put(kick(), t0, .9); put(clap(), t0, .35, (-.3 if i % 2 else .3))
    put(noise(.08) * env(int(SR * .08), .001, .02), t0, .3)
put(riser(2.0), 3.0, .45); put(sweep(150, 1400, 2.0), 3.0, .12)

# 5: drop
put(impact(), 5.0, 1.0)

# 5-16.5 groove
for b in range(int((16.5 - 5) / .5)):
    t0 = 5 + b * .5
    put(kick(), t0, .85)
    if b % 2: put(clap(), t0, .4)
    put(hat(), t0 + .25, .25, .4)
    put(hat(.03), t0 + .125, .1, -.4); put(hat(.03), t0 + .375, .1, -.4)
    bar = int((t0 - 5) // 2) % 4
    f = BASS[bar]
    put(tone(f, .24, (1, 2, 3, 4, 5), .12, .01), t0 + .25, .45)
for bar in range(6):
    t0 = 5 + bar * 2
    if t0 >= 16.5: break
    put(pad([A, F, C, G][bar % 4], min(2, 16.5 - t0)), t0, .09)

# 9: wipe whoosh + crash
put(riser(.3), 8.72, .5); put(smooth(noise(1.2), 2) * np.exp(-np.arange(int(SR * 1.2)) / SR * 3), 9.0, .35)
# 10-12: charging arpeggio + rising tone, 12: ding
notes = [440, 523.3, 659.3, 783.99, 880, 1046.5, 1318.5, 1568]
for i in range(16): put(tone(notes[i % 8] * (1 if i < 8 else 1), .12, (1, 2), .06), 10 + i * .125, .12, (-.5 if i % 2 else .5))
put(sweep(300, 1200, 2.0), 10.0, .07)
put(tone(1760, 1.5, (1, 1.5, 2.76), .5), 12.0, .3); put(tone(2637, 1.2, (1,), .4), 12.0, .12)
# 13: shutter + slab whooshes
put(riser(.22), 12.78, .5)
for t0 in (13.2, 13.8, 14.4): put(sweep(2400, 300, .3, False) * 0.5 + (noise(.3) - smooth(noise(.3), 20)) * env(int(SR * .3), .001, .08), t0 - .05, .25)
put(riser(.45), 16.05, .6)

# 16.5 end card: impact + sting chord, soft tail
put(impact(2.5), 16.5, .9)
put(pad([110, 220, 329.6, 440, 493.9], 3.5), 16.5, .16)
for t0 in (16.5, 16.5): put(tone(880, 3, (1, 2, 3.01), 1.2), t0, .12, .3); put(tone(1318.5, 3, (1, 2), 1.0), t0, .08, -.3)
for t0 in (17.5, 18.5): put(kick(), t0, .5)
put(tone(1567.98, .5, (1, 2), .15), 18.0, .15)  # CTA pop
put(tone(2093, .4, (1,), .12), 18.08, .1)

# simple reverb send: FFT convolution with decaying noise IR
def reverb(x, d=1.6):
    ir = rs.uniform(-1, 1, int(SR * d)) * np.exp(-np.arange(int(SR * d)) / SR * 3.5)
    ir = smooth(ir, 4)
    m = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
    return y / np.max(np.abs(y))
wl, wr = reverb(L), reverb(R)
L2 = L + wl * np.max(np.abs(L)) * .12; R2 = R + wr * np.max(np.abs(R)) * .12

out = np.stack([L2, R2], 1)
out = np.tanh(out / np.max(np.abs(out)) * 1.6)
t = np.arange(N) / SR
out *= np.minimum(1, (DUR - t) / 1.2)[:, None]
out = out / np.max(np.abs(out)) * 0.89
with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
