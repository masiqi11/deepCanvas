"""Edit the demo video: build_video2.py <scratchpad> <out.mp4>

Inputs: video/plan.json (edit list), video/audio/<id>.wav + timing.json (narration),
video/rec-scenes/<id> (motion scenes), video/rec-live (screencast with marks),
video/music/pad-fx.wav (music bed). Live clips sit in a rounded window on a dark
backdrop with a chapter label; sped-up clips carry a speed badge; sections fade;
music ducks under the voice; subtitles are burned in and also written as SRT.
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S, OUT = sys.argv[1], sys.argv[2]
V = os.path.join(S, 'video')
W = os.path.join(V, 'work2')
os.makedirs(W, exist_ok=True)
PLAN = json.load(open(os.path.join(V, 'plan.json')))['items']
TIMING = json.load(open(os.path.join(V, 'audio', 'timing.json')))
FPS = 30
WIN = (208, 122, 1504, 846)  # x, y, w, h of the window on the 1920x1080 canvas
FONT_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FONT_R = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f'failed: {" ".join(cmd)[:400]}\n{p.stderr[-2500:]}')
    return p.stdout


def dur(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())


# ------------------------------------------------------------------ graphics
def backdrop():
    path = os.path.join(W, 'backdrop.png')
    if os.path.exists(path):
        return path
    img = Image.new('RGB', (1920, 1080), (7, 9, 20))
    glow = Image.new('RGB', (1920, 1080), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((1100, -500, 2300, 500), fill=(70, 58, 170))
    d.ellipse((-400, 700, 700, 1500), fill=(20, 90, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    img = Image.blend(img, glow, 0.55)
    img.save(path)
    return path


def frame_overlay():
    """Backdrop with a rounded transparent hole and a soft border, laid over the clip."""
    path = os.path.join(W, 'frame.png')
    if os.path.exists(path):
        return path
    x, y, w, h = WIN
    base = Image.open(backdrop()).convert('RGBA')
    mask = Image.new('L', (1920, 1080), 255)
    ImageDraw.Draw(mask).rounded_rectangle((x, y, x + w, y + h), radius=22, fill=0)
    base.putalpha(mask)
    ring = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle((x - 1, y - 1, x + w + 1, y + h + 1), radius=23, outline=(255, 255, 255, 46), width=2)
    out = Image.alpha_composite(base, ring)
    shadow = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x + 10, y + 26, x + w - 10, y + h + 30), radius=30, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    shadow.putalpha(Image.composite(shadow.getchannel('A'), Image.new('L', (1920, 1080), 0), mask))
    out = Image.alpha_composite(out, shadow)
    out.save(path)
    return path


def label(chapter):
    num, title = chapter
    path = os.path.join(W, f'label-{num}.png')
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f_num = ImageFont.truetype(FONT_B, 34)
    f_title = ImageFont.truetype(FONT_B, 40)
    f_sub = ImageFont.truetype(FONT_R, 22)
    d.rounded_rectangle((208, 36, 278, 88), radius=14, fill=(124, 108, 255, 255))
    d.text((243, 62), num, font=f_num, fill='white', anchor='mm')
    d.text((298, 61), title, font=f_title, fill=(244, 245, 251), anchor='lm')
    tw = d.textlength(title, font=f_title)
    d.text((298 + tw + 26, 64), '实际运行录屏', font=f_sub, fill=(154, 160, 184), anchor='lm')
    img.save(path)
    return path


def badge(text):
    path = os.path.join(W, f'badge-{re.sub(r"[^0-9a-z]", "", text)}.png')
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT_B, 28)
    x1, y1 = 1712, 35
    tw = d.textlength(text, font=f)
    d.rounded_rectangle((x1 - tw - 64, y1, x1, y1 + 54), radius=27, fill=(15, 17, 32, 225), outline=(79, 209, 255, 200), width=2)
    # play-forward glyph: two triangles
    gx, gy = x1 - tw - 46, y1 + 27
    for k in (0, 14):
        d.polygon([(gx + k, gy - 10), (gx + k + 13, gy), (gx + k, gy + 10)], fill=(79, 209, 255))
    d.text((x1 - 18, y1 + 27), text, font=f, fill='white', anchor='rm')
    img.save(path)
    return path


# ------------------------------------------------------------------ frames
RECS = {}


def recording(name):
    if name not in RECS:
        tl = json.load(open(os.path.join(V, name, 'timeline.json')))
        marks = {}
        for m in tl['marks']:
            marks[m['name']] = m['t']  # later duplicates win: retakes reuse a name
        RECS[name] = (tl, marks)
    return RECS[name]


def mark_time(marks, ref):
    m = re.match(r'^(.*?)([+-]\d+(?:\.\d+)?)?$', ref)
    return marks[m.group(1)] + float(m.group(2) or 0) * 1000


def concat_list(rec_dir, frames, t0, t1, scale, path):
    picked = []
    before = [f for f in frames if f['t'] <= t0]
    if before:
        picked.append({'file': before[-1]['file'], 't': t0})
    last = picked[0]['t'] if picked else t0
    for f in frames:
        if t0 < f['t'] < t1 and (f['t'] - last) / 1000 / scale >= 0.98 / FPS:
            picked.append(f)
            last = f['t']
    lines, total = ['ffconcat version 1.0'], 0.0
    for i, f in enumerate(picked):
        nxt = picked[i + 1]['t'] if i + 1 < len(picked) else t1
        d = max((nxt - f['t']) / 1000 / scale, 0.001)
        total += d
        lines += [f"file '{os.path.join(rec_dir, f['file'])}'", f'duration {d:.4f}']
    lines.append(f"file '{os.path.join(rec_dir, picked[-1]['file'])}'")
    open(path, 'w').write('\n'.join(lines) + '\n')
    return total


def fades(length, item):
    out = []
    if item.get('fade_in'):
        out.append('fade=t=in:st=0:d=0.45')
    if item.get('fade_out'):
        out.append(f'fade=t=out:st={max(length - 0.45, 0):.3f}:d=0.45')
    return out


def encode(idx, item):
    out = os.path.join(W, f'{idx:03d}-{item["id"]}.mp4')
    wav = os.path.join(V, 'audio', f'{item["id"]}.wav')
    alen = dur(wav)
    lst = os.path.join(W, f'{idx:03d}.txt')
    if item['kind'] == 'scene':
        rec = os.path.join(V, 'rec-scenes', item['id'])
        tl = json.load(open(os.path.join(rec, 'timeline.json')))
        marks = {m['name']: m['t'] for m in tl['marks']}
        vlen = concat_list(rec, tl['frames'], marks['start'], marks['end'], 1.0, lst)
        length = max(vlen, alen)
        vf = ['scale=1920:1080:flags=lanczos', f'fps={FPS}', f'tpad=stop_mode=clone:stop_duration={max(length - vlen, 0):.3f}'] + fades(length, item) + ['format=yuv420p']
        run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav, '-filter_complex',
             f'[0:v]{",".join(vf)}[v];[1:a]apad,atrim=0:{length:.3f}[a]', '-map', '[v]', '-map', '[a]', '-t', f'{length:.3f}',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-c:a', 'pcm_s16le', '-ar', '48000', out.replace('.mp4', '.mov')])
        return out.replace('.mp4', '.mov'), length, 1.0
    rec_name = item.get('rec', 'rec-live')
    live, live_marks = recording(rec_name)
    t0, t1 = mark_time(live_marks, item['from']), mark_time(live_marks, item['to'])
    raw = (t1 - t0) / 1000
    scale = item.get('speed') or 1.0
    if item.get('target') == 'audio':
        scale = max(raw / (alen + 0.4), 1.0)
    elif isinstance(item.get('target'), (int, float)):
        scale = max(raw / item['target'], 1.0)
    vlen = concat_list(os.path.join(V, rec_name), live['frames'], t0, t1, scale, lst)
    length = max(vlen, alen + 0.3)
    x, y, w, h = WIN
    img = ['-framerate', str(FPS), '-loop', '1', '-i']
    inputs = ['-f', 'concat', '-safe', '0', '-i', lst, *img, backdrop(), *img, frame_overlay(), *img, label(item['chapter'])]
    graph = (f'[0:v]scale={w}:{h}:flags=lanczos,fps={FPS},tpad=stop_mode=clone:stop_duration={max(length - vlen, 0):.3f}[clip];'
             f'[1:v][clip]overlay={x}:{y}:shortest=1[a];[a][2:v]overlay=0:0:shortest=1[b];[b][3:v]overlay=0:0:shortest=1[c]')
    last = 'c'
    if item.get('badge') and scale >= 1.5:
        inputs += [*img, badge(f'{scale:.0f}× 加速' if scale >= 2 else f'{scale:.1f}× 加速')]
        graph += f';[c][4:v]overlay=0:0:shortest=1[d]'
        last = 'd'
    post = [f'fps={FPS}'] + fades(length, item) + ['format=yuv420p']
    graph += f';[{last}]{",".join(post)}[v]'
    ai = len([a for a in inputs if a == '-i'])
    inputs += ['-i', wav]
    graph += f';[{ai}:a]adelay=0|0,apad,atrim=0:{length:.3f}[aa]'
    run(['ffmpeg', '-y', *inputs, '-filter_complex', graph, '-map', '[v]', '-map', '[aa]', '-t', f'{length:.3f}',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-c:a', 'pcm_s16le', '-ar', '48000', out.replace('.mp4', '.mov')])
    print(f'{item["id"]}: raw {raw:.1f}s x{scale:.1f} -> {vlen:.1f}s (voice {alen:.1f}s) = {length:.1f}s')
    return out.replace('.mp4', '.mov'), length, scale


# ------------------------------------------------------------------ subtitles
def chunks(text, start, end, limit=24):
    parts, cur = [], ''
    for piece in re.split(r'(?<=[，。；：！？、])', text):
        if len(cur) + len(piece) > limit and cur:
            parts.append(cur); cur = piece
        else:
            cur += piece
    if cur:
        parts.append(cur)
    total = sum(len(p) for p in parts)
    t, out = start, []
    for p in parts:
        d = (end - start) * len(p) / total
        out.append((t, t + d, p.strip().rstrip('，。；、')))
        t += d
    return out


def ts(t, sep=','):
    return f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}{sep}{int(t * 1000 % 1000):03d}'


def ass_ts(t):
    return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def main():
    only = os.environ.get('ONLY')
    parts, subs, clock, speeds = [], [], 0.0, []
    for idx, item in enumerate(PLAN):
        if only and item['id'] not in only.split(','):
            continue
        cached = os.path.join(W, f'{idx:03d}-{item["id"]}.mov')
        prev = {k: sp for k, sp, _ in json.load(open(os.path.join(W, 'edl-result.json')))['parts']} if os.path.exists(os.path.join(W, 'edl-result.json')) else {}
        if os.path.exists(cached) and item['id'] in prev and item['id'] not in os.environ.get('FORCE', '').split(','):
            path, length, scale = cached, dur(cached), prev[item['id']]
        else:
            path, length, scale = encode(idx, item)
        parts.append(path)
        for a, b, text in TIMING[item['id']]['lines']:
            subs += [(clock + x, clock + y, z) for x, y, z in chunks(text, a, b)]
        speeds.append((item['id'], round(scale, 1), round(length, 1)))
        clock += length
    lst = os.path.join(W, 'all.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    joined = os.path.join(W, 'joined.mov')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined])
    total = dur(joined)
    ass = os.path.join(W, 'subs.ass')
    head = ('[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\n'
            'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
            'Style: Default,Noto Sans CJK SC,40,&H00FFFFFF,&H000000FF,&H64000000,&H00000000,1,0,0,0,100,100,1,0,1,2,0,2,80,80,26,1\n\n'
            '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
    open(ass, 'w').write(head + ''.join(f'Dialogue: 0,{ass_ts(a)},{ass_ts(b)},Default,,0,0,0,,{{\\fad(120,120)}}{t}\n' for a, b, t in subs))
    srt = os.path.splitext(OUT)[0] + '.srt'
    open(srt, 'w').write(''.join(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n' for i, (a, b, t) in enumerate(subs, 1)))
    music = os.path.join(V, 'music', 'pad-fx.wav')
    graph = (f'[1:a]volume=0.32,afade=t=in:d=3,afade=t=out:st={max(total - 4, 0):.2f}:d=4[m];'
             '[0:a]asplit=2[voice][key];'
             '[m][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[duck];'
             '[voice][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]')
    run(['ffmpeg', '-y', '-i', joined, '-stream_loop', '-1', '-i', music, '-filter_complex', f'[0:v]ass={ass}[v];' + graph,
         '-map', '[v]', '-map', '[a]', '-t', f'{total:.3f}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT])
    json.dump({'parts': speeds, 'total': total}, open(os.path.join(W, 'edl-result.json'), 'w'), ensure_ascii=False, indent=1)
    print('video', OUT, f'{dur(OUT):.1f}s')


main()
