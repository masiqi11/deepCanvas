"""The demo video's edit decision list and narration script: plan.py <scratchpad> writes video/plan.json and video/narration-all.json."""
import json, os, sys

S = sys.argv[1]
V = os.path.join(S, 'video')
scenes = json.load(open(os.path.join(V, 'narration.json')))
A = json.load(open(os.path.join(S, 'exp', 'analysis.json')))

items = []


def scene(sid):
    items.append({'kind': 'scene', 'id': sid, 'say': scenes[sid], 'fade_in': True, 'fade_out': True})


def clip(cid, a, b, say, chapter, *, target=None, speed=1.0, badge=False, fade_in=False, fade_out=False, rec='rec-live'):
    items.append({'kind': 'clip', 'id': cid, 'rec': rec, 'from': a, 'to': b, 'say': say, 'chapter': chapter,
                  'target': target, 'speed': speed, 'badge': badge, 'fade_in': fade_in, 'fade_out': fade_out})


for sid in ('sc01', 'sc02', 'sc03', 'sc04', 'sc05', 'sc06', 'sc07'):
    scene(sid)

C1 = ['01', '先澄清，再给界面']
clip('a1', 'd1a', 'd1sent', ['先从一个开放的问题开始：你能帮我做什么？'], C1, fade_in=True)
clip('a2', 'd1sent', 'd1q', ['问题比较宽泛，模型没有直接长篇大论，而是先用一张卡片问清楚方向。'], C1, target='audio', badge=True)
clip('a3', 'd1q', 'd1qsent', ['我们选择“帮我分析数据”。'], C1)
clip('a4', 'd1qsent', 'd1b', ['模型随即给出一个表单界面：数据形式、想要的结果、补充说明。'], C1, target='audio', badge=True)
clip('a5', 'd2a', 'd2sent+1.0', ['把上半年的销售额填进去，点击开始分析。表单里的数值会随消息一起发回对话。'], C1, fade_out=True)
C2 = ['02', '数据分析：图表 + 情景测算']
clip('b1', 'd3a', 'd3slider', ['回答里有关键指标、趋势折线图和环比明细，结论只用一句话写在最后。'], C2, fade_in=True)
clip('b2', 'd3slider', 'd3b', ['下面还有一个情景测算：拖动下半年的增速，全年合计立刻重新计算，这一步完全在浏览器本地完成，没有再请求模型。'], C2, fade_out=True)
C3 = ['03', '生活计算：分账工具']
clip('c1', 'd4a', 'd4sent', ['再来一个日常问题：四个人吃饭，账单三百八十六元，加百分之十服务费平分。'], C3, fade_in=True)
clip('c2', 'd4sent', 'd4done', ['界面随着模型的输出逐块出现，十几秒就生成了一个完整的计算器。'], C3, target='audio', badge=True)
clip('c3', 'd4i', 'd4b', ['人数改成五人，服务费调到百分之十五，再勾选按整元收取。每一步都即时更新，还会自动提示多收了多少钱。'], C3, fade_out=True)
C4 = ['04', '讲解演示：冒泡排序']
clip('e1', 'w1a', 'w1sent', ['讲解类问题会变成分步演示。'], C4, fade_in=True, rec='rec-walk')
clip('e2', 'w1sent', 'w1done', ['模型写出一个带状态的程序：左边是数组，右边是对应的代码。'], C4, target='audio', badge=True, rec='rec-walk')
clip('e3', 'w1i', 'w1b', ['每点一次下一步，正在比较和交换的方块会变色，右边代码里这一步执行的那一行同时高亮，算法和代码一一对应。'], C4, fade_out=True, rec='rec-walk')
C5 = ['05', '物理模拟：平抛运动']
clip('f1', 'd6a', 'd6sent', ['物理过程可以直接做成模拟。'], C5, fade_in=True)
clip('f2', 'd6sent', 'd6done', ['这类需要动画循环的界面，模型会放进一个禁止联网的沙箱页面里运行。'], C5, target='audio', badge=True)
clip('f3', 'd6j', 'd6c', ['调整初速度和抛出高度，轨迹、落地时间和射程都会重新计算并播放。'], C5, fade_out=True)
C6 = ['06', '小游戏：24 点']
clip('g1', 'd7i', 'd7b', ['也可以直接玩小游戏。点两个数字，再点运算符，七加九得十六，乘二得三十二，再减八，正好二十四，过关。'], C6, fade_in=True, fade_out=True)
C7 = ['07', '出错了？一键修正']
clip('h1', 'd8a', 'd8sent', ['模型偶尔会用到组件库里没有的组件。这时其余部分照常显示，下方列出问题，并提供“让助手修正”按钮。'], C7, fade_in=True)
clip('h2', 'd8sent', 'd8done+1.5', ['点击之后，问题清单作为新消息发给模型，十几秒后得到修正版，错误提示消失。'], C7, target='audio', badge=True, fade_out=True)
C8 = ['08', '调研任务：工作区看板']
clip('i1', 'd9a', 'd9sent', ['最后看一个调研任务：调研中国大学生使用 AI 学习工具的现状，做成看板。'], C8, fade_in=True)
clip('i2', 'd9sent', 'd9done', ['模型先联网检索、阅读多篇资料。这一轮生成看板时，模型输出的参数格式出了错，本轮中断。'], C8, target='audio', badge=True)
clip('i3', 'd9retry', 'd9rdone+1.5', ['我们回复“继续”，模型重新整理并发布了看板，右侧工作区自动打开。'], C8, target='audio', badge=True)
clip('i4', 'd10a', 'd10present', ['看板由关键数字、对比、图表和来源组成，数字旁都标注了来源，可以版本化保存，也可以导出为离线的 HTML 文件。'], C8)
clip('i5', 'd10present', 'd10present+4.5', ['点击演示，就能全屏展示。'], C8, fade_out=True)
C9 = ['09', '简单问题，直接回答']
clip('j1', 'd11a', 'd11b', ['当然，简单的问题不需要界面。问首都在哪里，它就用一句话回答。'], C9, fade_in=True, fade_out=True)

scene('sc08')
scene('sc09')

json.dump({'items': items}, open(os.path.join(V, 'plan.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({it['id']: it['say'] for it in items}, open(os.path.join(V, 'narration-all.json'), 'w'), ensure_ascii=False, indent=1)
print(len(items), 'items')
