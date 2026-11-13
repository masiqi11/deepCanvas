/** Locale bundles for interactive answers. */

/** Dictionary namespace of this plugin. */
export const NS = 'openui'

/** Every key this plugin renders. */
export type OpenUIKey =
  | 'fence.preparing' | 'fence.failed' | 'fence.partial' | 'fence.fix' | 'fence.fixPrompt' | 'fence.source'
  | 'carousel.previous' | 'carousel.next' | 'code.copy' | 'code.language' | 'select.placeholder' | 'flashcard.hint'
  | 'timer.label' | 'timer.start' | 'timer.pause' | 'timer.resume' | 'timer.reset'
  | 'input.value' | 'input.date'
  | 'chart.label' | 'chart.values'
  | 'html.title' | 'html.preparing'
  | 'week.title' | 'week.count' | 'week.deadlines' | 'week.deadline' | 'week.today' | 'week.done' | 'week.moveHere' | 'week.hint'
  | 'week.day1' | 'week.day2' | 'week.day3' | 'week.day4' | 'week.day5' | 'week.day6' | 'week.day7'
  | 'road.title'
  | 'road.progress'
  | 'count.title'
  | 'count.left'
  | 'count.today'
  | 'count.over'
  | 'time.title'
  | 'read.title'
  | 'read.progress'
  | 'read.open'
  | 'map.title'
  | 'map.progress'
  | 'map.pick'
  | 'map.analogy'
  | 'map.read'
  | 'map.simpler'
  | 'map.example'
  | 'map.quiz'
  | 'map.mark'
  | 'map.unmark'
  | 'map.askSimpler'
  | 'map.askExample'
  | 'map.askQuiz'
  | 'paper.problem'
  | 'paper.method'
  | 'paper.result'
  | 'paper.limit'
  | 'paper.verdict'
  | 'ask.title'
  | 'ask.placeholder'
  | 'ask.send'
  | 'quiz.title'
  | 'quiz.progress'
  | 'quiz.next'
  | 'quiz.finish'
  | 'quiz.score'
  | 'quiz.again'
  | 'decide.title'
  | 'decide.weight'
  | 'decide.best'
  | 'decide.hint'
  | 'action.values' | 'copied'

/** Simplified Chinese copy. */
export const zh: Record<OpenUIKey, string> = {
  'fence.preparing': '正在生成交互界面…',
  'fence.failed': '这个交互界面没能显示',
  'fence.partial': '这个交互界面有部分内容没能显示',
  'fence.fix': '让助手修正',
  'fence.fixPrompt': '上一个交互界面有内容无法显示，问题如下，请修正后重新输出：\n{problems}',
  'fence.source': '查看源码',
  'carousel.previous': '上一页',
  'carousel.next': '下一页',
  'code.copy': '复制代码',
  'code.language': '代码',
  'select.placeholder': '请选择…',
  'flashcard.hint': '点按翻面',
  'timer.label': '计时器',
  'timer.start': '开始',
  'timer.pause': '暂停',
  'timer.resume': '继续',
  'timer.reset': '重置',
  'input.value': '数值',
  'input.date': '日期',
  'chart.label': '{series} 随 {x} 变化的图表',
  'chart.values': '数值',
  'html.title': '交互视图',
  'html.preparing': '正在准备交互视图…',
  'week.title': '本周计划',
  'week.count': '{n} 件事',
  'week.deadlines': '{n} 个截止',
  'week.deadline': '截止',
  'week.today': '今天',
  'week.done': '完成：{title}',
  'week.moveHere': '移到这天',
  'week.hint': '点一件事，再点“移到这天”可以换日子；点圆圈标记完成。',
  'week.day1': '周一',
  'week.day2': '周二',
  'week.day3': '周三',
  'week.day4': '周四',
  'week.day5': '周五',
  'week.day6': '周六',
  'week.day7': '周日',
  'road.title': '阶段计划',
  'road.progress': '完成 {done} / {total}',
  'count.title': '截止倒计时',
  'count.left': '还有 {n} 天',
  'count.today': '今天截止',
  'count.over': '已过 {n} 天',
  'time.title': '时间线',
  'read.title': '阅读路径',
  'read.progress': '已读 {done} / {total}',
  'read.open': '打开',
  'map.title': '入门地图',
  'map.progress': '已掌握 {done} / {total}',
  'map.pick': '点一个概念查看解释。',
  'map.analogy': '类比：',
  'map.read': '该读：',
  'map.simpler': '再讲简单点',
  'map.example': '举个例子',
  'map.quiz': '考考我',
  'map.mark': '标记为已掌握',
  'map.unmark': '取消已掌握',
  'map.askSimpler': '把“{name}”再讲简单一点',
  'map.askExample': '给“{name}”举一个具体的例子',
  'map.askQuiz': '出几道题考考我对“{name}”的理解',
  'paper.problem': '解决什么问题',
  'paper.method': '怎么做的',
  'paper.result': '效果如何',
  'paper.limit': '局限在哪',
  'paper.verdict': '值得精读吗',
  'ask.title': '追问',
  'ask.placeholder': '输入你自己的问题…',
  'ask.send': '提问',
  'quiz.title': '自测',
  'quiz.progress': '第 {n} / {total} 题',
  'quiz.next': '下一题',
  'quiz.finish': '看结果',
  'quiz.score': '答对 {n} / {total}',
  'quiz.again': '再来一遍',
  'decide.title': '帮你做决定',
  'decide.weight': '权重',
  'decide.best': '目前最适合：{name}',
  'decide.hint': '拖动权重，排名会立刻变化；格子里是 1 到 5 的评分。',
  'action.values': '当前界面数值：',
  'copied': '已复制',
}

