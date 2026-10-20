/** Native SVG charts for chart blocks. */
import { useMemo, useState } from 'react'
import type { ChartBlock } from '@deepseek-ai/dsh-canvas-spec'
import { formatNumber, moduleClass } from './context.tsx'
import { arc, axisDomain } from './chart-geometry.ts'
import css from './Canvas.module.css'

/** Palette slots; colors come from CSS so both themes stay legible. */
const PALETTE_SIZE = 8

const WIDTH = 560
const HEIGHT = 260
const PAD = { top: 14, right: 14, bottom: 40, left: 52 }

/** Slot class for series or slice index. */
function color(index: number): string {
  return moduleClass(css, `c${index % PALETTE_SIZE}`)
}

/**
 * Render a validated chart block.
 * @param props - the chart and the display locale.
 * @returns a figure with the chart, legend, and accessible values.
 */
export function Chart({ block, locale }: { block: ChartBlock; locale: string }) {
  const [focus, setFocus] = useState<number | null>(null)
  const pie = block.kind === 'pie' || block.kind === 'donut'
  const legend = pie ? block.labels : block.series.map(series => series.name)
  return (
    <figure className={css.chart} data-kind={block.kind}>
      {block.title !== undefined && (
        <figcaption className={css.chartTitle}>
          {block.title}{block.unit !== undefined && <span className={css.unit}> · {block.unit}</span>}
        </figcaption>
      )}
      {pie ? <PieChart block={block} locale={locale} focus={focus} setFocus={setFocus} />
        : block.horizontal === true && block.kind === 'bar' ? <HorizontalBars block={block} locale={locale} focus={focus} />
          : <CartesianChart block={block} locale={locale} focus={focus} />}
      {legend.length > 1 && (
        <ul className={css.legend}>
          {legend.map((name, index) => (
            <li key={`${name}-${index}`}>
              <button type="button" className={css.legendItem} data-dim={focus !== null && focus !== index ? '' : undefined}
                onMouseEnter={() => { setFocus(index) }} onMouseLeave={() => { setFocus(null) }}
                onFocus={() => { setFocus(index) }} onBlur={() => { setFocus(null) }}>
                <span className={`${css.swatch} ${color(index)}`} />{name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {block.note !== undefined && <p className={css.chartNote}>{block.note}</p>}
    </figure>
  )
}

/** Sum of the earlier series at one label, the baseline of a stacked mark. */
function stackBase(block: ChartBlock, seriesIndex: number, index: number): number {
  return block.series.slice(0, seriesIndex).reduce((sum, earlier) => sum + (earlier.values[index] ?? 0), 0)
}

interface PlotProps {
  readonly block: ChartBlock
  readonly locale: string
  readonly focus: number | null
}

function CartesianChart({ block, locale, focus }: PlotProps) {
  const stacked = block.stacked === true && block.kind !== 'line'
  const totals = useMemo(() => block.labels.map((_, i) => block.series.reduce((sum, series) => sum + (series.values[i] ?? 0), 0)), [block])
  const domain = useMemo(() => axisDomain(stacked ? totals : block.series.flatMap(series => series.values)), [block, stacked, totals])
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const y = (value: number): number => PAD.top + plotH - ((value - domain.min) / (domain.max - domain.min)) * plotH
  const band = plotW / Math.max(block.labels.length, 1)
  const x = (index: number): number => PAD.left + band * index + band / 2
  const labelEvery = Math.ceil(block.labels.length / 12)
  return (
    <svg className={css.svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={block.title ?? block.series.map(series => series.name).join(', ')}>
      {domain.ticks.map(tick => (
        <g key={tick}>
          <line className={tick === 0 ? css.axisZero : css.grid} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text className={css.tick} x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{formatNumber(tick, locale)}</text>
        </g>
      ))}
      {block.labels.map((label, index) => index % labelEvery === 0 && (
        <text key={`${label}-${index}`} className={css.tick} x={x(index)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle">{label.length > 14 ? `${label.slice(0, 13)}…` : label}</text>
      ))}
      {block.kind === 'bar' ? (
        block.series.map((series, seriesIndex) => {
          const groupWidth = band * 0.72
          const barWidth = stacked ? groupWidth : groupWidth / block.series.length
          return (
            <g key={series.name} className={`${css.series} ${color(seriesIndex)}`} data-dim={focus !== null && focus !== seriesIndex ? '' : undefined}>
              {series.values.map((value, index) => {
                const base = stacked ? stackBase(block, seriesIndex, index) : 0
                const top = y(base + value)
                const bottom = y(base)
                const left = x(index) - groupWidth / 2 + (stacked ? 0 : barWidth * seriesIndex)
                return (
                  <rect key={index} className={css.bar} x={left + 1} width={Math.max(barWidth - 2, 1)}
                    y={Math.min(top, bottom)} height={Math.max(Math.abs(bottom - top), 0.5)} rx={3}
                    style={{ animationDelay: `${index * 40}ms` }}>
                    <title>{`${series.name} · ${block.labels[index] ?? ''}: ${formatNumber(value, locale)}${block.unit ?? ''}`}</title>
                  </rect>
                )
              })}
            </g>
          )
        })
      ) : (
        block.series.map((series, seriesIndex) => {
          const points = series.values.map((value, index) => {
            const base = stacked ? stackBase(block, seriesIndex, index) : 0
            return { x: x(index), y: y(base + value), base: y(base), value }
          })
          const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
          const area = block.kind === 'area'
            ? `${line} ${points.slice().reverse().map(point => `L${point.x.toFixed(1)},${point.base.toFixed(1)}`).join(' ')} Z`
            : undefined
          return (
            <g key={series.name} className={`${css.series} ${color(seriesIndex)}`} data-dim={focus !== null && focus !== seriesIndex ? '' : undefined}>
              {area !== undefined && <path className={css.area} d={area} />}
              <path className={css.line} d={line} pathLength={1} />
              {points.map((point, index) => (
                <circle key={index} className={css.point} cx={point.x} cy={point.y} r={3.5}>
                  <title>{`${series.name} · ${block.labels[index] ?? ''}: ${formatNumber(point.value, locale)}${block.unit ?? ''}`}</title>
                </circle>
              ))}
            </g>
          )
        })
      )}
    </svg>
  )
}

function HorizontalBars({ block, locale, focus }: PlotProps) {
  const values = block.series.flatMap(series => series.values)
  const max = Math.max(...values.map(Math.abs), 1)
  return (
    <div className={css.hbars} role="img" aria-label={block.title ?? block.series.map(series => series.name).join(', ')}>
      {block.labels.map((label, index) => (
        <div key={`${label}-${index}`} className={css.hbarRow}>
          <span className={css.hbarLabel} title={label}>{label}</span>
          <span className={css.hbarTracks}>
            {block.series.map((series, seriesIndex) => {
              const value = series.values[index] ?? 0
              return (
                <span key={series.name} className={`${css.hbarTrack} ${color(seriesIndex)}`} data-dim={focus !== null && focus !== seriesIndex ? '' : undefined}>
                  <span className={css.hbarFill} style={{ width: `${(Math.abs(value) / max) * 100}%`, animationDelay: `${index * 40}ms` }} />
                  <span className={css.hbarValue}>{formatNumber(value, locale)}{block.unit ?? ''}</span>
                </span>
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

function PieChart({ block, locale, focus, setFocus }: PlotProps & { setFocus: (index: number | null) => void }) {
  const values = block.series[0]?.values ?? []
  const total = values.reduce((sum, value) => sum + value, 0)
  const size = 240
  const r = 96
  const c = size / 2
  let angle = 0
  return (
    <div className={css.pie}>
      <svg className={css.pieSvg} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={block.title ?? block.series[0]?.name ?? ''}>
        {total === 0 ? <circle className={css.grid} cx={c} cy={c} r={r} fill="none" /> : values.map((value, index) => {
          const start = angle
          angle += (value / total) * Math.PI * 2
          const end = Math.min(angle, start + Math.PI * 2 - 0.0001)
          return (
            <path key={index} className={`${css.slice} ${color(index)}`} d={arc(c, c, block.kind === 'donut' ? r - 17 : r / 2, start, end)}
              strokeWidth={block.kind === 'donut' ? 34 : r} fill="none"
              data-dim={focus !== null && focus !== index ? '' : undefined}
              onMouseEnter={() => { setFocus(index) }} onMouseLeave={() => { setFocus(null) }}>
              <title>{`${block.labels[index] ?? ''}: ${formatNumber(value, locale)}${block.unit ?? ''} (${formatNumber((value / total) * 100, locale, 1)}%)`}</title>
            </path>
          )
        })}
        {block.kind === 'donut' && total > 0 && (
          <text className={css.pieCenter} x={c} y={c} textAnchor="middle" dominantBaseline="middle">
            {focus === null ? formatNumber(total, locale) : `${formatNumber(((values[focus] ?? 0) / total) * 100, locale, 1)}%`}
          </text>
        )}
      </svg>
    </div>
  )
}
