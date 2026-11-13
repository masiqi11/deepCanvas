// Deterministic frame renderer for the promo scenes: every frame seeks CSS animations and
// videos to its exact time, then screenshots. render.mjs <promoDir> [ids]
import fs from 'node:fs'
const { chromium } = await import(new URL('../../../apps/web/node_modules/playwright/index.mjs', import.meta.url).href)
const [dir, only] = process.argv.slice(2)
const { beat, tail, shots } = JSON.parse(fs.readFileSync(`${dir}/shots.json`))
const FPS = 30
const browser = await chromium.launch(process.env.DC_CHROMIUM ? { executablePath: process.env.DC_CHROMIUM } : {})
const SEEK = `
window.__seek = async (t) => {
  const B = ${beat};
  document.querySelectorAll('[data-b]').forEach(el => el.classList.toggle('on', t >= parseFloat(el.dataset.b) * B - 1e-6));
  document.querySelectorAll('[data-o]').forEach(el => el.classList.toggle('off', t >= parseFloat(el.dataset.o) * B - 1e-6));
  for (const a of document.getAnimations()) {
    const el = a.effect && a.effect.target;
    let start = 0;
    if (el && el.classList && el.classList.contains('off') && a.animationName !== 'leave') { a.cancel(); continue; }
    if (el && a.animationName === 'leave' && el.dataset && el.dataset.o) start = parseFloat(el.dataset.o) * B;
    else if (el && el.dataset && el.dataset.b && el.classList.contains('on')) start = parseFloat(el.dataset.b) * B;
    a.pause(); a.currentTime = Math.max(0, (t - start) * 1000);
  }
  await Promise.all([...document.querySelectorAll('video')].map(v => new Promise(r => {
    v.pause(); const target = Math.min(t, v.duration - 0.04);
    if (Math.abs(v.currentTime - target) < 0.001) return r();
    v.addEventListener('seeked', r, { once: true }); v.currentTime = target;
  })));
}`
for (const [k, shot] of shots.entries()) {
  if (only && !only.split(',').includes(shot.id)) continue
  const out = `${dir}/frames/${shot.id}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 })
  await page.goto(`file://${dir}/scenes/${shot.id}.html`)
  await page.evaluate(() => window.ready()); await page.addScriptTag({ content: SEEK }); await page.waitForTimeout(300)
  const dur = shot.bars * 4 * beat + (k === shots.length - 1 ? tail : 0)
  const n = Math.round(dur * FPS)
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__seek(t), i / FPS)
    await page.screenshot({ path: `${out}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 })
  }
  console.log(shot.id, n, 'frames', dur.toFixed(3) + 's')
  await page.close()
}
await browser.close()
