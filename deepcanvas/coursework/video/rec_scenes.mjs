// Record motion scenes with CDP screencast: rec_scenes.mjs <scenesDir> <timing.json> <outDir> [ids]
import fs from 'node:fs'
const { chromium } = await import(new URL('../../../apps/web/node_modules/playwright/index.mjs', import.meta.url).href)
const [dir, timingPath, outRoot, only] = process.argv.slice(2)
const timing = JSON.parse(fs.readFileSync(timingPath))
const ids = only ? only.split(',') : Object.keys(timing).filter(id => fs.existsSync(`${dir}/${id}.html`))
const browser = await chromium.launch(process.env.DC_CHROMIUM ? { executablePath: process.env.DC_CHROMIUM } : {})
for (const id of ids) {
  const out = `${outRoot}/${id}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(`${out}/frames`, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 })
  await page.goto(`file://${dir}/${id}.html`); await page.waitForTimeout(800)
  const cdp = await page.context().newCDPSession(page)
  const frames = []; let n = 0
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = `frames/${String(n++).padStart(6, '0')}.jpg`
    fs.writeFileSync(`${out}/${file}`, Buffer.from(data, 'base64')); frames.push({ file, t: metadata.timestamp * 1000 })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 })
  await page.waitForTimeout(400)
  const marks = [{ name: 'start', t: Date.now() }]
  await page.evaluate(c => window.play(c), timing[id].cues)
  await page.waitForTimeout(timing[id].duration * 1000)
  marks.push({ name: 'end', t: Date.now() })
  await cdp.send('Page.stopScreencast')
  fs.writeFileSync(`${out}/timeline.json`, JSON.stringify({ frames, marks }))
  console.log(id, frames.length, 'frames', timing[id].duration + 's')
  await page.close()
}
await browser.close()
