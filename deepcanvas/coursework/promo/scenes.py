"""Write the Apple-style promo scenes: scenes.py <scratchpad>  -> promo/scenes/*.html + promo/shots.json

Each scene lasts a whole number of bars at 124 BPM. Elements with data-b="beat" enter on
that beat (0 = first beat of the scene); data-o="beat" leaves. Videos start on scene start.
"""
import base64, json, os, sys

S = sys.argv[1]
P = os.path.join(S, 'promo'); OUT = os.path.join(P, 'scenes'); os.makedirs(OUT, exist_ok=True)
FIG = os.path.join(S, 'report', 'fig')
BEAT = 60 / 129.99
A = json.load(open(os.path.join(S, 'exp', 'analysis.json')))
v2 = A['v2']

CSS = r'''
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1600px; height: 900px; overflow: hidden; background: #000; color: #f5f5f7;
  font-family: "Inter Display", "Inter", "Noto Sans CJK SC", sans-serif; -webkit-font-smoothing: antialiased; }
.stage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; perspective: 2200px; }
.h { font-weight: 800; letter-spacing: -0.035em; line-height: 1.04; text-align: center; }
.xl { font-size: 150px; } .l { font-size: 104px; } .m { font-size: 72px; } .s { font-size: 40px; font-weight: 600; letter-spacing: -0.01em; }
.sub { font-size: 30px; font-weight: 500; color: #86868b; letter-spacing: 0; margin-top: 22px; }
.grad { background: linear-gradient(92deg, #ff9f43 0%, #ff4f8b 30%, #b05cff 62%, #3d8bff 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.silver { background: linear-gradient(180deg, #ffffff 30%, #9a9aa0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-b] { opacity: 0; }
[data-b].on { animation: var(--a, rise) var(--t, 0.9s) cubic-bezier(.16,1,.3,1) both; }
[data-o].off { animation: leave .35s ease-in both !important; }
@keyframes rise { from { opacity: 0; transform: translateY(46px); filter: blur(14px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoomin { from { opacity: 0; transform: scale(1.18); filter: blur(18px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes pop { 0% { opacity: 0; transform: scale(.6); filter: blur(10px); } 60% { opacity: 1; transform: scale(1.04); filter: none; } 100% { opacity: 1; transform: none; } }
@keyframes track { from { opacity: 0; letter-spacing: .4em; filter: blur(8px); } to { opacity: 1; letter-spacing: -0.035em; filter: none; } }
@keyframes leave { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateY(-30px); filter: blur(10px); } }
@keyframes riseDevice { from { opacity: 0; transform: translateY(420px) rotateX(38deg) scale(.86); } to { opacity: 1; transform: translateY(0) rotateX(8deg) scale(1); } }
@keyframes settle { from { transform: rotateX(8deg); } to { transform: rotateX(0deg); } }
@keyframes swingIn { from { opacity: 0; transform: translateX(260px) rotateY(-38deg) scale(.9); } to { opacity: 1; transform: translateX(0) rotateY(-16deg); } }
@keyframes push { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes spin { to { transform: rotate(1turn); } }
/* device */
.mac { position: relative; width: 1080px; transform-style: preserve-3d; }
.lid { position: relative; border-radius: 26px; padding: 14px; background: linear-gradient(180deg, #2b2b2e, #111113); box-shadow: 0 0 0 1.5px #3a3a3e inset, 0 60px 120px rgba(0,0,0,.8); }
.lid::after { content: ""; position: absolute; top: 5px; left: 50%; width: 9px; height: 9px; margin-left: -4px; border-radius: 50%; background: #1a1a1d; box-shadow: 0 0 0 1px #2a2a2e; }
.screen { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #fff; }
.screen video, .screen img { display: block; width: 100%; height: 100%; object-fit: cover; }
.base { height: 22px; margin: 0 -70px; border-radius: 0 0 26px 26px / 0 0 18px 18px; background: linear-gradient(180deg, #d9d9de, #9c9ca3 60%, #6d6d73); box-shadow: 0 30px 60px rgba(0,0,0,.6); }
.base::before { content: ""; display: block; width: 180px; height: 8px; margin: 0 auto; border-radius: 0 0 10px 10px; background: #8a8a90; }
.glow { position: absolute; inset: -4px; border-radius: 30px; overflow: hidden; filter: blur(22px); opacity: .85; z-index: -1; }
.glow::before { content: ""; position: absolute; inset: -60%; background: conic-gradient(from 0deg, #ff9f43, #ff4f8b, #b05cff, #3d8bff, #31d0aa, #ff9f43); animation: spin 4s linear infinite; }
.floor { position: absolute; left: 50%; bottom: -120px; width: 1300px; height: 200px; margin-left: -650px; background: radial-gradient(50% 50% at 50% 50%, rgba(120,110,255,.25), transparent 70%); filter: blur(10px); }
'''

