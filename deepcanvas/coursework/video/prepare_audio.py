"""TTS every narration line separately, then lay lines out with gaps: prepare_audio.py narration.json outdir

narration.json: {segment: [line, ...]}. Writes outdir/<segment>.wav and outdir/timing.json:
{segment: {"cues": [start s of each line], "lines": [[start, end, text]], "duration": s}}.
"""
import asyncio, json, os, subprocess, sys
import edge_tts

VOICE = os.environ.get('VOICE', 'zh-CN-YunxiNeural')
RATE = os.environ.get('RATE', '+4%')
LEAD, GAP, TAIL = 0.6, 0.28, 1.1


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout)


async def tts(text, path):
    sig = path + '.sig'
    if os.path.exists(path) and os.path.exists(sig) and open(sig).read() == text + VOICE + RATE:
        return
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
    open(sig, 'w').write(text + VOICE + RATE)


async def main():
    narration = json.load(open(sys.argv[1])); out = sys.argv[2]
    os.makedirs(os.path.join(out, 'lines'), exist_ok=True)
    timing_path = os.path.join(out, 'timing.json')
    timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {}
    for seg, lines in narration.items():
        t = LEAD; cues = []; spans = []; parts = []
        for i, text in enumerate(lines):
            mp3 = os.path.join(out, 'lines', f'{seg}-{i:02d}.mp3')
            await tts(text, mp3)
            d = dur(mp3)
            cues.append(round(t, 3)); spans.append([round(t, 3), round(t + d, 3), text]); parts.append((t, mp3))
            t += d + GAP
        total = t - GAP + TAIL
        wav = os.path.join(out, f'{seg}.wav')
        inputs = []; filters = []
        for k, (start, mp3) in enumerate(parts):
            inputs += ['-i', mp3]
            filters.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(start * 1000)}|{int(start * 1000)}[a{k}]')
        mix = ''.join(f'[a{k}]' for k in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad=whole_dur={total:.3f}[out]'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters) + ';' + mix, '-map', '[out]', '-t', f'{total:.3f}', '-ar', '48000', wav], check=True)
        timing[seg] = {'cues': cues, 'lines': spans, 'duration': round(total, 3)}
        print(f'{seg}: {len(lines)} lines, {total:.1f}s')
    json.dump(timing, open(timing_path, 'w'), ensure_ascii=False, indent=1)


asyncio.run(main())
