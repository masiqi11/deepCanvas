/** Renderers for every canvas component kind. */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  evaluateFormula, parseFormula, type AccordionBlock, type ActionsBlock, type CalculatorBlock, type CanvasBlock,
  type CanvasSource, type CardsBlock, type Cited, type MetersBlock, type ProsConsBlock, type StatsBlock, type StepsBlock,
  type TableBlock, type TableCell, type TabsBlock, type TimelineBlock, type Tone,
} from '@deepseek-ai/dsh-canvas-spec'
import { Chart } from './Chart.tsx'
import { formatNumber, moduleClass, openExternal, useCanvas } from './context.tsx'
import { HtmlFrame } from './HtmlFrame.tsx'
import { sourceHost } from './source-host.ts'
import css from './Canvas.module.css'

/**
 * Locale used for number formatting: the document language chosen by the locale plugin.
 * @returns a BCP 47 tag.
 */
export function pageLocale(): string {
  return document.documentElement.lang === '' ? 'zh-CN' : document.documentElement.lang
}

function toneClass(tone: Tone): string {
  return moduleClass(css, `tone_${tone}`)
}

/**
 * Render a block list with staggered entrance.
 * @param props - blocks in display order.
 * @returns the rendered list.
 */
export function BlockList({ blocks }: { blocks: readonly CanvasBlock[] }) {
  return <div className={css.blocks}>{blocks.map((block, index) => <BlockView key={index} block={block} index={index} />)}</div>
}

/**
 * Render one validated block.
 * @param props - block and its position for the entrance stagger.
 * @returns the component element.
 */
export function BlockView({ block, index }: { block: CanvasBlock; index: number }) {
  const { animate } = useCanvas()
  return (
    <div className={css.block} data-type={block.type} data-animate={animate ? '' : undefined}
      style={{ '--cv-index': Math.min(index, 12) } as CSSProperties}>
      <BlockBody block={block} />
    </div>
  )
}

function BlockBody({ block }: { block: CanvasBlock }) {
  switch (block.type) {
    case 'markdown': return <><Markdown text={block.text} /><Citations cited={block} /></>
    case 'heading': return (
      <div className={css.heading}>
        {block.eyebrow !== undefined && <span className={css.eyebrow}>{block.eyebrow}</span>}
        <h3>{block.text}</h3>
      </div>
    )
    case 'callout': return (
      <aside className={`${css.callout} ${toneClass(block.tone ?? 'info')}`}>
        {block.title !== undefined && <strong className={css.calloutTitle}>{block.title}</strong>}
        <Markdown text={block.text} compact />
        <Citations cited={block} />
      </aside>
    )
    case 'stats': return <Stats block={block} />
    case 'cards': return <Cards block={block} />
    case 'table': return <Table block={block} />
    case 'chart': return <><Chart block={block} locale={pageLocale()} /><Citations cited={block} /></>
    case 'timeline': return <Timeline block={block} />
    case 'steps': return <Steps block={block} />
    case 'tabs': return <Tabs block={block} />
    case 'accordion': return <Accordion block={block} />
    case 'columns': return (
      <div className={css.columns} style={{ '--cv-columns': block.columns.length } as CSSProperties}>
        {block.columns.map((column, index) => <BlockList key={index} blocks={column} />)}
      </div>
    )
    case 'proscons': return <ProsCons block={block} />
    case 'meters': return <Meters block={block} />
    case 'calculator': return <Calculator block={block} />
    case 'quote': return (
      <blockquote className={css.quote}>
        <p>{block.text}</p>
        {block.by !== undefined && <footer>— {block.by}</footer>}
        <Citations cited={block} />
      </blockquote>
    )
    case 'sources': return <SourceList title={block.title} items={block.items} />
    case 'actions': return <Actions block={block} />
    case 'html': return <HtmlFrame block={block} />
  }
}

