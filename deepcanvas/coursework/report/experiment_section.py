# Chapter 7 of the report; executed inside build_report.py with r, A, f in scope.
v1, v2, b = A['v1'], A['v2'], A['baseline']
r.h1('实验与运行结果')
r.h2('7.1 实验设置')
r.table('实验环境', ['项目', '配置'], [
    ['模型', 'DeepSeek-V4.1-Flash（deepseek-flash），推理强度 high，官方 API'],
    ['运行方式', '本地启动 DeepCanvas Web 服务；Playwright 驱动 Chromium 浏览器，模拟用户在输入框中提问'],
    ['运行环境', 'Linux 云主机，Node.js 22，命令执行工具运行在 bubblewrap 沙箱中'],
    ['题集', f'7 类任务共 {A["n"]} 题（附录 A）：工具计算 6、对比决策 5、讲解演示 6、数据图表 4、游戏模拟 4、规划清单 3、简单闲聊 2'],
    ['轮次', '第一轮：初始版本；根据第一轮的问题改进后，用全新的会话目录运行第二轮；每题每轮运行一次'],
    ['基线', '同一模型、同一题目，不加任何 DeepCanvas 提示词，直接调用 API 得到纯文本回答'],
], widths=[2.6, 12.8])
r.p('每道题在新会话中提问。测量脚本每 0.4 秒检查一次页面：记录首个非空交互界面出现的时间、回答结束（停止按钮消失）的时间；回答结束后统计界面数量、界面中的控件数量、错误卡片类型，并读取界面底部显示的 token 用量、缓存命中率与生成速度。会话日志中的工具调用、步骤数、模型输出文本也一并提取，用于计算代码块与正文的字符数。')
r.h2('7.2 评测指标')
r.table('评测指标定义', ['指标', '定义'], [
    ['界面覆盖率', '需要结构化回答的题目（除简单闲聊外）中，回复里出现交互界面的比例'],
    ['形式选择准确', '简单闲聊题只用文字回答、不出现界面或看板'],
    ['界面完整显示率', '出现界面的题目中，没有任何错误卡片（部分显示或完全失败）的比例'],
    ['首个界面时间', '从发送消息到第一个非空界面出现在页面上的时间'],
    ['回答完成时间', '从发送消息到回答结束的时间'],
    ['控件数', '界面中按钮、输入框、滑块、选择框等可操作元素的数量'],
    ['缓存命中率', '模型请求的输入 token 中命中服务端前缀缓存的比例（界面底部状态栏读数）'],
], widths=[3.2, 12.2])
r.h2('7.3 总体结果')
r.table('两轮评测的总体结果', ['指标', '第一轮（改进前）', '第二轮（改进后）'], [
    ['界面覆盖率', f'{v1["visual_n"]}/{v1["structured_n"]}（{v1["visual_rate"]}）', f'{v2["visual_n"]}/{v2["structured_n"]}（{v2["visual_rate"]}）'],
    ['闲聊题只用文字', f'{v1["chat_text_n"]}/{v1["chat_n"]}', f'{v2["chat_text_n"]}/{v2["chat_n"]}'],
    ['界面完整显示率', f'{v1["clean_n"]}/{v1["visual_n"]}（{v1["clean_rate"]}）', f'{v2["clean_n"]}/{v2["visual_n"]}（{v2["clean_rate"]}）'],
    ['其中：部分内容未显示', str(v1['partial_n']), str(v2['partial_n'])],
    ['其中：界面完全无法显示', str(v1['failed_n']), str(v2['failed_n'])],
    ['首个界面时间（平均 / 中位数）', f'{v1["first_visual_mean_s"]} s / {v1["first_visual_median_s"]} s', f'{v2["first_visual_mean_s"]} s / {v2["first_visual_median_s"]} s'],
    ['回答完成时间（平均 / 中位数）', f'{v1["done_mean_s"]} s / {v1["done_median_s"]} s', f'{v2["done_mean_s"]} s / {v2["done_median_s"]} s'],
    ['平均控件数（有界面的题）', str(v1['controls_mean']), str(v2['controls_mean'])],
    ['调用了工具的题目数', str(v1['tool_runs']), str(v2['tool_runs'])],
    ['单次回答 token 用量（平均）', f'{v1["usage_mean_k"]}K', f'{v2["usage_mean_k"]}K'],
    ['前缀缓存命中率（平均）', v1['cache_mean'], v2['cache_mean']],
    ['生成速度（平均）', f'{v1["speed_mean"]:.0f} tok/s', f'{v2["speed_mean"]:.0f} tok/s'],
], widths=[5.4, 5, 5])
r.p(A['text_overall'])
r.figure(f('chart-clean.png'), '各类任务的界面完整显示率（两轮对比）')
r.h2('7.4 各类任务结果')
r.table('第二轮各类任务结果', ['类别', '题数', '出现界面', '完整显示', '首个界面平均（s）', '完成平均（s）', '平均控件数'],
        [[c['cat'], c['n'], c['visual'], c['clean'], c['first_mean'] if c['first_mean'] is not None else '—', c['done_mean'], c['controls_mean']] for c in v2['per_cat']],
        widths=[2.4, 1.4, 2, 2, 2.6, 2.4, 2.4])
r.p(A['text_categories'])
r.figure(f('chart-latency.png'), '第二轮每道题的首个界面时间与回答完成时间')
r.h2('7.5 错误分析与改进')
r.p(A['text_errors'])
if os.path.exists(f('chart-errors.png')):
    r.figure(f('chart-errors.png'), '第一轮界面错误的类型分布', width_cm=11)
r.p('据此我们做了以下改进，然后用全新的会话目录重新运行全部题目：')
r.bullets(A['improvements'])
r.h2('7.6 与纯文本基线对比')
r.p(A['text_baseline'])
r.figure(f('chart-reading.png'), '用户需要阅读的文字量：纯文本基线与 DeepCanvas 对比')
r.h2('7.7 典型运行结果')
r.p('以下截图来自演示录制，均为真实模型（DeepSeek-V4.1-Flash）的输出，使用改进后的版本，未经人工修改。')
for name, cap in A['gallery']:
    r.figure(f(name), cap, width_cm=13.5)
r.h2('7.8 结果分析')
r.bullets(A['findings'])
