"""Write the demo video's shot script (docx) from the edit list: script_doc.py <scratchpad> <out.docx>"""
import json, os, sys
sys.path.insert(0, os.path.join(sys.argv[1], 'report'))
from docxkit import Report

S, OUT = sys.argv[1], sys.argv[2]
V = os.path.join(S, 'video')
plan = json.load(open(os.path.join(V, 'plan.json')))['items']
edl = {k: (sp, ln) for k, sp, ln in json.load(open(os.path.join(V, 'work2', 'edl-result.json')))['parts']}
total = json.load(open(os.path.join(V, 'work2', 'edl-result.json')))['total']

VISUAL = {
    'sc01': '片头：渐变光晕背景，Logo 弹出，产品名从左向右擦除显现，副标题与课程、组员信息依次浮现',
    'sc02': '问题：对话气泡里文字行逐行堆满，公式与列表高亮；追问“人数改成 5 个呢”后出现重新生成的转圈；对话整体虚化退场，三种呈现形式卡片弹出',
    'sc03': '组员分工：四张成员卡依次上浮，随讲解逐张点亮',
    'sc04': '技术路线：三层架构从左侧依次滑入，层间数据流光点流动，右上角弹出“7 个插件包 / 2 个扩展点 / 0 处主循环改动”',
    'sc05': '核心原理：五个步骤卡片依序点亮上移，底部进度条随讲解推进',
    'sc06': 'OpenUI Lang：代码逐行出现并语法着色，状态与函数高亮；右侧界面截图擦除显现，字符数计数器滚动，缓存命中率徽标弹出',
    'sc07': '章节过渡：“真实模型 · 真实操作”擦除显现',
    'sc08': '实验效果：四个指标数字滚动计数；分类柱状图两轮对比依次生长；阅读量横条生长，“−90%”放大出现',
    'sc09': '总结：四张要点卡依次浮现，下一步计划淡入，Logo 与“谢谢观看”弹出',
}


def tc(t):
    return f'{int(t // 60):02d}:{t % 60:04.1f}'


r = Report()
r.p('DeepCanvas 演示视频 · 分镜脚本', indent=False, align='center', size=20, bold=True)
r.p(f'总时长 {tc(total)}（{total / 60:.1f} 分钟，要求 30 分钟以内）　·　1920×1080　·　30 fps　·　中文配音 + 字幕', indent=False, align='center', size=11)
r.h1_plain('一、整体设计')
r.bullets([
    '**结构**：片头 → 问题与目标 → 组员分工 → 技术路线（架构、原理、语言）→ 九段实机演示 → 实验效果 → 总结。对应考核要求中的“项目任务、组员分工、技术路线、实验效果”。',
    '**视觉风格**：深色渐变背景、柔和光晕与网格，紫蓝渐变强调色；实机录屏放在圆角悬浮窗口中，与深色背景形成对比，顶部是章节编号与标题。',
    '**动效**：每句旁白对应一个动画节拍（元素上浮、擦除、弹出、数字滚动、柱状图生长、数据流光点）；录屏中对正在操作的区域做推近与拉远的镜头运动；鼠标指针与点击波纹可见。',
    '**剪辑**：场景之间淡入淡出；模型生成等待段按旁白长度自动加速，并在右上角显示“N× 加速”角标；同一演示内的连续镜头不加转场。',
    '**声音**：中文男声配音（云希），背景音乐为自制氛围音，有旁白时自动压低（侧链闪避），片头片尾淡入淡出。',
    '**字幕**：按句断行烧录在画面底部，另附 SRT 字幕文件，可在播放器中单独加载或修改。',
])
r.h1_plain('二、分镜表')
rows, clock = [], 0.0
for it in plan:
    sp, ln = edl[it['id']]
    if it['kind'] == 'scene':
        visual, tech = VISUAL[it['id']], '动效场景；淡入淡出'
    else:
        visual = f'{it["chapter"][0]} {it["chapter"][1]}：实机录屏'
        techs = []
        if sp >= 1.5:
            techs.append(f'{sp:.0f}× 加速' if sp >= 2 else f'{sp:.1f}× 加速')
        if it.get('fade_in'):
            techs.append('淡入')
        if it.get('fade_out'):
            techs.append('淡出')
        tech = '；'.join(techs) or '原速'
    rows.append([tc(clock), f'{ln:.1f}s', visual, ''.join(it['say']), tech])
    clock += ln
r.table('分镜表', ['时间码', '时长', '画面', '旁白', '剪辑'], rows, widths=[1.6, 1.3, 4.8, 6.0, 2.0], size=8.5)
r.h1_plain('三、修改方式')
r.p('视频由脚本生成：旁白文本在 video/scenes.py（动效场景）与 video/plan.py（录屏段落）中，组名与组员在 report/team.json 中。修改后重新运行 prepare_audio.py、rec_scenes.mjs 与 build_video2.py 即可得到新版本；只改字幕时可直接编辑 SRT 文件。', indent=False)
r.save(OUT)
print('saved', OUT, len(rows), 'shots')