JS = r'''
const BEAT = %f;
window.play = () => {
  document.querySelectorAll('video').forEach(v => { v.currentTime = 0; v.play() })
  document.querySelectorAll('[data-b]').forEach(el => setTimeout(() => el.classList.add('on'), parseFloat(el.dataset.b) * BEAT * 1000))
  document.querySelectorAll('[data-o]').forEach(el => setTimeout(() => el.classList.add('off'), parseFloat(el.dataset.o) * BEAT * 1000))
  if (window.extra) window.extra()
}
window.ready = () => Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 3 ? 1 : new Promise(r => v.addEventListener('canplaythrough', r, { once: true }))))
''' % BEAT

shots = []


def img(name):
    return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(FIG, name), 'rb').read()).decode()


def clip(name):
    return f'../clips/{name}.webm'


def scene(sid, bars, body, css=''):
    shots.append({'id': sid, 'bars': bars})
    open(os.path.join(OUT, sid + '.html'), 'w').write(
        f'<!doctype html><meta charset="utf-8"><style>{CSS}{css}</style><div class="stage">{body}</div><script>{JS}</script>')


def device(src, extra_style='', glow=True, anim='riseDevice', t='1.6s', b=0):
    media = f'<video src="{src}" muted playsinline preload="auto"></video>' if src.endswith('.webm') else f'<img src="{src}">'
    return (f'<div class="mac" data-b="{b}" style="--a:{anim};--t:{t};{extra_style}">{"<div class=glow></div>" if glow else ""}'
            f'<div class="lid"><div class="screen">{media}</div></div><div class="base"></div></div>')


LOGO = '''<svg viewBox="0 0 64 64" width="{s}" height="{s}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset=".45" stop-color="#b05cff"/><stop offset="1" stop-color="#3d8bff"/></linearGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/><rect x="16" y="34" width="7" height="14" rx="3" fill="#fff"/><rect x="28.5" y="24" width="7" height="24" rx="3" fill="#fff"/><rect x="41" y="16" width="7" height="32" rx="3" fill="#fff" opacity=".92"/></svg>'''

# 1. opener (2 bars)
scene('p01', 2, '''<div class="h l" data-b="0.0" data-o="4">回答，</div>
<div class="h l grad" data-b="4" style="position:absolute">可以不只是文字。</div>''')
# 2. logo (2 bars)
scene('p02', 2, f'''<div data-b="0" style="--a:pop;--t:1.2s;filter:drop-shadow(0 0 60px rgba(176,92,255,.55))">{LOGO.format(s=170)}</div>
<div class="h xl silver" data-b="2" style="--a:track;--t:1.6s;margin-top:30px">DeepCanvas</div>''')
# 3. device rises with the split-bill tool (2 bars)
scene('p03', 2, f'''<div class="h s" data-b="0" style="position:absolute;top:58px">问一句，得到一个<span class="grad">能用的界面</span>。</div>
<div style="margin-top:120px">{device(clip('split'), 'width:1060px')}</div><div class="floor"></div>''', '.mac.on { animation: riseDevice 1.6s cubic-bezier(.16,1,.3,1) both, settle 2.4s 1.6s ease-out both; }')
# 4. generation streams in (2 bars)
scene('p04', 2, f'''<div style="position:absolute;left:110px;top:250px">
<div class="h l" data-b="0" style="text-align:left">边生成，</div><div class="h l grad" data-b="2" style="text-align:left">边出现。</div>
<div class="sub" data-b="4" style="text-align:left">界面随模型输出，一块一块亮起来。</div></div>
<div style="position:absolute;right:-160px;top:170px">{device(clip('stream'), 'width:980px', anim='swingIn', t='1.4s')}</div>''')
# 5. montage (4 bars): six full-bleed shots, 2 beats each, then the grid
tiles = [('g-split.png', '计算。'), ('g-chart.png', '图表。'), ('g-sort.png', '演示。'), ('g-physics.png', '模拟。'), ('g-24.png', '游戏。'), ('g-board.png', '调研。')]
montage = ''.join(f'''<div class="cut" data-b="{i * 2}" data-o="{i * 2 + 2}" style="--a:fade;--t:.01s"><img src="{img(f)}"><div class="h xl word">{w}</div></div>''' for i, (f, w) in enumerate(tiles))
grid = ''.join(f'<div class="tile" data-b="{12 + i * 0.25}" style="--a:pop;--t:.7s"><img src="{img(f)}"><span>{w}</span></div>' for i, (f, w) in enumerate(tiles))
scene('p05', 4, f'{montage}<div class="grid">{grid}</div>', '''
.cut { position: absolute; inset: 0; background: #000; }
.cut img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; filter: brightness(.55); animation: push 1.2s linear both; }
.cut.on img { animation: push 1.1s ease-out both; }
.word { position: absolute; left: 90px; bottom: 70px; text-align: left; text-shadow: 0 10px 60px rgba(0,0,0,.6); }
.cut.off { animation: none !important; opacity: 0 !important; }
.grid { position: absolute; inset: 70px 90px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.tile { position: relative; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.tile img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.tile span { position: absolute; left: 18px; bottom: 12px; font-size: 34px; font-weight: 800; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,.8); }
.tile::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 55%, rgba(0,0,0,.55)); }''')
# 6-9. feature shots (2 bars each)
def feature(sid, title, sub, name, side='left'):
    text = f'''<div style="position:absolute;{side}:110px;top:300px;width:520px">
<div class="h m" data-b="0" style="text-align:left">{title}</div><div class="sub" data-b="1.5" style="text-align:left">{sub}</div></div>'''
    pos = 'right:-120px' if side == 'left' else 'left:-120px'
    rot = '-14deg' if side == 'left' else '14deg'
    dev = f'<div style="position:absolute;{pos};top:150px;transform:rotateY({rot})">{device(clip(name), "width:1020px", anim="zoomin", t="1.2s")}</div>'
    scene(sid, 2, text + dev)


