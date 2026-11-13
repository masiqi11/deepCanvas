#!/usr/bin/env node
// Drives a running DeepCanvas web app with a list of prompts and records what
// the user would see: which scene components appeared, whether the reply
// rendered without problems, and client-side timings.
//
// It needs an app whose chat input is usable. A brand-new DSH_HOME opens on a
// locked workspace picker instead; choose a workspace once by hand, or reuse a
// prepared home (see deepcanvas/PLAN.md, "评测方法").
//
// Usage, from the repository root:
//   DEEPSEEK_API_KEY=... DSH_HOME=<prepared home> pnpm dsh --profile deepcanvas \
//     --patch apps/web/tests/pin-browse-picker.overlay.yml --no-open --port 3101
//   node deepcanvas/eval/run.mjs "<url with ?token=...>" deepcanvas/eval/prompts-week.json <outDir> [id,id,...]
//
// Environment: DC_CHROMIUM = path to a Chromium binary when Playwright's own is not installed.
// One prompt runs at a time: concurrent conversations in one app instance failed in practice.
import fs from 'node:fs'
import path from 'node:path'

const playwright = await import(new URL('../../apps/web/node_modules/playwright/index.mjs', import.meta.url).href)
const [url, promptsFile, outDir, only] = process.argv.slice(2)
if (!url || !promptsFile || !outDir) {
  console.error('usage: node deepcanvas/eval/run.mjs <url> <prompts.json> <outDir> [id,id,...]')
  process.exit(2)
}
const prompts = JSON.parse(fs.readFileSync(promptsFile, 'utf8')).filter(p => !only || only.split(',').includes(p.id))
fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true })
const browser = await playwright.chromium.launch(process.env.DC_CHROMIUM ? { executablePath: process.env.DC_CHROMIUM } : {})
const results = []
const LIMIT_MS = 6 * 60_000

/** Read the finished reply out of the page. Runs in the browser. */
function readPage() {
  const roots = [...document.querySelectorAll('.iui-root')]
  const scenes = {}
  for (const el of document.querySelectorAll('[data-scene]')) scenes[el.dataset.scene] = (scenes[el.dataset.scene] ?? 0) + 1
  const body = document.body.innerText
  return {
    fences: roots.length,
    scenes,
    // A blocking problem hides the whole interface; a partial one leaves the valid components visible.
    problems: document.querySelectorAll('.iui-fence-problem:not([data-partial])').length,
    partials: document.querySelectorAll('.iui-fence-problem[data-partial]').length,
    problemText: [...document.querySelectorAll('.iui-fence-problem li')].map(li => li.textContent.slice(0, 200)),
    boardCards: document.querySelectorAll('[class*="boardCard"]').length,
    controls: roots.reduce((n, r) => n + r.querySelectorAll('input,button,select,[role="slider"],[role="tab"]').length, 0),
    uiTextChars: roots.reduce((n, r) => n + r.innerText.length, 0),
    reply: (document.querySelector('[data-slot="conversation.chat.flow"]')?.innerText ?? '').slice(0, 800),
    usage: (body.match(/用量\s*([\d.]+K?)\s*tok/) || [])[1] ?? null,
    cacheHit: (body.match(/缓存命中\s*(\d+)%/) || [])[1] ?? null,
    // The model asked the user a question and the turn is waiting for the answer.
    waitingForAnswer: /等待回答/.test(body),
    // The turn ended in an error card, for example an exhausted API quota or a malformed tool call.
    turnFailed: /处理失败|本轮运行失败/.test(body),
    quotaExhausted: /额度已用尽|QUOTA/.test(body),
  }
}

async function runOne(prompt) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
  page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)))
  await page.goto(url)
  await page.waitForTimeout(4000)
  const notice = page.getByRole('button', { name: '继续' })
  if (await notice.count()) { await notice.first().click(); await page.waitForTimeout(500) }
  const box = page.locator('textarea, [contenteditable="true"]').first()
  await box.click()
  await box.fill(prompt.text)
  const t0 = Date.now()
  await page.keyboard.press('Enter')
  let firstVisualMs = null, doneMs = null, sawBusy = false, approvals = 0, waiting = false
  while (Date.now() - t0 < LIMIT_MS) {
    await page.waitForTimeout(400)
    const allow = page.getByRole('button', { name: '允许一次' })
    if (await allow.count()) { approvals++; await allow.first().click().catch(() => {}) }
    const state = await page.evaluate(() => ({
      visual: [...document.querySelectorAll('.iui-root')].filter(r => r.textContent.trim().length > 0 || r.querySelector('svg,canvas,input,button')).length,
      // Only this label means the model is generating: interfaces may contain their own "停止" buttons.
      busy: document.querySelectorAll('button[aria-label="停止生成"]').length,
      waiting: /等待回答/.test(document.body.innerText),
    }))
    if (state.busy > 0) sawBusy = true
    if (firstVisualMs === null && state.visual > 0) firstVisualMs = Date.now() - t0
    if (state.waiting) { waiting = true; break }
    if (sawBusy && state.busy === 0) { doneMs = Date.now() - t0; break }
    if (!sawBusy && Date.now() - t0 > 20_000) { doneMs = Date.now() - t0; break }
  }
  await page.waitForTimeout(2500)
  const after = await page.evaluate(readPage)
  // Element screenshots of tall interfaces come out blank; a full-page shot does not.
  await page.screenshot({ path: path.join(outDir, 'shots', `${prompt.id}.png`), fullPage: true })
  const row = { ...prompt, approvals, firstVisualMs, doneMs, timedOut: doneMs === null && !waiting, consoleErrors, ...after }
  console.log(JSON.stringify({ id: prompt.id, scenes: after.scenes, fences: after.fences, problems: after.problems, partials: after.partials, firstVisualMs, doneMs, waiting, failed: after.turnFailed }))
  results.push(row)
  fs.writeFileSync(path.join(outDir, 'client.json'), `${JSON.stringify(results, null, 1)}\n`)
  await context.close()
}

for (const prompt of prompts) {
  await runOne(prompt)
  if (results.at(-1).quotaExhausted) {
    console.error('The API quota is exhausted; stopping. Rows recorded so far are in client.json.')
    process.exitCode = 3
    break
  }
}
await browser.close()
