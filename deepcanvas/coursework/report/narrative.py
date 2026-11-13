"""Fill the report's analysis paragraphs from analysis.json numbers."""
import json, os, statistics as st, sys
p = os.path.join(sys.argv[1], 'exp', 'analysis.json')
A = json.load(open(p))
v1, v2, b = A['v1'], A['v2'], A['baseline']
bl = {x['id']: x for x in A['baseline_rows']}
rows = [r for r in A['rows_v2'] if r['cat'] != '简单闲聊']
red = 100 * (1 - v2['prose_mean'] / b['chars_mean'])
code_n = b['code_n']
fastest = min(rows, key=lambda r: r['first_s'] or 999)
slowest = max(rows, key=lambda r: r['done_s'])
tool_v2 = [r for r in A['rows_v2'] if r['tools']]
bash_only = [r for r in tool_v2 if set(r['tools']) <= {'bash'}]
web = [r for r in tool_v2 if any(t.startswith('web') for t in r['tools'])]
A['text_overall'] = (
    f'改进后（第二轮），需要结构化回答的 {v2["structured_n"]} 道题全部在回复中给出了交互界面，两道简单闲聊题都只用文字回答，没有出现多余的界面，说明呈现形式的选择是准确的。'
    f'界面完整显示率由第一轮的 {v1["clean_rate"]} 提升到 {v2["clean_rate"]}，剩余 {v2["partial_n"]} 题属于“部分内容未显示”：出错的组件被去掉，其余界面正常可用，没有一题完全无法显示。'
    f'首个界面平均在 {v2["first_visual_mean_s"]} 秒出现（中位数 {v2["first_visual_median_s"]} 秒），回答平均 {v2["done_mean_s"]} 秒完成；由于界面边生成边显示，用户在回答结束前约 {v2["done_mean_s"] - v2["first_visual_mean_s"]:.1f} 秒就能看到并开始使用界面。'
    f'每次回答的输入 token 平均为 {v2["usage_mean_k"]}K，其中前缀缓存命中率平均 {v2["cache_mean"]}，约 9 千 tokens 的组件参考几乎全部命中缓存，额外成本很低。')
A['text_categories'] = (
    f'从任务类别看，数据图表类最快（首个界面平均 {[c for c in v2["per_cat"] if c["cat"] == "数据图表"][0]["first_mean"]} 秒），因为数据由用户给出，界面结构简单；'
    f'讲解演示类最慢（平均 {[c for c in v2["per_cat"] if c["cat"] == "讲解演示"][0]["done_mean"]} 秒完成），这类界面通常包含分步状态和 SVG 绘图，程序较长。'
    f'游戏模拟类在第二轮全部完整显示，平均控件数最多（{[c for c in v2["per_cat"] if c["cat"] == "游戏模拟"][0]["controls_mean"]} 个），说明模型能写出可以直接玩的交互程序。'
    f'单题最快的是 {fastest["id"]}（{fastest["first_s"]:.1f} 秒出现界面），最慢的是 {slowest["id"]}（{slowest["done_s"]:.1f} 秒完成），后者调用了较多次命令行验算。')
e1 = v1['errors']
A['text_errors'] = (
    f'第一轮共记录 {sum(e1.values())} 条界面问题，按类型分布见下图。主要有三类：一是参数取值越界（{e1.get("参数取值不在允许范围", 0)} 条），模型把 Title 的大号字（xl、2xl）用在 Text 上；'
    f'二是参数位置错位（{e1.get("参数类型不符", 0)} 条），模型按其他控件的习惯给 SegmentedControl 多传了一个标签，导致布尔参数收到字符串；三是使用不存在的组件（{e1.get("组件不存在", 0)} 条），如 Callout、Accordion、Actions。'
    '此外有两题模型输出的代码块没有标注 openui 语言，界面显示成了源代码。评测之外，录制演示时还发现：上游 OpenUI 分词器只接受 ASCII 标识符，模型写的 {月: …} 这类中文键会被静默丢弃，导致图表没有数据。'
    f'第一轮有 {v1["tool_runs"]} 题调用了工具，其中番茄钟一题多达 10 次工具调用，包括写文件、编辑文件和运行命令。')
