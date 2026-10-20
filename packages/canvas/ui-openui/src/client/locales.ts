/** Locale bundles for interactive answers. */

/** Dictionary namespace of this plugin. */
export const NS = 'openui'

/** Every key this plugin renders. */
export type OpenUIKey =
  | 'fence.preparing' | 'fence.failed' | 'fence.fix' | 'fence.fixPrompt' | 'fence.source'
  | 'carousel.previous' | 'carousel.next' | 'code.copy' | 'code.language' | 'select.placeholder' | 'flashcard.hint'
  | 'timer.label' | 'timer.start' | 'timer.pause' | 'timer.resume' | 'timer.reset'
  | 'input.value' | 'input.date'
  | 'chart.label' | 'chart.values'
  | 'html.title' | 'html.preparing'
  | 'action.values' | 'copied'

/** Simplified Chinese copy. */
export const zh: Record<OpenUIKey, string> = {
  'fence.preparing': '正在生成交互界面…',
  'fence.failed': '这个交互界面没能显示',
  'fence.fix': '让助手修正',
  'fence.fixPrompt': '上一个交互界面无法显示，问题如下，请修正后重新输出：\n{problems}',
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
  'action.values': '当前界面数值：',
  'copied': '已复制',
}

/** English copy. */
export const en: Record<OpenUIKey, string> = {
  'fence.preparing': 'Building the interactive view…',
  'fence.failed': 'This interactive view could not be shown',
  'fence.fix': 'Ask the assistant to fix it',
  'fence.fixPrompt': 'The previous interactive view could not be shown. Fix these problems and output it again:\n{problems}',
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
  'action.values': 'Values on the page: ',
  'copied': 'Copied',
}
