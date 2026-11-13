"""Write the motion-graphics scene pages and their narration: scenes.py <scratchpad>

Outputs video/scenes/<id>.html and video/narration.json ({id: [sentence, ...]}).
Each narration sentence is one cue; element data-cue="i" enters when sentence i starts.
"""
import base64, html, json, os, re, sys

S = sys.argv[1]
V = os.path.join(S, 'video')
OUT = os.path.join(V, 'scenes')
os.makedirs(OUT, exist_ok=True)
TEAM = json.load(open(os.path.join(S, 'report', 'team.json')))
A = json.load(open(os.path.join(S, 'exp', 'analysis.json')))
FIG = os.path.join(S, 'report', 'fig')
v1, v2, b = A['v1'], A['v2'], A['baseline']
NARR = {}


def img(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def scene(sid, lines, body, extra_css='', script=''):
    NARR[sid] = lines
    open(os.path.join(OUT, sid + '.html'), 'w').write(
        f'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../scene.css"><style>{extra_css}</style>'
        f'<div class="stage">{body}</div><script src="../scene.js"></script><script>{script}</script>')


LOGO = '''<svg viewBox="0 0 64 64" width="{s}" height="{s}"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#4fd1ff"/></linearGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#lg)"/><rect x="16" y="34" width="7" height="14" rx="3" fill="#fff"/><rect x="28.5" y="24" width="7" height="24" rx="3" fill="#fff"/><rect x="41" y="16" width="7" height="32" rx="3" fill="#fff" opacity=".9"/></svg>'''

# ---------------------------------------------------------------- 01 opening
names = '　'.join(m['name'] for m in TEAM['members'])
scene('sc01', [
    '大家好，我们组的项目是 DeepCanvas，',
    '一个基于 DeepSeek 大模型的生成式交互界面智能体。',
    '它让大模型把回答，交付为可以直接操作的界面。',
], f'''
<div style="margin:auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:26px">
  <div data-cue="0" style="--anim:pop">{LOGO.format(s=120)}</div>
  <h1 data-cue="0" style="--anim:wipe;--d:.25s;font-size:120px" class="grad">DeepCanvas</h1>
  <div data-cue="1" class="sub" style="font-size:34px;color:#d5d8ee">基于 DeepSeek 大模型的生成式交互界面智能体</div>
  <div data-cue="2" class="sub" style="font-size:26px">把回答交付为可以直接操作的界面</div>
  <div data-cue="2" style="--d:.4s;display:flex;gap:14px;margin-top:30px">
    <span class="chip"><span class="dot"></span>2026（秋）生成式 AI 与大模型技术</span><span class="chip">{TEAM['group']}</span><span class="chip">{names}</span></div>
</div>''')

# ---------------------------------------------------------------- 02 problem
wall = ''.join(f'<div class="ln" style="width:{w}%;--d:{i * .09:.2f}s" data-cue="0"></div>' for i, w in enumerate([92, 86, 97, 74, 90, 83, 95, 60, 88, 93, 79, 85, 70]))
scene('sc02', [
    '今天的大模型助手，回答越完整，文字就越长。',
    '想算一笔账，得到的是公式；想比较几个方案，得到的是长长的列表。',
    '想改一个参数，只能再问一遍，再等一遍。',
    'DeepCanvas 换了一种交付方式：',
    '简单问题用文字回答，有结构的回答直接给出可以操作的界面，完整的成果发布成工作区看板。',
], f'''
<div class="kicker" data-cue="0">问题</div>
<h2 data-cue="0" style="max-width:1100px">回答越完整，文字越长</h2>
<div style="position:relative;flex:1;margin-top:40px">
 <div id="chat" style="position:absolute;left:120px;right:120px;top:0;bottom:0">
  <div class="bubble user" data-cue="0">4 个人吃饭 386 元，加 10% 服务费平分，帮我算一下</div>
  <div class="bubble bot" data-cue="0" style="--d:.3s"><div class="wall">{wall}
    <div class="hl f" data-cue="1">人均 = 386 × (1 + 10%) ÷ 4 = 106.15</div>
    <div class="hl l" data-cue="1" style="--d:.3s">1. 方案 A … 2. 方案 B … 3. 方案 C …</div></div></div>
  <div class="bubble user" data-cue="2">人数改成 5 个呢？</div>
  <div class="bubble bot wait" data-cue="2" style="--d:.5s"><span class="spin"></span>重新生成整段回答…</div>
 </div>
 <div id="forms" style="position:absolute;left:0;right:0;top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px;align-items:center">
  <div class="card form" data-cue="4"><div class="ic">Aa</div><b>文字</b><p>闲聊、简单事实，一两句话说清</p></div>
  <div class="card form hero" data-cue="4" style="--d:.25s"><div class="ic">◧</div><b>回复内交互界面</b><p>计算器、对比、图表、分步演示、模拟、小游戏</p></div>
  <div class="card form" data-cue="4" style="--d:.5s"><div class="ic">▤</div><b>工作区看板</b><p>调研与分析成果：版本、演示、导出</p></div>
 </div>
</div>''', '''
.bubble { max-width: 1000px; border-radius: 24px; padding: 20px 28px; font-size: 27px; margin-bottom: 20px; }
.bubble.user { margin-left: auto; background: linear-gradient(120deg,#5b4bff,#7c6cff); width: fit-content; }
.bubble.bot { background: rgba(255,255,255,.06); border: 1px solid var(--line); width: 1000px; }
.bubble.bot.wait { width: fit-content; }
.wall .ln { height: 13px; border-radius: 7px; background: rgba(255,255,255,.16); margin: 11px 0; }
.wall .hl { font: 600 24px/1.4 "JetBrains Mono","Noto Sans CJK SC"; color: #ffd27a; margin: 10px 0; }
.wait { display: flex; gap: 12px; align-items: center; color: var(--mute); width: fit-content; }
.spin { width: 20px; height: 20px; border-radius: 50%; border: 3px solid rgba(255,255,255,.2); border-top-color: var(--a2); animation: sp 1s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
.form { text-align: center; padding: 60px 34px; } .form b { font-size: 38px; } .form p { font-size: 23px; } .form .ic { font-size: 56px; margin-bottom: 18px; color: #c9c2ff; }
.form.hero { transform: scale(1.06); border-color: rgba(124,108,255,.7); box-shadow: 0 0 60px rgba(124,108,255,.35); }
#forms [data-cue].on { animation-name: pop; }
''', 'window.onCue = { 3: () => { document.getElementById("chat").classList.add("out") } }')

# ---------------------------------------------------------------- 03 team
cards = ''.join(f'''<div class="card tm" data-cue="0" style="--d:{i * .15:.2f}s" data-lit="{i + 1}">
  <div class="av">{m['name'][1:2] if m['name'].startswith('【') else m['name'][:1]}</div><b>{m['name']}</b><div class="role">{m['role']}</div><p>{m['work']}</p></div>''' for i, m in enumerate(TEAM['members']))
scene('sc03', [
    '我们组共有四名成员。',
    '组长负责需求分析、总体设计和产品组装；',
    '一位同学负责交互界面的组件库与流式渲染；',
    '一位同学负责提示词工程和模型评测；',
    '还有一位负责工作区看板、测试，以及报告和视频。',
], f'<div class="kicker" data-cue="0">组员分工</div><h2 data-cue="0">{TEAM["group"]}</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:50px">{cards}</div>', '''
.tm { min-height: 430px; } .tm b { font-size: 28px; } .tm p { font-size: 19px; }
.av { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; font-size: 28px; font-weight: 800; background: linear-gradient(135deg,var(--a1),var(--a2)); margin-bottom: 20px; }
.role { color: var(--a2); font-size: 19px; font-weight: 600; margin-bottom: 14px; }''')

# ---------------------------------------------------------------- 04 architecture
def layer(i, tag, title, sub, boxes, color):
    bx = ''.join(f'<div class="bx{" nw" if new else ""}"><b>{t}</b><p>{p}</p></div>' for t, p, new in boxes)
    return f'<div class="layer" data-cue="{i}" style="--anim:slideL;--c:{color}"><div class="lh"><span class="tag">{tag}</span><b>{title}</b><span class="ls">{sub}</span></div><div class="bxs">{bx}</div></div>'


arch = (layer(1, '浏览器', 'Web 客户端', 'React · 插槽式插件 · 流式渲染', [('对话界面', '会话、输入框、回复流', False), ('回复内交互界面', 'OpenUI 渲染器 · 52 个组件 · 73 个函数', True), ('工作区看板', '报告 / 幻灯片 · 版本 · 演示 · 导出', True)], '#7c6cff')
        + '<div class="pipe" data-cue="2"><i></i><i></i><i></i></div>'
        + layer(2, '本地服务', 'Agent 运行时', 'Cordis 全插件架构 · 会话日志', [('Agent 循环', '组装请求 · 流式接收 · 工具执行', False), ('系统提示词', '组件参考自动生成 · 可前缀缓存', True), ('工具', '看板发布 · 联网检索 · 任务清单', True), ('会话日志', '追加写入 · 刷新可恢复', False)], '#34d399')
        + '<div class="pipe" data-cue="3"><i></i><i></i><i></i></div>'
        + layer(3, '大模型', 'DeepSeek-V4.1-Flash', '1M 上下文 · 推理模式 · 前缀缓存', [('理解与规划', '选择回答形式', False), ('生成 OpenUI Lang', '声明式界面，流式输出', False), ('调研与工具调用', '检索、整理、发布看板', False)], '#ff9f5a'))
scene('sc04', [
    '技术上，系统分为三层。',
    '最上层是浏览器中的 Web 客户端，我们新增了回复内交互界面和工作区看板两个插件。',
    '中间是本地运行的 Agent 服务，负责组装提示词、调用工具，并把每一步写入会话日志。',
    '底层是 DeepSeek-V4.1-Flash 大模型。',
    '整个项目新增了七个插件包，对上游框架只加了两个通用扩展点，没有改动 Agent 的主循环。',
], f'''<div class="kicker" data-cue="0">技术路线</div><h2 data-cue="0" style="font-size:46px;margin-bottom:28px">三层架构</h2>{arch}
<div class="stats" data-cue="4" style="--anim:pop"><span><em>7</em>个新插件包</span><span><em>2</em>个上游扩展点</span><span><em>0</em>处主循环改动</span></div>''', '''
.layer { border-radius: 22px; padding: 20px 24px; background: rgba(255,255,255,.04); border: 1px solid var(--line); border-left: 4px solid var(--c); }
.lh { display: flex; align-items: baseline; gap: 14px; margin-bottom: 12px; } .lh b { font-size: 27px; } .ls { color: var(--mute); font-size: 18px; }
.tag { font-size: 14px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: var(--c); color: #0b0d17; }
.bxs { display: flex; gap: 12px; } .bx { flex: 1; padding: 16px 18px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid var(--line); }
.bx b { font-size: 21px; display: block; margin-bottom: 6px; } .bx p { font-size: 17px; color: var(--mute); }
.bx.nw { border-color: rgba(124,108,255,.8); box-shadow: 0 0 24px rgba(124,108,255,.25); }
.pipe { height: 34px; display: flex; justify-content: center; gap: 220px; }
.pipe i { width: 2px; height: 100%; background: linear-gradient(var(--a2), transparent); position: relative; overflow: visible; }
.pipe i::after { content: ""; position: absolute; left: -4px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--a2); box-shadow: 0 0 14px var(--a2); animation: flow 1.4s linear infinite; }
@keyframes flow { from { top: -6px; } to { top: 22px; } }
.stats { position: absolute; right: 96px; top: 84px; display: flex; gap: 14px; }
.stats span { padding: 12px 20px; border-radius: 16px; background: rgba(124,108,255,.16); border: 1px solid rgba(124,108,255,.5); font-size: 18px; }
.stats em { font-style: normal; font-size: 30px; font-weight: 800; margin-right: 6px; color: #fff; }''')

# ---------------------------------------------------------------- 05 principle
steps = [('流式输出', '模型在 Markdown 回复里写 ```openui 代码块'), ('增量渲染', '流式解析器补全未闭合语句，边收边渲染'),
         ('定稿校验', '回答结束后完整校验，出错可一键修正'), ('本地交互', '$状态 与 @函数 在浏览器里计算，不请求模型'), ('提交回传', '提交按钮把界面数值作为新消息发回对话')]
st = ''.join(f'<div class="card st" data-cue="1" style="--d:{i * .12:.2f}s" data-lit="{i + 1}"><div class="n">0{i + 1}</div><b>{t}</b><p>{p}</p></div>' for i, (t, p) in enumerate(steps))
scene('sc05', [
    '核心思路是：模型描述界面，客户端渲染界面。',
    '模型在回复里输出一段 openui 代码块，',
    '客户端不等它结束，就用流式解析器边接收边渲染；',
    '回答结束后，再做一次完整校验；',
    '之后的拖动、勾选、翻页，都在浏览器本地计算，不再请求模型；',
    '只有点击提交，界面上的数值才会作为新消息发回对话。',
], f'''<div class="kicker" data-cue="0">核心原理</div><h2 data-cue="0">模型<span class="grad">描述</span>界面，客户端<span class="grad">渲染</span>界面</h2>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px;margin-top:70px">{st}</div>
<div class="track" data-cue="1"><div class="bar" data-grow="100%" data-grow-cue="5" style="width:0"></div></div>''', '''
.st { min-height: 300px; transition: transform .5s; } .st.lit { transform: translateY(-10px); }
.st .n { font: 800 44px/1 Inter; color: rgba(255,255,255,.18); margin-bottom: 24px; } .st.lit .n { color: var(--a2); }
.st b { font-size: 26px; } .st p { font-size: 18px; }
.track { margin-top: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,.08); overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg,var(--a1),var(--a2)); }''')

# ---------------------------------------------------------------- 06 code -> ui
code = A['example_code']
lines = code.split('\n')[:14]


def hl(line):
    t = html.escape(line)
    t = re.sub(r'(&quot;.*?&quot;)', r'<span class="s">\1</span>', t)
    t = re.sub(r'(\$[A-Za-z_]+)', r'<span class="v">\1</span>', t)
    t = re.sub(r'(@[A-Za-z]+)', r'<span class="f">\1</span>', t)
    t = re.sub(r'^([a-zA-Z_]+)( =)', r'<span class="k">\1</span>\2', t)
    return t


code_html = ''.join(f'<div class="cl" data-cue="0" style="--anim:fade;--d:{.12 * i:.2f}s">{hl(l if len(l) < 86 else l[:84] + "…")}</div>' for i, l in enumerate(lines))
scene('sc06', [
    '这是模型实际生成的一段程序。',
    '一行一条声明：root 是入口，美元符号开头的是界面状态，at 符号开头的是内置函数。',
    '右边，就是它渲染出来的分账工具。',
    f'整段程序只有约 {A["example_chars"]} 个字符，比生成一个 HTML 页面短得多。',
    '组件说明由组件库自动生成，放进系统提示词，可以被前缀缓存反复复用。',
], f'''<div class="kicker" data-cue="0">OpenUI Lang</div><h2 data-cue="0" style="font-size:46px">一行一条声明，边生成边显示</h2>
<div style="display:grid;grid-template-columns:1.12fr .88fr;gap:36px;margin-top:34px;align-items:start">
 <div class="code card mono" data-cue="0" style="--anim:slideL">{code_html}</div>
 <div style="position:relative">
  <img data-cue="2" style="--anim:wipe;width:100%;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5)" src="{img(os.path.join(FIG, 'example-split.png'))}">
  <div class="badge" data-cue="3" style="--anim:pop;left:-20px;bottom:120px"><em data-count="{A['example_chars']}" data-dur="1.2">0</em> 字符</div>
  <div class="badge" data-cue="4" style="--anim:pop;right:-10px;bottom:30px">前缀缓存命中 <em>{v2['cache_mean']}</em></div>
 </div></div>''', '''
.code { font-size: 15px; line-height: 1.7; padding: 22px 24px; white-space: pre; overflow: hidden; color: #cfd3ea; }
.cl .s { color: #ffd27a; } .cl .v { color: #4fd1ff; } .cl .f { color: #ff7ab6; } .cl .k { color: #a99cff; font-weight: 700; }
.lit2 .v, .lit2 .f { text-shadow: 0 0 12px currentColor; }
.badge { position: absolute; padding: 14px 22px; border-radius: 18px; background: rgba(15,17,32,.85); border: 1px solid rgba(124,108,255,.6); font-size: 22px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.badge em { font-style: normal; font-weight: 800; font-size: 34px; color: var(--a2); margin: 0 6px; }''', 'window.onCue = { 1: () => document.querySelector(".code").classList.add("lit2") }')

# ---------------------------------------------------------------- 07 demo divider
scene('sc07', [
    '下面看真实的运行效果。',
    '所有画面都来自连接 DeepSeek 模型的实际录屏，模型生成的过程做了加速。',
], '''<div style="margin:auto 0"><div class="kicker" data-cue="0">Live Demo</div><h1 data-cue="0" style="--anim:wipe">真实模型 · 真实操作</h1>
<div class="sub" data-cue="1" style="margin-top:26px">DeepSeek-V4.1-Flash 实际运行录屏　·　生成过程加速播放</div></div>''')

# ---------------------------------------------------------------- 08 experiment
cats = v2['per_cat']
bars = ''
for i, (c1, c2) in enumerate((a, b) for a, b in zip(v1['per_cat'], cats) if b['cat'] != '简单闲聊'):
    r1, r2 = 100 * c1['clean'] / c1['n'], 100 * c2['clean'] / c2['n']
    bars += f'''<div class="grp"><div class="bars"><div class="b b1" data-axis="y" data-grow="{r1 * 2.6:.0f}px" data-grow-cue="2" style="height:0;--d:{i * .08:.2f}s"><span>{r1:.0f}</span></div>
<div class="b b2" data-axis="y" data-grow="{r2 * 2.6:.0f}px" data-grow-cue="2" style="height:0;--d:{.3 + i * .08:.2f}s"><span>{r2:.0f}</span></div></div><div class="cn">{c2['cat']}</div></div>'''
reduction = 100 * (1 - v2['prose_mean'] / b['chars_mean'])
NARR_EXP = [
    f'我们用七类任务、{A["n"]} 道题，在真实模型上做了两轮评测。',
    f'改进后，需要结构化回答的 {v2["structured_n"]} 道题全部给出了交互界面，闲聊题全部用文字回答。',
    f'第一轮暴露出组件参数不匹配等问题；改进组件库和提示词之后，界面完整显示率从 {v1["clean_rate"]} 提升到 {v2["clean_rate"]}。',
    f'首个界面平均 {v2["first_visual_mean_s"]} 秒出现，系统提示词的前缀缓存命中率平均达到 {v2["cache_mean"]}。',
    f'和不加任何提示词的纯文本回答相比，用户需要阅读的文字平均减少了 {reduction:.0f}%。',
]


def num(text):
    m = re.match(r'([\d.]+)(.*)', str(text))
    return m.group(1), m.group(2)


vr, vrs = num(v2['visual_rate']); cr, crs = num(v2['clean_rate']); ch, chs = num(v2['cache_mean'])
scene('sc08', NARR_EXP, f'''<div class="kicker" data-cue="0">实验效果</div><h2 data-cue="0" style="font-size:46px">{A["n"]} 道题 · 7 类任务 · 两轮真实模型评测</h2>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:34px">
 <div class="card kpi" data-cue="1"><em data-count="{vr}" data-dec="{1 if '.' in vr and not vr.endswith('.0') else 0}" data-post="{vrs}">0</em><p>结构化题目给出交互界面</p></div>
 <div class="card kpi" data-cue="2"><em data-count="{cr}" data-dec="1" data-post="{crs}">0</em><p>界面完整显示（第一轮 {v1['clean_rate']}）</p></div>
 <div class="card kpi" data-cue="3"><em data-count="{v2['first_visual_mean_s']}" data-dec="1" data-post="s">0</em><p>首个界面平均出现时间</p></div>
 <div class="card kpi" data-cue="3" style="--d:.2s"><em data-count="{ch}" data-post="{chs}">0</em><p>前缀缓存平均命中率</p></div>
</div>
<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:28px;margin-top:28px;flex:1">
 <div class="card" data-cue="2" style="--anim:fade"><div class="lg"><i class="k1"></i>第一轮 <i class="k2"></i>第二轮 <span style="margin-left:auto">各类任务完整显示率（%）</span></div><div class="chart">{bars}</div></div>
 <div class="card" data-cue="4" style="--anim:slideR"><div class="lg">用户需要阅读的文字（平均字符）</div>
  <div class="hb"><span>纯文本基线</span><div class="hbar g" data-grow="100%" data-grow-cue="4" style="width:0"></div><em data-count-cue="4" data-count="{b['chars_mean']:.0f}">0</em></div>
  <div class="hb"><span>DeepCanvas</span><div class="hbar a" data-grow="{100 * v2['prose_mean'] / b['chars_mean']:.0f}%" data-grow-cue="4" style="width:0;--d:.3s"></div><em data-count-cue="4" data-count="{v2['prose_mean']:.0f}">0</em></div>
  <div class="big" data-cue="4" style="--d:.8s">−{reduction:.0f}%</div></div>
</div>''', '''
.kpi em { display: block; font: 800 58px/1 Inter; background: linear-gradient(100deg,#fff,#a99cff 60%,var(--a2)); -webkit-background-clip: text; color: transparent; margin-bottom: 12px; }
.kpi p { font-size: 18px; }
.lg { display: flex; gap: 10px; align-items: center; color: var(--mute); font-size: 17px; margin-bottom: 12px; }
.lg i { width: 14px; height: 14px; border-radius: 4px; display: inline-block; } .k1 { background: rgba(169,156,255,.45); } .k2 { background: linear-gradient(var(--a2),var(--a1)); }
.chart { display: flex; justify-content: space-around; align-items: flex-end; height: 300px; }
.grp { display: flex; flex-direction: column; align-items: center; gap: 10px; } .bars { display: flex; gap: 6px; align-items: flex-end; height: 262px; }
.b { width: 30px; border-radius: 8px 8px 3px 3px; position: relative; } .b1 { background: rgba(169,156,255,.40); } .b2 { background: linear-gradient(var(--a2),var(--a1)); }
.b span { position: absolute; top: -24px; left: 50%; transform: translateX(-50%); font-size: 14px; color: #dfe2f5; }
.cn { font-size: 16px; color: var(--mute); }
.hb { display: grid; grid-template-columns: 120px 1fr 70px; gap: 12px; align-items: center; margin: 26px 0; font-size: 18px; color: #dfe2f5; }
.hbar { height: 26px; border-radius: 8px; } .hbar.g { background: rgba(255,255,255,.22); } .hbar.a { background: linear-gradient(90deg,var(--a1),var(--a2)); }
.hb em { font-style: normal; font-weight: 700; }
.big { font: 800 84px/1 Inter; color: var(--a2); text-align: right; margin-top: 10px; text-shadow: 0 0 40px rgba(79,209,255,.4); }''')

# ---------------------------------------------------------------- 09 closing
scene('sc09', [
    '总结一下：DeepCanvas 把大模型的回答，从文字变成了界面。',
    '形式由模型按问题选择，界面边生成边显示，交互在本地完成，出错可以一键修正。',
    '接下来，我们计划加入界面状态持久化和联网组件，并扩大评测规模。',
    '谢谢观看。',
], f'''<div class="kicker" data-cue="0">总结</div><h2 data-cue="0">把回答从<span style="color:var(--mute)">文字</span>变成<span class="grad">界面</span></h2>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:50px">
 <div class="card" data-cue="1"><b>按需选择</b><p>文字 · 交互界面 · 工作区看板</p></div>
 <div class="card" data-cue="1" style="--d:.15s"><b>流式渲染</b><p>边生成边显示，无需等待</p></div>
 <div class="card" data-cue="1" style="--d:.3s"><b>本地交互</b><p>调整参数不再请求模型</p></div>
 <div class="card" data-cue="1" style="--d:.45s"><b>可靠安全</b><p>部分出错仍可显示 · 不联网 · 不执行代码</p></div>
</div>
<div class="sub" data-cue="2" style="margin-top:40px">下一步：界面状态持久化 · 经服务端代理的图片与地图 · 更大规模评测与人工评分 · 深度调研流程</div>
<div data-cue="3" style="--anim:pop;margin-top:auto;display:flex;align-items:center;gap:22px">{LOGO.format(s=64)}<span style="font-size:44px;font-weight:800">谢谢观看</span><span class="sub" style="font-size:22px;margin-left:auto">{TEAM['group']}　{names}</span></div>''')

json.dump(NARR, open(os.path.join(V, 'narration.json'), 'w'), ensure_ascii=False, indent=1)
print('scenes:', ', '.join(NARR))
