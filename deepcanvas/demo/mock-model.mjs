#!/usr/bin/env node
// Scripted Messages-compatible model for keyless DeepCanvas demos and UI checks.
// It answers from fixed scenarios chosen by keywords in the latest user
// message; every board and table it emits is labeled as demo data and is
// not the result of real research.
//
// Usage: node deepcanvas/demo/mock-model.mjs [port]
// Then:  DEEPSEEK_BASE_URL=http://127.0.0.1:<port>/v1 DEEPSEEK_API_KEY=mock pnpm deepcanvas
import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? 8790)
const CHUNK = 48
const DELAY_MS = 12

const DEMO_NOTE = '演示数据：本内容由模拟模型生成，用于展示界面，不是真实检索结果。'

const sources = [
  { id: 's1', title: '示例来源 A：高校学生数字化学习调查', url: 'https://example.com/demo/student-survey', publisher: '示例研究机构', published: '2026-03', accessed: '2026-10-20', excerpt: '受访学生中超过一半每周使用 AI 工具完成课程作业。' },
  { id: 's2', title: '示例来源 B：教育类应用季度报告', url: 'https://example.com/demo/edu-apps', publisher: '示例数据平台', published: '2026-07', accessed: '2026-10-20', excerpt: '搜题与写作辅助类应用占据下载量前列。' },
  { id: 's3', title: '示例来源 C：高校 AI 使用规范汇编', url: 'https://example.com/demo/campus-policy', publisher: '示例高校联盟', published: '2026-05', accessed: '2026-10-20', excerpt: '多所高校要求在作业中注明 AI 使用情况。' },
]

function marketBoard() {
  return {
    title: '中国大学生 AI 学习助手市场机会',
    subtitle: '面向产品机会判断的快速研究看板',
    layout: 'report',
    summary: `**结论：** 通用搜题与写作工具已高度拥挤，机会集中在“课程场景深度整合”和“合规的学习过程记录”。${DEMO_NOTE}`,
    sources,
    sections: [
      {
        title: '核心结论',
        blocks: [
          { type: 'stats', items: [
            { label: '每周使用 AI 学习的学生', value: '52', unit: '%', delta: '+9pt', trend: 'up', note: '同比', sources: ['s1'], evidence: 'fact' },
            { label: '头部应用数量', value: 6, note: '覆盖主要场景', sources: ['s2'], evidence: 'fact' },
            { label: '可信市场规模', value: '暂无', note: '未找到可靠口径', evidence: 'unverified' },
          ] },
          { type: 'callout', tone: 'warning', title: '研究限制', text: '没有找到口径一致、可公开核实的市场规模数据，因此本看板不给出规模图表。', evidence: 'unverified' },
        ],
      },
      {
        title: '用户需求',
        eyebrow: '需求',
        blocks: [
          { type: 'meters', items: [
            { label: '作业与习题讲解', value: 78, tone: 'info', sources: ['s1'], evidence: 'fact' },
            { label: '论文写作与润色', value: 64, tone: 'info', sources: ['s1'], evidence: 'fact' },
            { label: '考试复习规划', value: 41, tone: 'info', sources: ['s1'], evidence: 'fact' },
            { label: '课堂笔记整理', value: 33, tone: 'info', sources: ['s1'], evidence: 'fact' },
          ] },
          { type: 'cards', items: [
            { title: '想要“讲明白”，不只是答案', text: '学生更看重分步讲解和举一反三。', tag: '强需求', tone: 'success', evidence: 'inference' },
            { title: '担心学术不端', text: '需要能证明独立完成的使用方式。', tag: '顾虑', tone: 'warning', sources: ['s3'], evidence: 'fact' },
            { title: '价格敏感', text: '月付意愿集中在低价区间。', tag: '约束', tone: 'neutral', evidence: 'estimate' },
          ] },
        ],
      },
      {
        title: '竞争对比',
        eyebrow: '竞争',
        blocks: [
          { type: 'table', caption: '主要产品类型对比', sortable: true, filterable: true, highlight: [3],
            columns: [{ label: '类型' }, { label: '代表能力' }, { label: '拥挤度', align: 'center' }, { label: '差异化空间', align: 'center' }],
            rows: [
              ['搜题工具', '拍照识题、答案解析', '高', '低'],
              ['写作助手', '润色、改写、查重', '高', '中'],
              ['通用聊天助手', '问答、翻译', '很高', '低'],
              ['课程场景助手', '对接课表、课件与作业', '低', '高'],
            ],
            sources: ['s2'], evidence: 'inference' },
          { type: 'chart', kind: 'bar', title: '各类型下载量份额（示例）', unit: '%', labels: ['搜题', '写作', '通用聊天', '课程场景'],
            series: [{ name: '份额', values: [38, 27, 29, 6] }], sources: ['s2'], evidence: 'fact', note: DEMO_NOTE },
        ],
      },
      {
        title: '机会分析',
        eyebrow: '机会',
        blocks: [
          { type: 'proscons', prosTitle: '课程场景助手的优势', consTitle: '主要风险', pros: ['与学习过程深度绑定，留存更高', '可对接学校采购，降低获客成本'], cons: ['需要对接教务数据，落地慢', '高校采购周期长'] },
          { type: 'calculator', title: '收入粗算（可调整假设）',
            inputs: [
              { id: 'users', label: '月活学生（万）', kind: 'slider', default: 20, min: 1, max: 200, step: 1 },
              { id: 'pay', label: '付费率', kind: 'slider', default: 6, min: 1, max: 30, step: 1, unit: '%' },
              { id: 'price', label: '月费（元）', kind: 'select', default: 19, options: [{ label: '9 元', value: 9 }, { label: '19 元', value: 19 }, { label: '29 元', value: 29 }] },
            ],
            outputs: [
              { label: '月收入（万元）', formula: 'users * pay / 100 * price', decimals: 1, emphasis: true },
              { label: '年收入（万元）', formula: 'users * pay / 100 * price * 12', decimals: 0 },
            ],
            note: '估算：以上为假设驱动的计算，不代表真实市场数据。' },
          { type: 'actions', items: [
            { label: '深入分析课程场景助手', prompt: '深入分析“课程场景助手”这个机会，补充目标用户和进入策略。' },
            { label: '对比三款竞品', prompt: '对比三款代表性写作助手的功能和价格。' },
          ] },
        ],
      },
      {
        title: '研究限制与待确认',
        eyebrow: '限制',
        blocks: [
          { type: 'steps', checklist: true, items: [
            { title: '获取可核实的市场规模口径', text: '需要权威统计或公开财报。' },
            { title: '访谈 10 名以上目标学生', text: '验证付费意愿与使用场景。' },
            { title: '确认高校 AI 使用政策差异', done: true },
          ] },
        ],
      },
    ],
  }
}

