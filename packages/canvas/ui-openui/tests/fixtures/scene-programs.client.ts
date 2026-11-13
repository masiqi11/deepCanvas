// Mock answers that exercise every scene component with graduate-student data.
// Dates assume the tests' frozen clock: Thursday 2026-11-12.

import type { Program } from './programs.client.ts'

const weekRolling = `root = Col([plan])
plan = WeekPlan(items, "本周计划", "2026-11-12")
items = [{day: "2026-11-12", time: "上午", title: "补实验数据", note: "课程设计", tone: "warning"}, {day: "2026-11-12", time: "14:00", title: "上课", note: "教三 201"}, {day: "2026-11-13", time: "17:00 前", title: "提交课程设计", deadline: true, tone: "danger"}, {day: "2026-11-14", time: "09:12", title: "回家", tone: "success"}, {day: 1, time: "上午", title: "读组会论文", note: "方法部分", tone: "neutral"}, {day: "周二", title: "做组会 PPT"}, {day: 3, time: "10:00", title: "组会汇报", deadline: true, tone: "purple"}, {day: "2026-12-01", title: "不在这七天里"}]`

const weekFixed = `root = Col([WeekPlan(items)])
items = [{day: 1, title: "开会"}, {day: "Wed", title: "交报告", deadline: true}, {day: "周五", title: "考试", deadline: true}, {day: 7, title: "复习"}]`

const roadmap = `root = Col([Roadmap(phases, "30 天雅思备考")])
phases = [{name: "摸底", span: "第 1 周", goal: "知道四科各差多少分。", tasks: ["做一套完整真题并计时", "把错题按题型归类"]}, {name: "补短板", span: "第 2–3 周", goal: "每天两小时只练最弱的两科。", tasks: ["听力：每天精听一篇", "写作：每周两篇并对照范文", "口语：录音回听"]}, {name: "模考", span: "第 4 周", tasks: ["隔天一套全真模考", "考前两天只复盘错题"]}]`

const countdown = `root = Col([Countdown(items)])
items = [{title: "开题报告初稿", date: "2026-11-24", note: "先定题目和三篇核心文献"}, {title: "课程设计", date: "2026-11-13", note: "报告 + 视频"}, {title: "组会汇报", date: "2026-11-12"}, {title: "奖学金材料", date: "2026-11-10"}, {title: "日期写错的一项", date: "下周"}]`

const fieldMap = `root = Col([map, reading, history])
map = ConceptMap(layers, "扩散模型入门地图", "反向去噪")
layers = [{name: "先修", concepts: [{name: "生成模型", text: "学会数据的分布，然后从里面采样出新样本。", known: true}, {name: "VAE", text: "把数据压到一个连续的隐空间再还原。", known: true}]}, {name: "核心", concepts: [{name: "前向加噪", text: "一步步往图片里加高斯噪声，直到变成纯噪声。", known: true}, {name: "反向去噪", text: "训练一个网络，学会把加了噪声的图片一步步还原。", analogy: "看过上千次墨水在水里散开，就能把过程倒着放。", read: "DDPM 第 3 节"}, {name: "训练目标", text: "让网络预测每一步加进去的噪声。"}]}, {name: "进阶", concepts: [{name: "条件引导", text: "用文字等条件把生成结果往想要的方向推。"}]}, {name: "应用", concepts: [{name: "文生图", text: "输入一句话，生成对应的图片。"}]}]
reading = ReadingList(papers)
papers = [{title: "Denoising Diffusion Probabilistic Models", meta: "Ho 等 · 2020", tag: "先读", why: "奠基之作，先读第 3 节。", url: "https://arxiv.org/abs/2006.11239"}, {title: "Denoising Diffusion Implicit Models", meta: "Song 等 · 2020", tag: "先读", url: "https://arxiv.org/abs/2010.02502"}, {title: "一条没有可用链接的条目", meta: "来源待核实", tag: "选读", url: "javascript:alert(1)"}]
history = Timeline(events, "发展时间线")
events = [{when: "2015", title: "扩散思想提出"}, {when: "2020", title: "DDPM", text: "生成质量追上 GAN。", highlight: true}, {when: "2022", title: "潜空间扩散", text: "文生图进入大众视野。"}]`

const paper = `root = Col([brief, asks])
brief = PaperBrief("Denoising Diffusion Probabilistic Models", "只用加噪和去噪这一个简单的训练目标，就让扩散模型的生成质量追上了 GAN。", "扩散模型理论漂亮，但此前生成质量差。", "把训练目标简化成预测每一步加的噪声。", "CIFAR-10 上 FID 3.17。", "采样要 1000 步，生成很慢。", "Ho, Jain, Abbeel · NeurIPS 2020", "值得精读", "和你的方向高度相关，重点读第 3、4 节。")
asks = FollowUps(items)
items = [{q: "它和 GAN 比，到底好在哪？", a: "训练稳定、不会模式崩塌，样本更多样；代价是采样慢。", more: [{q: "后来怎么把采样变快的？", a: "DDIM 把采样步数从 1000 降到几十步。"}, {q: "模式崩塌是什么意思？", a: "生成器只会产出少数几种样本。"}]}, {q: "复现它需要多少算力？", a: "CIFAR-10 规模单卡几天可以训完。"}]`

const quiz = `root = Col([Quiz(questions, "扩散模型自测")])
questions = [{q: "DDPM 的网络预测的是什么？", options: ["原始图片", "每一步加的噪声", "类别标签"], answer: 1, why: "训练目标被简化成预测噪声。"}, {q: "DDIM 相比 DDPM 的主要改进是？", options: ["生成质量更高", "需要重新训练", "采样步数更少"], answer: "C", why: "同一个模型，用更少的步数采样。"}, {q: "只有一个选项的题会被跳过", options: ["唯一选项"], answer: 0}]`

const decision = `root = Col([Decision(["导师 A", "导师 B", "导师 C"], criteria, "选导师")])
criteria = [{name: "方向匹配", weight: 5, scores: [5, 3, 2]}, {name: "指导时间", weight: 3, scores: [2, 5, 4]}, {name: "毕业去向", weight: 2, scores: [3, 4, 5]}]`

/** One program per scenario; ids name the scenario. */
export const scenePrograms: Program[] = [
  { id: 'scene-week-rolling', title: 'A week from today', note: 'WeekPlan with a start date, weekday names, an unknown tone and an out-of-range day.', code: weekRolling },
  { id: 'scene-week-fixed', title: 'Monday to Sunday', note: 'WeekPlan without a start date.', code: weekFixed },
  { id: 'scene-roadmap', title: 'A month-long plan', note: 'Roadmap phases with tasks to tick.', code: roadmap },
  { id: 'scene-countdown', title: 'Deadlines', note: 'Countdown with due-today, overdue and unreadable dates.', code: countdown },
  { id: 'scene-field-map', title: 'Getting into a field', note: 'ConceptMap, ReadingList and Timeline together.', code: fieldMap },
  { id: 'scene-paper', title: 'One paper at a glance', note: 'PaperBrief with FollowUps.', code: paper },
  { id: 'scene-quiz', title: 'Self-test', note: 'Quiz with an index answer, a letter answer and a skipped question.', code: quiz },
  { id: 'scene-decision', title: 'Choosing between options', note: 'Decision with three weighted criteria.', code: decision },
]