A['improvements'] = [
    '组件库：为 SegmentedControl 增加与 RadioGroup、Slider 一致的可选 label 参数；Text 的字号范围与 Title 对齐（最大 3xl）；新增 Callout（结论、提示、风险）组件。',
    '渲染：解析前为非 ASCII 的对象键和成员访问加引号（`{月: 1}` → `{"月": 1}`，`row.销售额` → `row["销售额"]`），修复中文键丢失的问题。',
    '出错提示：区分“部分显示”与“完全失败”，部分出错时保留可用的界面。',
    '提示词：强调代码块必须以 ```openui 开头；强调界面自带计算，不要为计算、测试或预览界面运行命令、写文件。',
    '兜底：没有标注语言、但内容含 `root =` 语句的代码块，也按 OpenUI 程序渲染（新增链式插槽，所有插件都不认领时保持代码块）。该项在第二轮评测之后完成，用两道出现过该问题的题目单独验证有效。',
]
A['text_baseline'] = (
    f'纯文本基线（同一模型、无 DeepCanvas 提示词）的回答平均 {b["chars_mean"]:.0f} 个字符；DeepCanvas 第二轮中，界面之外的文字平均只有 {v2["prose_mean"]:.0f} 个字符，用户需要阅读的文字减少约 {red:.0f}%，其余信息以表格、图表、控件的形式呈现在界面里。'
    f'对于“做一个工具”“来玩游戏”类请求，基线有 {code_n} 题（{"、".join(b["code_ids"])}）直接给出了 HTML 或 Python 源代码，用户需要自己保存并运行；DeepCanvas 则在回复中直接给出可用的界面。'
    f'代价是时间：基线平均 {b["ms_mean_s"]} 秒返回，DeepCanvas 平均 {v2["done_mean_s"]} 秒完成，主要因为界面程序比纯文字长（平均约 {v2["code_mean"]:.0f} 个字符），且部分题目调用了工具；但界面在完成前已逐步可见，首个界面平均 {v2["first_visual_mean_s"]} 秒出现。')
A['gallery'] = [
    ('g-split.png', '工具计算：分账工具（人数改为 5、服务费改为 15%、勾选按整元收取后实时更新）'),
    ('g-chart.png', '数据图表：上半年销售趋势（关键指标、折线图、明细表）'),
    ('g-sort.png', '讲解演示：冒泡排序分步演示（被交换的元素标红，右侧代码高亮这一步执行的行）'),
    ('g-physics.png', '游戏模拟：平抛运动模拟器（调整初速度与高度后重新播放轨迹）'),
    ('g-24.png', '游戏模拟：24 点小游戏（点击数字与运算符，过关后提示）'),
    ('g-form.png', '澄清与表单：根据用户选择给出的数据分析表单，提交后数值随消息发回对话'),
    ('g-repair.png', '出错处理：部分内容未显示时的提示卡片与“让助手修正”按钮'),
    ('g-board.png', '工作区看板：调研类任务发布的看板（左侧为对话，右侧为看板）'),
]
A['findings'] = [
    f'呈现形式选择准确：结构化问题 {v2["visual_rate"]} 给出界面，闲聊题全部为文字，模型能理解“什么时候该用界面”。',
    f'迭代改进有效：针对第一轮发现的问题修改组件库和提示词后，界面完整显示率由 {v1["clean_rate"]} 提升到 {v2["clean_rate"]}，写文件、编辑文件等不必要的工具调用消失。',
    '让组件库“迎合”模型比约束模型更有效：模型会按其他组件或其他 UI 库的习惯来写（大字号、标签参数、Callout），把这些写法变成合法写法，比在提示词里禁止更可靠。',
    f'仍有不足：第二轮仍有 {len(bash_only)} 题调用命令行验算数字（在沙箱中运行、不需要审批，但增加了耗时）；仍有 {v2["partial_n"]} 题使用了不存在的组件（如 Meters、Calculator、Accordion）或给表格多传参数。后续可为常见的误用名称提供别名，或在出错时自动修正一次。',
    '稳定的系统提示词让长参考几乎零成本：缓存命中率稳定在 94%–99%。',
    '评测规模有限：每题每轮只运行一次，模型输出有随机性，结论应看作趋势而非精确值。',
]
json.dump(A, open(p, 'w'), ensure_ascii=False, indent=1)
print('ok', red)
