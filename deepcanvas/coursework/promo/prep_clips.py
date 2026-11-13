"""Cut screencast ranges into WebM clips of exact lengths for the promo's device shots."""
import json, os, re, subprocess, sys
S = sys.argv[1]; V = os.path.join(S, 'video'); OUT = os.path.join(S, 'promo', 'clips')
BAR = 60 / 124 * 4
CLIPS = {  # name: (recording, from, to, length in seconds)
    'split': ('rec-live', 'd4i', 'd4b', 2 * BAR),
    'stream': ('rec-live', 'd4sent', 'd4done', 2 * BAR),
    'slider': ('rec-live', 'd3slider', 'd3b', 2 * BAR),
    'code': ('rec-walk', 'w1i', 'w1b', 2 * BAR),
    'repair': ('rec-live', 'd8a', 'd8done+1.0', 2 * BAR),
    'board': ('rec-live', 'd9rdone-2.0', 'd10present', 2 * BAR),
    'game': ('rec-live', 'd7i', 'd7b', 2 * BAR),
    'physics': ('rec-live', 'd6j', 'd6c', 2 * BAR),
}
def marks_of(rec):
    tl = json.load(open(os.path.join(V, rec, 'timeline.json'))); m = {}
    for x in tl['marks']: m[x['name']] = x['t']
    return tl, m
def at(m, ref):
    g = re.match(r'^(.*?)([+-]\d+(?:\.\d+)?)?$', ref); return m[g.group(1)] + float(g.group(2) or 0) * 1000
for name, (rec, a, b, length) in CLIPS.items():
    tl, m = marks_of(rec); t0, t1 = at(m, a), at(m, b); scale = (t1 - t0) / 1000 / length
    frames = tl['frames']; picked = [f for f in frames if f['t'] <= t0][-1:]
    picked = [{'file': picked[0]['file'], 't': t0}] if picked else []
    last = t0
    for f in frames:
        if t0 < f['t'] < t1 and (f['t'] - last) / 1000 / scale >= 0.98 / 30:
            picked.append(f); last = f['t']
    lst = os.path.join(OUT, name + '.txt'); lines = ['ffconcat version 1.0']
    for i, f in enumerate(picked):
        nxt = picked[i + 1]['t'] if i + 1 < len(picked) else t1
        lines += [f"file '{os.path.join(V, rec, f['file'])}'", f'duration {(nxt - f["t"]) / 1000 / scale:.4f}']
    lines.append(f"file '{os.path.join(V, rec, picked[-1]['file'])}'")
    open(lst, 'w').write('\n'.join(lines) + '\n')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p',
                    '-t', f'{length + 0.3:.3f}', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '26', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-an',
                    os.path.join(OUT, name + '.webm')], check=True)
    print(name, f'x{scale:.1f}')
