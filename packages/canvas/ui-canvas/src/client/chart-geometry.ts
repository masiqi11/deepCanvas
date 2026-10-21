/** Axis and arc geometry for canvas charts. */

/** Round a span up to a readable tick step. */
function niceStep(span: number, ticks: number): number {
  const raw = span / ticks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const residual = raw / magnitude
  const nice = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1
  return nice * magnitude
}

/**
 * Compute an axis domain that includes zero and ends on tick steps.
 * @param values - every plotted value.
 * @returns the domain bounds and tick values.
 */
export function axisDomain(values: readonly number[]): { min: number; max: number; ticks: number[] } {
  let low = Math.min(0, ...values)
  let high = Math.max(0, ...values)
  if (low === high) high = low + 1
  const step = niceStep(high - low, 4)
  low = Math.floor(low / step) * step
  high = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let tick = low; tick <= high + step / 2; tick += step) ticks.push(Number(tick.toPrecision(12)))
  return { min: low, max: high, ticks }
}

/**
 * SVG arc path along a circle, clockwise from the top.
 * @param cx - center x.
 * @param cy - center y.
 * @param r - radius.
 * @param start - start angle in radians.
 * @param end - end angle in radians.
 * @returns the path data.
 */
export function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const point = (angle: number): string => `${(cx + r * Math.sin(angle)).toFixed(2)},${(cy - r * Math.cos(angle)).toFixed(2)}`
  const large = end - start > Math.PI ? 1 : 0
  return `M${point(start)} A${r},${r} 0 ${large} 1 ${point(end)}`
}