function deepDiveBoard(boardId) {
  const board = marketBoard()
  board.board_id = boardId
  board.subtitle = '版本 2：补充“课程场景助手”深度分析'
  board.sections.splice(4, 0, {
    title: '深入：课程场景助手',
    eyebrow: '新增',
    blocks: [
      { type: 'timeline', items: [
        { time: '第 1 季度', title: '单课程试点', text: '与 2–3 门大课合作，验证讲解质量。', status: 'current' },
        { time: '第 2 季度', title: '院系推广', text: '接入课件与作业系统。', status: 'upcoming' },
        { time: '第 3 季度', title: '学校采购', text: '形成合规报告与使用记录功能。', status: 'upcoming' },
      ] },
      { type: 'tabs', tabs: [
        { label: '目标用户', blocks: [{ type: 'markdown', text: '- 理工科大一、大二学生\n- 选修大课的跨专业学生\n- 需要学习记录的助教', evidence: 'inference' }] },
        { label: '进入策略', blocks: [{ type: 'markdown', text: '先免费服务单门课程，用讲解质量换取教师推荐，再推动院系采购。', evidence: 'inference' }] },
      ] },
      { type: 'callout', tone: 'info', text: DEMO_NOTE },
    ],
  })
  return board
}

const compareUi = {
  blocks: [
    { type: 'table', caption: '写作助手对比（示例）', columns: [{ label: '产品' }, { label: '月费（元）', align: 'right' }, { label: '查重' }, { label: '引用管理' }],
      rows: [['示例产品 A', 15, '有', '无'], ['示例产品 B', 25, '有', '有'], ['示例产品 C', 9, '无', '无']], highlight: [1], sortable: true },
    { type: 'chart', kind: 'line', title: '近 6 个月活跃度趋势（示例）', labels: ['5月', '6月', '7月', '8月', '9月', '10月'],
      series: [{ name: '示例产品 A', values: [40, 42, 39, 45, 52, 58] }, { name: '示例产品 B', values: [30, 35, 41, 44, 47, 49] }] },
    { type: 'callout', tone: 'neutral', text: DEMO_NOTE },
  ],
}

