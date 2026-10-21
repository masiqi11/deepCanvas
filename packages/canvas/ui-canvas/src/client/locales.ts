/** Locale bundles for inline canvases, board cards, and the board workspace. */

/** Dictionary namespace of this plugin. */
export const NS = 'canvas'

/** Every key this plugin renders. */
export type CanvasKey =
  | 'inline.preparing' | 'inline.invalid' | 'inline.invalidHint' | 'inline.stopped' | 'inline.shown'
  | 'block.pending'
  | 'board.card.preparing' | 'board.card.progress' | 'board.card.ready' | 'board.card.failed' | 'board.card.open'
  | 'board.card.sections' | 'board.card.slides' | 'board.card.published'
  | 'board.loading' | 'board.failed' | 'board.notFound'
  | 'board.version' | 'board.versionLatest' | 'board.export' | 'board.present' | 'board.exitPresent'
  | 'board.contents' | 'board.sources' | 'board.previous' | 'board.next' | 'board.slideCounter' | 'board.title'
  | 'evidence.fact' | 'evidence.inference' | 'evidence.estimate' | 'evidence.unverified'
  | 'table.filter' | 'table.sortAscending' | 'table.sortDescending' | 'table.empty' | 'table.rows'
  | 'steps.progress'
  | 'calculator.title'
  | 'proscons.pros' | 'proscons.cons'
  | 'sources.title' | 'sources.accessed' | 'sources.published' | 'sources.cite'
  | 'actions.title' | 'actions.offline'
  | 'html.title' | 'html.error' | 'html.fix' | 'html.fixPrompt' | 'html.blockedLink'
  | 'chart.legend'
  | 'copy' | 'copied' | 'code.title' | 'code.wrap' | 'code.unwrap' | 'footnotes'

/** Simplified Chinese copy. */
export const zh: Record<CanvasKey, string> = {
  'inline.preparing': '正在生成可视化…',
  'inline.invalid': '可视化参数有误，正在修正',
  'inline.invalidHint': '模型会根据下列问题重新生成：',
  'inline.stopped': '可视化未完成',
  'inline.shown': '已展示 {count} 个组件',
  'block.pending': '正在生成…',
  'board.card.preparing': '正在生成看板…',
  'board.card.progress': '正在生成：{section}',
  'board.card.ready': '版本 {version}',
  'board.card.failed': '看板发布失败，正在修正',
  'board.card.open': '打开看板',
  'board.card.sections': '{count} 个章节',
  'board.card.slides': '{count} 页幻灯片',
  'board.card.published': '已发布看板「{title}」版本 {version}',
  'board.loading': '正在加载看板…',
  'board.failed': '看板加载失败。',
  'board.notFound': '在当前任务中找不到这个看板。',
  'board.version': '版本 {version}',
  'board.versionLatest': '版本 {version}（最新）',
  'board.export': '导出 HTML',
  'board.present': '演示',
  'board.exitPresent': '退出演示',
  'board.contents': '目录',
  'board.sources': '来源',
  'board.previous': '上一页',
  'board.next': '下一页',
  'board.slideCounter': '{current} / {total}',
  'board.title': '看板',
  'evidence.fact': '有来源',
  'evidence.inference': '推断',
  'evidence.estimate': '估算',
  'evidence.unverified': '待确认',
  'table.filter': '筛选表格…',
  'table.sortAscending': '升序',
  'table.sortDescending': '降序',
  'table.empty': '没有匹配的行',
  'table.rows': '{shown} / {total} 行',
  'steps.progress': '已完成 {done} / {total}',
  'calculator.title': '计算器',
  'proscons.pros': '优势',
  'proscons.cons': '风险',
  'sources.title': '来源',
  'sources.accessed': '访问于 {date}',
  'sources.published': '发布于 {date}',
  'sources.cite': '来源：{title}',
  'actions.title': '继续追问',
  'actions.offline': '离线导出中不可用',
  'html.title': '交互内容',
  'html.error': '交互内容运行出错：{message}',
  'html.fix': '让 DeepCanvas 修复',
  'html.fixPrompt': '看板中的交互内容运行出错：{message}。请修复后重新发布。',
  'html.blockedLink': '只能打开已登记的来源链接。',
  'chart.legend': '图例',
  'copy': '复制',
  'copied': '已复制',
  'code.title': '代码',
  'code.wrap': '自动换行',
  'code.unwrap': '取消换行',
  'footnotes': '脚注',
}

/** English copy. */
export const en: Record<CanvasKey, string> = {
  'inline.preparing': 'Building visuals…',
  'inline.invalid': 'Visual arguments were invalid; fixing them',
  'inline.invalidHint': 'The model will regenerate them using these problems:',
  'inline.stopped': 'Visuals were not completed',
  'inline.shown': 'Showed {count} component(s)',
  'block.pending': 'Building…',
  'board.card.preparing': 'Building the board…',
  'board.card.progress': 'Building: {section}',
  'board.card.ready': 'Version {version}',
  'board.card.failed': 'The board could not be published; fixing it',
  'board.card.open': 'Open board',
  'board.card.sections': '{count} sections',
  'board.card.slides': '{count} slides',
  'board.card.published': 'Published board "{title}" version {version}',
  'board.loading': 'Loading the board…',
  'board.failed': 'The board could not be loaded.',
  'board.notFound': 'This board is not in the current task.',
  'board.version': 'Version {version}',
  'board.versionLatest': 'Version {version} (latest)',
  'board.export': 'Export HTML',
  'board.present': 'Present',
  'board.exitPresent': 'Exit presentation',
  'board.contents': 'Contents',
  'board.sources': 'Sources',
  'board.previous': 'Previous',
  'board.next': 'Next',
  'board.slideCounter': '{current} / {total}',
  'board.title': 'Board',
  'evidence.fact': 'Sourced',
  'evidence.inference': 'Inference',
  'evidence.estimate': 'Estimate',
  'evidence.unverified': 'Unverified',
  'table.filter': 'Filter rows…',
  'table.sortAscending': 'Ascending',
  'table.sortDescending': 'Descending',
  'table.empty': 'No matching rows',
  'table.rows': '{shown} / {total} rows',
  'steps.progress': '{done} of {total} done',
  'calculator.title': 'Calculator',
  'proscons.pros': 'Strengths',
  'proscons.cons': 'Risks',
  'sources.title': 'Sources',
  'sources.accessed': 'Accessed {date}',
  'sources.published': 'Published {date}',
  'sources.cite': 'Source: {title}',
  'actions.title': 'Ask next',
  'actions.offline': 'Unavailable in offline exports',
  'html.title': 'Interactive content',
  'html.error': 'The interactive content failed: {message}',
  'html.fix': 'Ask DeepCanvas to fix it',
  'html.fixPrompt': 'The interactive content in the board failed with: {message}. Fix it and publish the board again.',
  'html.blockedLink': 'Only registered source links can be opened.',
  'chart.legend': 'Legend',
  'copy': 'Copy',
  'copied': 'Copied',
  'code.title': 'Code',
  'code.wrap': 'Wrap lines',
  'code.unwrap': 'Unwrap lines',
  'footnotes': 'Footnotes',
}