/** English copy. */
export const en: Record<OpenUIKey, string> = {
  'fence.preparing': 'Building the interactive view…',
  'fence.failed': 'This interactive view could not be shown',
  'fence.partial': 'Part of this interactive view could not be shown',
  'fence.fix': 'Ask the assistant to fix it',
  'fence.fixPrompt': 'Part or all of the previous interactive view could not be shown. Fix these problems and output it again:\n{problems}',
  'fence.source': 'View source',
  'carousel.previous': 'Previous',
  'carousel.next': 'Next',
  'code.copy': 'Copy code',
  'code.language': 'code',
  'select.placeholder': 'Choose…',
  'flashcard.hint': 'Tap to flip',
  'timer.label': 'Timer',
  'timer.start': 'Start',
  'timer.pause': 'Pause',
  'timer.resume': 'Resume',
  'timer.reset': 'Reset',
  'input.value': 'Value',
  'input.date': 'Date',
  'chart.label': 'Chart of {series} by {x}',
  'chart.values': 'values',
  'html.title': 'Interactive view',
  'html.preparing': 'Preparing the interactive view…',
  'week.title': 'This week',
  'week.count': '{n} items',
  'week.deadlines': '{n} deadlines',
  'week.deadline': 'Due',
  'week.today': 'today',
  'week.done': 'Done: {title}',
  'week.moveHere': 'Move here',
  'week.hint': 'Pick an item, then choose “Move here” on another day; tap the circle to mark it done.',
  'week.day1': 'Mon',
  'week.day2': 'Tue',
  'week.day3': 'Wed',
  'week.day4': 'Thu',
  'week.day5': 'Fri',
  'week.day6': 'Sat',
  'week.day7': 'Sun',
  'road.title': 'Roadmap',
  'road.progress': '{done} / {total} done',
  'count.title': 'Deadlines',
  'count.left': '{n} days left',
  'count.today': 'Due today',
  'count.over': '{n} days overdue',
  'time.title': 'Timeline',
  'read.title': 'Reading path',
  'read.progress': '{done} / {total} read',
  'read.open': 'Open',
  'map.title': 'Concept map',
  'map.progress': '{done} / {total} learned',
  'map.pick': 'Pick a concept to see what it means.',
  'map.analogy': 'Analogy: ',
  'map.read': 'Read: ',
  'map.simpler': 'Simpler',
  'map.example': 'Example',
  'map.quiz': 'Quiz me',
  'map.mark': 'Mark as learned',
  'map.unmark': 'Unmark',
  'map.askSimpler': 'Explain "{name}" more simply',
  'map.askExample': 'Give a concrete example of "{name}"',
  'map.askQuiz': 'Quiz me on "{name}"',
  'paper.problem': 'Problem',
  'paper.method': 'Method',
  'paper.result': 'Result',
  'paper.limit': 'Limits',
  'paper.verdict': 'Worth a close read?',
  'ask.title': 'Follow-up questions',
  'ask.placeholder': 'Ask your own question…',
  'ask.send': 'Ask',
  'quiz.title': 'Quiz',
  'quiz.progress': 'Question {n} of {total}',
  'quiz.next': 'Next',
  'quiz.finish': 'See result',
  'quiz.score': '{n} of {total} correct',
  'quiz.again': 'Try again',
  'decide.title': 'Decision',
  'decide.weight': 'Weight',
  'decide.best': 'Best fit: {name}',
  'decide.hint': 'Drag a weight and the ranking updates; cells are scores from 1 to 5.',
  'action.values': 'Values on the page: ',
  'copied': 'Copied',
}