feature('p06', '拖一下，<br><span class="grad">立刻重算。</span>', '全部计算在浏览器本地完成，不再请求模型。', 'slider')
feature('p07', '每一步，<br><span class="grad">代码同步高亮。</span>', '方块怎么换，代码就跑到哪一行。', 'code', side='right')
feature('p08', '出错了？<br><span class="grad">一键修正。</span>', '能显示的部分照常显示，问题交给模型重写。', 'repair')
feature('p09', '调研，<br><span class="grad">直接成板。</span>', '联网检索、标注来源，发布成可演示的看板。', 'board', side='right')
# 10. stats (3 bars, one number per bar)
stats = [(v2['visual_rate'].replace('.0%', '%'), '结构化问题，都给出界面'), (v2['clean_rate'], '界面完整显示'), (v2['cache_mean'], '提示词缓存命中')]
st = ''.join(f'''<div class="stat" data-b="{i * 4}" data-o="{i * 4 + 4}" style="--a:zoomin;--t:.8s"><div class="h grad big" data-n="{n}">{n}</div><div class="sub">{t}</div></div>''' for i, (n, t) in enumerate(stats))
scene('p10', 3, st, '.stat { position: absolute; text-align: center; } .big { font-size: 230px; letter-spacing: -0.05em; } .stat.off { animation: none !important; opacity: 0 !important; }')
# 11. build: one word per beat (1 bar)
words = ['本地运行。', '沙箱隔离。', 'DeepSeek 驱动。']
scene('p11', 1, ''.join(f'<div class="h l w" data-b="{i}" data-o="{i + 1}" style="--a:fade;--t:.05s">{w}</div>' for i, w in enumerate(words)),
      '.w { position: absolute; } .w.off { animation: none !important; opacity: 0 !important; }')
# 12. final drop: tilted wall of everything (2 bars)
wall_items = [clip('game'), img('g-chart.png'), clip('physics'), img('g-sort.png'), clip('split'), img('g-board.png'), clip('code'), img('g-24.png'), img('g-form.png'), clip('slider'), img('g-physics.png'), img('g-split.png')]
wall = ''.join((f'<div class="w"><video src="{s}" muted playsinline preload="auto"></video></div>' if s.endswith('.webm') else f'<div class="w"><img src="{s}"></div>') for s in wall_items)
scene('p12', 2, f'<div class="wall" data-b="0" style="--a:fade;--t:.3s">{wall}</div><div class="veil" data-b="3.5" style="--a:fade;--t:.6s"></div><div class="h l" data-b="4" style="position:absolute;text-shadow:0 10px 80px #000">一切，<span class="grad">尽在回复之中。</span></div>', '''
.wall { position: absolute; left: -300px; top: -400px; width: 2400px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; transform: rotateX(32deg) rotateZ(-14deg); animation: drift 4s linear both; }
.wall.on { animation: fade .3s both, drift 4.2s linear both; }
@keyframes drift { from { transform: rotateX(32deg) rotateZ(-14deg) translateY(0); } to { transform: rotateX(32deg) rotateZ(-14deg) translateY(-260px); } }
.veil { position: absolute; inset: 0; background: radial-gradient(60% 45% at 50% 50%, rgba(0,0,0,.92), rgba(0,0,0,.55) 70%, rgba(0,0,0,.25)); }
.w { aspect-ratio: 16/10; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 30px 80px rgba(0,0,0,.7); }
.w img, .w video { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; filter: brightness(.8); }''')
# 13. end card (2 bars + tail)
scene('p13', 2, f'''<div data-b="0" style="--a:pop;--t:1.2s;filter:drop-shadow(0 0 70px rgba(176,92,255,.5))">{LOGO.format(s=120)}</div>
<div class="h l silver" data-b="1" style="margin-top:26px">DeepCanvas</div>
<div class="h s" data-b="3" style="margin-top:18px;color:#d2d2d7">把回答，变成<span class="grad">界面</span>。</div>
<div class="sub" data-b="6" style="font-size:22px;margin-top:60px">基于 DeepSeek 大模型</div>''')

json.dump({'beat': BEAT, 'tail': 3.0, 'shots': shots}, open(os.path.join(P, 'shots.json'), 'w'), indent=1)
print(sum(s['bars'] for s in shots), 'bars')