function lastUser(messages) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i]
  return undefined
}

function textOf(message) {
  if (message === undefined) return ''
  if (typeof message.content === 'string') return message.content
  return message.content.map(block => block.type === 'text' ? block.text : block.type === 'tool_result'
    ? (typeof block.content === 'string' ? block.content : (block.content ?? []).map(part => part.text ?? '').join('')) : '').join('\n')
}

function hasToolResult(message) {
  return Array.isArray(message?.content) && message.content.some(block => block.type === 'tool_result')
}

function previousBoardId(messages) {
  for (const message of messages) {
    const match = /board_id ([^,\s)]+)/.exec(textOf(message))
    if (match !== null) return match[1]
  }
  return undefined
}

function plan(body) {
  const messages = body.messages ?? []
  const user = lastUser(messages)
  if (hasToolResult(user)) {
    const result = textOf(user)
    if (result.includes('invalid')) return [{ text: '组件参数有误，我会修正后重试。' }]
    if (result.includes('Published board')) {
      return [{ text: `看板已发布到右侧工作区。核心结论：通用搜题和写作工具已经拥挤，机会在课程场景深度整合；目前缺少可靠的市场规模数据，所以没有画规模图表。\n\n（${DEMO_NOTE}）` }]
    }
    return [{ text: `以上对比中，示例产品 B 功能最完整，示例产品 C 价格最低。（${DEMO_NOTE}）` }]
  }
  const prompt = textOf(user)
  if (prompt.includes('深入')) {
    const boardId = previousBoardId(messages)
    return [{ text: '我在原看板上补充了课程场景助手的深度分析，生成新版本。' }, { tool: 'canvas_board', input: deepDiveBoard(boardId) }]
  }
  if (prompt.includes('调研') || prompt.includes('市场')) {
    return [{ text: '我先整理需求、竞争和机会，再生成研究看板。' }, { tool: 'canvas_board', input: marketBoard() }]
  }
  if (prompt.includes('对比') || prompt.includes('比较')) {
    return [{ text: '下面是三款写作助手的对比：' }, { tool: 'show_ui', input: compareUi }]
  }
  return [{ text: `这是一个简单问题，直接用文字回答即可：${prompt.slice(0, 40)}。（模拟模型回复）` }]
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function respond(response, steps) {
  const send = payload => response.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`)
  response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' })
  send({ type: 'message_start', message: { id: `demo-${Date.now()}`, type: 'message', role: 'assistant', model: 'deepcanvas-demo', content: [], usage: { input_tokens: 10, output_tokens: 0 } } })
  let usedTool = false
  for (const [index, step] of steps.entries()) {
    if (step.text !== undefined) {
      send({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      for (let i = 0; i < step.text.length; i += 8) {
        send({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: step.text.slice(i, i + 8) } })
        await sleep(DELAY_MS)
      }
    } else {
      usedTool = true
      const json = JSON.stringify(step.input)
      send({ type: 'content_block_start', index, content_block: { type: 'tool_use', id: `demo-call-${Date.now()}`, name: step.tool, input: {} } })
      for (let i = 0; i < json.length; i += CHUNK) {
        send({ type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: json.slice(i, i + CHUNK) } })
        await sleep(DELAY_MS)
      }
    }
    send({ type: 'content_block_stop', index })
  }
  send({ type: 'message_delta', delta: { stop_reason: usedTool ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 100 } })
  send({ type: 'message_stop' })
  response.end()
}

createServer((request, response) => {
  if (request.method !== 'POST' || !request.url?.endsWith('/v1/messages')) {
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: 'not found' } }))
    return
  }
  let raw = ''
  request.setEncoding('utf8')
  request.on('data', chunk => { raw += chunk })
  request.on('end', () => {
    let body
    try { body = JSON.parse(raw) } catch {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'invalid JSON' } }))
      return
    }
    // Title generation and other side requests get a short plain answer.
    const tools = Array.isArray(body.tools) ? body.tools.map(tool => tool.name) : []
    const steps = tools.includes('canvas_board') ? plan(body) : [{ text: '大学生 AI 学习助手市场调研' }]
    void respond(response, steps)
  })
}).listen(port, '127.0.0.1', () => {
  console.log(`deepcanvas demo model: http://127.0.0.1:${port}/v1`)
})
