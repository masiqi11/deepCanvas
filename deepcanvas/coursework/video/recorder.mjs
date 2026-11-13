// Screencast recorder for the demo: keeps one browser page open, captures CDP frames with
// timestamps, and accepts scripted steps over a local HTTP endpoint so each step can be
// planned after looking at the previous screenshot. Marks name the clips to keep.
import fs from 'node:fs'
import http from 'node:http'
const { chromium } = await import(new URL('../../../apps/web/node_modules/playwright/index.mjs', import.meta.url).href)

const [url, outDir, port = '4555'] = process.argv.slice(2)
fs.mkdirSync(`${outDir}/frames`, { recursive: true })
const W = 1600, H = 900
const browser = await chromium.launch(process.env.DC_CHROMIUM ? { executablePath: process.env.DC_CHROMIUM } : {})
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.2, locale: 'zh-CN' })
await context.addInitScript(() => {
  // Visible cursor and click ripple, since headless screencasts have no pointer.
  const install = () => {
    if (document.getElementById('__cursor')) return
    const c = document.createElement('div'); c.id = '__cursor'
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:transform .08s'
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.3-3.4-6.8L4 20z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>'
    document.documentElement.appendChild(c)
    addEventListener('mousemove', e => { c.style.display = ''; c.style.left = e.clientX - 3 + 'px'; c.style.top = e.clientY - 2 + 'px' }, true)
    // Entering a frame hands the pointer to the frame's own cursor.
    addEventListener('mouseout', e => { if (e.relatedTarget === null || e.relatedTarget.tagName === 'IFRAME') c.style.display = 'none' }, true)
    addEventListener('mousedown', e => {
      const r = document.createElement('div')
      r.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;background:rgba(79,70,229,.35);z-index:2147483646;pointer-events:none;transition:transform .45s,opacity .45s`
      document.documentElement.appendChild(r)
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0' })
      setTimeout(() => r.remove(), 500)
    }, true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install()
})
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
const frames = []
let n = 0
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = `frames/${String(n++).padStart(6, '0')}.jpg`
  fs.writeFileSync(`${outDir}/${file}`, Buffer.from(data, 'base64'))
  frames.push({ file, t: metadata.timestamp * 1000 })
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
const marks = []
const save = () => fs.writeFileSync(`${outDir}/timeline.json`, JSON.stringify({ frames, marks }, null, 0))
setInterval(save, 3000)
const mark = name => { marks.push({ name, t: Date.now() }); save() }
let mouse = { x: W / 2, y: H / 2 }
const sleep = ms => page.waitForTimeout(ms)
async function moveTo(x, y, steps = 25) {
  await page.mouse.move(x, y, { steps }); mouse = { x, y }
}
async function moveToLocator(loc, dx = 0.5, dy = 0.5) {
  await loc.scrollIntoViewIfNeeded()
  const b = await loc.boundingBox()
  await moveTo(b.x + b.width * dx, b.y + b.height * dy)
  return b
}
async function click(loc, pause = 350) {
  await moveToLocator(loc); await sleep(pause); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(250)
}
async function clickText(text, opts = {}) {
  const loc = (opts.exact ? page.getByText(text, { exact: true }) : page.getByRole(opts.role ?? 'button', { name: text })).nth(opts.nth ?? 0)
  await click(loc)
}
async function drag(loc, fromFrac, toFrac, steps = 30) {
  const b = await moveToLocator(loc, fromFrac, 0.5)
  await page.mouse.down(); await sleep(100)
  await page.mouse.move(b.x + b.width * toFrac, b.y + b.height / 2, { steps }); await sleep(100)
  await page.mouse.up(); mouse = { x: b.x + b.width * toFrac, y: b.y + b.height / 2 }
}
async function typeSlow(text, delay = 70) {
  const box = page.locator('textarea, [contenteditable="true"]').first()
  await click(box)
  await page.keyboard.type(text, { delay })
}
async function busy() {
  return page.locator('button[aria-label="停止生成"]').count()
}
async function waitDone(maxMs = 600_000) {
  const t0 = Date.now(); let saw = false
  while (Date.now() - t0 < maxMs) {
    await sleep(500)
    const allow = page.getByRole('button', { name: '允许一次' })
    if (await allow.count()) await allow.first().click().catch(() => {})
    const b = await busy(); if (b) saw = true
    if (saw && !b) break
    if (!saw && Date.now() - t0 > 20_000) break
  }
  await sleep(1500)
  return Date.now() - t0
}
async function scrollChat(dy, steps = 12) {
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(30) }
}
// Camera: scale the page body toward a region (viewport px) with an eased transition; null resets.
async function camera(rect, ms = 900, zoom) {
  await page.evaluate(({ rect, ms, zoom, W, H }) => {
    const b = document.body
    b.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`
    b.style.transformOrigin = '0 0'
    if (!rect) { b.style.transform = ''; return }
    const z = zoom ?? Math.min(W / (rect.width * 1.25), H / (rect.height * 1.25), 1.8)
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2
    const tx = Math.min(0, Math.max(W - W * z, W / 2 - cx * z)), ty = Math.min(0, Math.max(H - H * z, H / 2 - cy * z))
    b.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`
  }, { rect, ms, zoom, W, H })
  await sleep(ms + 50)
}
async function rectOf(loc) {
  await loc.scrollIntoViewIfNeeded()
  return loc.boundingBox()
}
async function shot(name) { await page.screenshot({ path: `${outDir}/${name}.png` }); return `${outDir}/${name}.png` }
const api = { camera, rectOf, page, context, mark, sleep, moveTo, moveToLocator, click, clickText, drag, typeSlow, waitDone, scrollChat, shot, busy, W, H }
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
await page.goto(url)
http.createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', async () => {
    try {
      const fn = new Function('api', `return (async () => { const { ${Object.keys(api).join(', ')} } = api; ${body} })()`)
      const out = await fn(api)
      res.end(JSON.stringify({ ok: true, out: out ?? null }))
    } catch (e) {
      res.end(JSON.stringify({ ok: false, error: String(e?.stack ?? e).slice(0, 1500) }))
    }
  })
}).listen(Number(port), '127.0.0.1', () => console.log('recorder ready on', port))
process.on('SIGTERM', async () => { save(); await browser.close(); process.exit(0) })
