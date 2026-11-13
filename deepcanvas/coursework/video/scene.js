// Cue runner for motion scenes: window.play([t0, t1, ...]) fires cue i at t_i seconds.
(() => {
  const ease = t => 1 - Math.pow(1 - t, 3)
  function count(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), dur = +(el.dataset.dur || 1.4) * 1000
    const pre = el.dataset.pre || '', post = el.dataset.post || ''
    const t0 = performance.now()
    const step = now => {
      const k = Math.min(1, (now - t0) / dur)
      el.textContent = pre + (to * ease(k)).toFixed(dec) + post
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function grow(el) {
    el.style.transition = `${el.dataset.axis === 'y' ? 'height' : 'width'} ${el.dataset.dur || 1.2}s cubic-bezier(.2,.7,.1,1) ${el.style.getPropertyValue('--d') || '0s'}`
    requestAnimationFrame(() => { el.style[el.dataset.axis === 'y' ? 'height' : 'width'] = el.dataset.grow })
  }
  function type(el) {
    const full = el.dataset.text, dur = +(el.dataset.dur || 3) * 1000, t0 = performance.now()
    const step = now => {
      const k = Math.min(1, (now - t0) / dur)
      el.textContent = full.slice(0, Math.round(full.length * k))
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function fire(i) {
    document.querySelectorAll(`[data-cue="${i}"]`).forEach(el => {
      el.classList.add('on')
      if (el.dataset.count) setTimeout(() => count(el), parseFloat(el.style.getPropertyValue('--d') || '0') * 1000)
      if (el.dataset.text) type(el)
      el.querySelectorAll('[data-count]').forEach(c => setTimeout(() => count(c), parseFloat(c.style.getPropertyValue('--d') || '0') * 1000))
      el.querySelectorAll('[data-text]').forEach(type)
    })
    document.querySelectorAll(`[data-grow-cue="${i}"]`).forEach(grow)
    document.querySelectorAll(`[data-count-cue="${i}"]`).forEach(count)
    document.querySelectorAll(`[data-out="${i}"]`).forEach(el => el.classList.add('out'))
    document.querySelectorAll(`[data-lit]`).forEach(el => el.classList.toggle('lit', el.dataset.lit.split(',').includes(String(i))))
    document.querySelectorAll(`[data-dim]`).forEach(el => el.classList.toggle('dimmed', el.dataset.dim.split(',').includes(String(i))))
    if (window.onCue && window.onCue[i]) window.onCue[i]()
  }
  window.play = cues => { cues.forEach((t, i) => setTimeout(() => fire(i), t * 1000)) }
})()