/**
 * Render Markdown with the canvas labels.
 * @param props - source text and density.
 * @returns the Markdown element.
 */
export function Markdown({ text, compact = false }: { text: string; compact?: boolean }) {
  const { markdownLabels } = useCanvas()
  return <MarkdownText text={text} labels={markdownLabels} variant={compact ? 'compact' : 'body'} />
}

/**
 * Evidence badge and numbered source chips for one cited statement.
 * @param props - the cited fields.
 * @returns the badge row, or null when nothing is cited.
 */
export function Citations({ cited }: { cited: Cited }) {
  const { t, sources } = useCanvas()
  const ids = cited.sources ?? []
  if (ids.length === 0 && cited.evidence === undefined) return null
  const order = [...sources.keys()]
  return (
    <span className={css.citations}>
      {cited.evidence !== undefined && <span className={css.evidence} data-evidence={cited.evidence}>{t(`evidence.${cited.evidence}`)}</span>}
      {ids.map((id) => {
        const source = sources.get(id)
        if (source === undefined) return null
        return (
          <a key={id} className={css.cite} href={source.url} target="_blank" rel="noopener noreferrer"
            title={t('sources.cite', { title: source.title })}>{order.indexOf(id) + 1}</a>
        )
      })}
    </span>
  )
}

function Stats({ block }: { block: StatsBlock }) {
  const locale = pageLocale()
  return (
    <div className={css.stats} style={{ '--cv-count': block.items.length } as CSSProperties}>
      {block.items.map((item, index) => (
        <div key={index} className={css.stat}>
          <span className={css.statLabel}>{item.label}</span>
          <span className={css.statValue}>
            {typeof item.value === 'number' ? formatNumber(item.value, locale) : item.value}
            {item.unit !== undefined && <span className={css.statUnit}>{item.unit}</span>}
          </span>
          {item.delta !== undefined && <span className={css.delta} data-trend={item.trend ?? 'flat'}>{item.trend === 'up' ? '▲ ' : item.trend === 'down' ? '▼ ' : ''}{item.delta}</span>}
          {item.note !== undefined && <span className={css.statNote}>{item.note}</span>}
          <Citations cited={item} />
        </div>
      ))}
    </div>
  )
}

