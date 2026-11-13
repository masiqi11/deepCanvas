"""Cut Mixkit "Cat Walk" (Arulo, Mixkit Stock Music Free License) to the promo's 28-bar edit at 129.99 BPM.
Segments are source bar ranges; every seam joins bars with the same chord and phrase position."""
import numpy as np, soundfile as sf, json
x, sr = sf.read('catwalk.wav')
BAR = 4 * 60 / 129.99; T0 = 0.01643
plan = [(4, 24), (32, 35), (47, 52), (60, 62)]   # V0-19, V20-22, V23-27, tail
TAIL = 3.0; XF = int(0.012 * sr)
total = 28 * BAR + TAIL
out = np.zeros((int(total * sr) + sr, 2)); pos = 0.0
for a, b in plan:
    s = int((T0 + a * BAR) * sr); n = int((b - a) * BAR * sr)
    seg = x[s - XF: s + n + XF].copy()
    ramp = np.sin(np.linspace(0, np.pi / 2, XF))[:, None]
    seg[:XF] *= ramp; seg[-XF:] *= ramp[::-1]
    i = int(pos * sr)  # out is offset by XF so the pre-roll of the first segment fits
    out[i:i + len(seg)] += seg
    pos += (b - a) * BAR
N = int(total * sr); out = out[XF:XF + N]
fl = int(2.2 * sr); out[-fl:] *= (np.cos(np.linspace(0, np.pi, fl))[:, None] + 1) / 2
sf.write('music2.wav', out, sr, subtype='PCM_24')
print(f'{N / sr:.3f}s')