function Cards({ block }: { block: CardsBlock }) {
  const columns = Math.min(Math.max(Math.trunc(block.columns ?? Math.min(block.items.length, 3)), 1), 4)
  return (
    <div className={css.cards} style={{ '--cv-columns': columns } as CSSProperties}>
      {block.items.map((item, index) => (
        <article key={index} className={`${css.card} ${item.tone === undefined ? '' : toneClass(item.tone)}`}>
          <header className={css.cardHeader}>
            <h4>{item.title}</h4>
            {item.tag !== undefined && <span className={css.tag}>{item.tag}</span>}
          </header>
          {item.text !== undefined && <Markdown text={item.text} compact />}
          {item.bullets !== undefined && <ul className={css.bullets}>{item.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul>}
          <Citations cited={item} />
        </article>
      ))}
    </div>
  )
}

function cellText(cell: TableCell, locale: string): string {
  if (cell === null) return ''
  return typeof cell === 'number' ? formatNumber(cell, locale) : cell
}

function compareCells(a: TableCell, b: TableCell): number {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** Cycle a column through ascending, descending, and unsorted. */
function nextSort(sort: { column: number; descending: boolean } | null, column: number): { column: number; descending: boolean } | null {
  if (sort?.column !== column) return { column, descending: false }
  return sort.descending ? null : { column, descending: true }
}

function Table({ block }: { block: TableBlock }) {
  const { t } = useCanvas()
  const locale = pageLocale()
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null)
  const [filter, setFilter] = useState('')
  const highlighted = useMemo(() => new Set(block.highlight ?? []), [block.highlight])
  const rows = useMemo(() => {
    const indexed = block.rows.map((row, index) => ({ row, index }))
    const needle = filter.trim().toLowerCase()
    const filtered = needle === '' ? indexed : indexed.filter(({ row }) => row.some(cell => cellText(cell, locale).toLowerCase().includes(needle)))
    if (sort === null) return filtered
    const direction = sort.descending ? -1 : 1
    return filtered.slice().sort((a, b) => compareCells(a.row[sort.column] ?? null, b.row[sort.column] ?? null) * direction)
  }, [block.rows, filter, sort, locale])
  const sortable = block.sortable !== false
  return (
    <div className={css.tableWrap}>
      {(block.filterable === true || block.caption !== undefined) && (
        <div className={css.tableTools}>
          {block.caption !== undefined && <span className={css.caption}>{block.caption}</span>}
          {block.filterable === true && (
            <input className={css.filter} type="search" value={filter} placeholder={t('table.filter')} aria-label={t('table.filter')}
              onChange={(event) => { setFilter(event.target.value) }} />
          )}
        </div>
      )}
      <div className={css.tableScroll}>
        <table className={css.table}>
          <thead>
            <tr>
              {block.columns.map((column, index) => {
                const active = sort?.column === index
                return (
                  <th key={index} style={{ textAlign: column.align ?? 'left' }} aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}>
                    {sortable ? (
                      <button type="button" className={css.sortButton}
                        title={active && !sort.descending ? t('table.sortDescending') : t('table.sortAscending')}
                        onClick={() => { setSort(nextSort(sort, index)) }}>
                        {column.label}<span className={css.sortMark} data-active={active ? '' : undefined}>{active ? (sort.descending ? '↓' : '↑') : '↕'}</span>
                      </button>
                    ) : column.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, index }) => (
              <tr key={index} data-highlight={highlighted.has(index) ? '' : undefined}>
                {block.columns.map((column, cellIndex) => {
                  const cell = row[cellIndex] ?? null
                  return <td key={cellIndex} style={{ textAlign: column.align ?? (typeof cell === 'number' ? 'right' : 'left') }}>{cellText(cell, locale)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={css.muted}>{t('table.empty')}</p>}
      </div>
      <div className={css.tableFoot}>
        {filter.trim() !== '' && <span className={css.muted}>{t('table.rows', { shown: rows.length, total: block.rows.length })}</span>}
        <Citations cited={block} />
      </div>
    </div>
  )
}

function Timeline({ block }: { block: TimelineBlock }) {
  return (
    <ol className={css.timeline}>
      {block.items.map((item, index) => (
        <li key={index} className={css.timelineItem} data-status={item.status ?? 'upcoming'}>
          <span className={css.timelineDot} />
          <div className={css.timelineBody}>
            <span className={css.timelineTime}>{item.time}</span>
            <strong>{item.title}</strong>
            {item.text !== undefined && <Markdown text={item.text} compact />}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Steps({ block }: { block: StepsBlock }) {
  const { t } = useCanvas()
  const [done, setDone] = useState(() => block.items.map(item => item.done === true))
  const count = done.filter(Boolean).length
  return (
    <div className={css.steps}>
      {block.checklist === true && (
        <div className={css.progressRow}>
          <span className={css.muted}>{t('steps.progress', { done: count, total: block.items.length })}</span>
          <span className={css.progressTrack}><span className={css.progressFill} style={{ width: `${(count / block.items.length) * 100}%` }} /></span>
        </div>
      )}
      <ol className={css.stepList}>
        {block.items.map((item, index) => (
          <li key={index} className={css.step} data-done={done[index] === true ? '' : undefined}>
            {block.checklist === true ? (
              <input type="checkbox" className={css.check} checked={done[index] === true} aria-label={item.title}
                onChange={() => { setDone(current => current.map((value, i) => i === index ? !value : value)) }} />
            ) : <span className={css.stepNumber}>{index + 1}</span>}
            <div>
              <strong>{item.title}</strong>
              {item.text !== undefined && <Markdown text={item.text} compact />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Tabs({ block }: { block: TabsBlock }) {
  const [active, setActive] = useState(0)
  return (
    <div className={css.tabs}>
      <div className={css.tabBar} role="tablist">
        {block.tabs.map((tab, index) => (
          <button key={index} type="button" role="tab" aria-selected={index === active} className={css.tab}
            onClick={() => { setActive(index) }}>{tab.label}</button>
        ))}
      </div>
      {block.tabs.map((tab, index) => (
        <div key={index} role="tabpanel" hidden={index !== active} data-tab-label={tab.label} className={css.tabPanel}>
          <BlockList blocks={tab.blocks} />
        </div>
      ))}
    </div>
  )
}

function Accordion({ block }: { block: AccordionBlock }) {
  return (
    <div className={css.accordion}>
      {block.items.map((item, index) => (
        <details key={index} className={css.details}>
          <summary>{item.title}</summary>
          <div className={css.detailsBody}><BlockList blocks={item.blocks} /></div>
        </details>
      ))}
    </div>
  )
}

function ProsCons({ block }: { block: ProsConsBlock }) {
  const { t } = useCanvas()
  return (
    <div className={css.proscons}>
      <section className={`${css.prosconsColumn} ${css.tone_success}`}>
        <h4>{block.prosTitle ?? t('proscons.pros')}</h4>
        <ul>{block.pros.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
      </section>
      <section className={`${css.prosconsColumn} ${css.tone_danger}`}>
        <h4>{block.consTitle ?? t('proscons.cons')}</h4>
        <ul>{block.cons.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
      </section>
    </div>
  )
}

function Meters({ block }: { block: MetersBlock }) {
  const locale = pageLocale()
  return (
    <div className={css.meters}>
      {block.items.map((item, index) => {
        const max = item.max ?? 100
        const share = Math.min(Math.max(item.value / max, 0), 1)
        return (
          <div key={index} className={`${css.meter} ${toneClass(item.tone ?? 'info')}`}>
            <div className={css.meterHead}>
              <span>{item.label}</span>
              <Citations cited={item} />
              <span className={css.meterValue}>{formatNumber(item.value, locale)}{max === 100 ? '' : ` / ${formatNumber(max, locale)}`}</span>
            </div>
            <span className={css.meterTrack}><span className={css.meterFill} style={{ width: `${share * 100}%`, animationDelay: `${index * 60}ms` }} /></span>
            {item.note !== undefined && <span className={css.muted}>{item.note}</span>}
          </div>
        )
      })}
    </div>
  )
}

function Calculator({ block }: { block: CalculatorBlock }) {
  const { t } = useCanvas()
  const locale = pageLocale()
  // Inputs not yet edited read their defaults; edits override them by id.
  const [edits, setEdits] = useState<Readonly<Record<string, number>>>({})
  const values = useMemo(
    () => ({ ...Object.fromEntries(block.inputs.map(input => [input.id, input.default])), ...edits }),
    [block.inputs, edits],
  )
  const outputs = useMemo(() => block.outputs.map(output => ({ output, formula: parseFormula(output.formula) })), [block.outputs])
  const set = (id: string, value: number): void => { setEdits(current => ({ ...current, [id]: value })) }
  return (
    <section className={css.calculator}>
      <h4 className={css.calculatorTitle}>{block.title ?? t('calculator.title')}</h4>
      <div className={css.calculatorGrid}>
        <div className={css.calculatorInputs}>
          {block.inputs.map((input) => {
            const value = Object.hasOwn(edits, input.id) ? edits[input.id] as number : input.default
            return (
              <label key={input.id} className={css.field}>
                <span className={css.fieldLabel}>{input.label}{input.kind === 'slider' && <span className={css.fieldValue}>{formatNumber(value, locale)}{input.unit ?? ''}</span>}</span>
                {input.kind === 'select' ? (
                  <select className={css.input} value={value} onChange={(event) => { set(input.id, Number(event.target.value)) }}>
                    {(input.options ?? []).map(option => <option key={option.label} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <span className={css.inputRow}>
                    {input.kind === 'slider' ? (
                      <input className={css.slider} type="range" value={value} min={input.min} max={input.max} step={input.step ?? 'any'}
                        onChange={(event) => { set(input.id, Number(event.target.value)) }} />
                    ) : (
                      // Uncontrolled so the reader can clear the field while typing; blank text keeps the last value.
                      <input className={css.input} type="number" defaultValue={input.default} min={input.min} max={input.max} step={input.step ?? 'any'}
                        onChange={(event) => { if (event.target.value.trim() !== '') set(input.id, Number(event.target.value)) }} />
                    )}
                    {input.kind === 'number' && input.unit !== undefined && <span className={css.muted}>{input.unit}</span>}
                  </span>
                )}
              </label>
            )
          })}
        </div>
        <div className={css.calculatorOutputs}>
          {outputs.map(({ output, formula }, index) => (
            <div key={index} className={css.output} data-emphasis={output.emphasis === true ? '' : undefined}>
              <span className={css.statLabel}>{output.label}</span>
              <span className={css.outputValue}>
                {formatNumber(evaluateFormula(formula, values), locale, output.decimals)}
                {output.unit !== undefined && <span className={css.statUnit}>{output.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
      {block.note !== undefined && <p className={css.muted}>{block.note}</p>}
    </section>
  )
}

/**
 * Numbered source list, collapsed to one row of publisher chips; opening it
 * shows links, dates, and supporting excerpts.
 * @param props - optional heading and the sources.
 * @returns the disclosure element.
 */
export function SourceList({ title, items }: { title?: string | undefined; items: readonly CanvasSource[] }) {
  const { t, sources } = useCanvas()
  const order = [...sources.keys()]
  const number = (id: string): number | undefined => order.includes(id) ? order.indexOf(id) + 1 : undefined
  return (
    <details className={css.sources}>
      <summary>
        <span className={css.sourcesTitle}>{title ?? t('sources.title')}</span>
        <span className={css.sourceCount}>{items.length}</span>
        <span className={css.sourceChips}>
          {items.map(source => (
            <span key={source.id} className={css.sourceChip}>{number(source.id)} {source.publisher ?? sourceHost(source.url)}</span>
          ))}
        </span>
      </summary>
      <ol>
        {items.map(source => (
          <li key={source.id} value={number(source.id)}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={(event) => { event.preventDefault(); openExternal(source.url) }}>{source.title}</a>
            <span className={css.sourceMeta}>
              {[source.publisher, source.published === undefined ? undefined : t('sources.published', { date: source.published }),
                source.accessed === undefined ? undefined : t('sources.accessed', { date: source.accessed })].filter(Boolean).join(' · ')}
            </span>
            {source.excerpt !== undefined && <q className={css.excerpt}>{source.excerpt}</q>}
          </li>
        ))}
      </ol>
    </details>
  )
}

function Actions({ block }: { block: ActionsBlock }) {
  const { t, sendPrompt } = useCanvas()
  return (
    <div className={css.actions}>
      <span className={css.actionsTitle}>{t('actions.title')}</span>
      <div className={css.actionRow}>
        {block.items.map((item, index) => (
          <button key={index} type="button" className={css.action} data-cv-action="" disabled={sendPrompt === undefined}
            title={item.prompt} onClick={() => { sendPrompt?.(item.prompt) }}>{item.label} <span aria-hidden="true">→</span></button>
        ))}
      </div>
    </div>
  )
}

/**
 * Placeholder for a block still streaming.
 * @returns a skeleton.
 */
export function PendingBlock(): ReactNode {
  const { t } = useCanvas()
  return <div className={css.skeleton} role="status" aria-label={t('block.pending')}><span /><span /><span /></div>
}
