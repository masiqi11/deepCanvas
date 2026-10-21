// @vitest-environment jsdom
/** Every component kind renders from a validated description and its local interactions work without the agent. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { CanvasBlock, CanvasSource } from '@deepseek-ai/dsh-canvas-spec'
import { BlockList, PendingBlock, SourceList, pageLocale } from '../src/client/Blocks.tsx'
import { sourceHost } from '../src/client/source-host.ts'
import { CanvasProvider, formatNumber, moduleClass, openExternal, sourceMap, useCanvas, type CanvasEnvironment, type Translate } from '../src/client/context.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const t: Translate = makeTranslate(zh)
const SOURCES: CanvasSource[] = [
  { id: 's1', title: 'Survey', url: 'https://example.com/survey', publisher: 'Lab', published: '2026-01', accessed: '2026-10-20', excerpt: 'Half of students use AI.' },
  { id: 's2', title: 'Report', url: 'https://example.com/report' },
]

function environment(overrides: Partial<CanvasEnvironment> = {}): CanvasEnvironment {
  return {
    t,
    sources: sourceMap(SOURCES),
    sendPrompt: vi.fn(),
    draftPrompt: vi.fn(),
    markdownLabels: { code: { copyLabel: 'c', copiedLabel: 'd', toolbarLabels: { codeLabel: 'code', wrapLabel: 'w', unwrapLabel: 'u' } }, footnotes: 'f' },
    animate: false,
    ...overrides,
  }
}

function show(blocks: CanvasBlock[], overrides: Partial<CanvasEnvironment> = {}) {
  const env = environment(overrides)
  const view = render(<CanvasProvider value={env}><BlockList blocks={blocks} /></CanvasProvider>)
  return { env, view }
}

describe('text and summary components', () => {
  it('renders markdown, headings, callouts, quotes, and evidence with numbered citations', () => {
    show([
      { type: 'markdown', text: '**Bold** text', sources: ['s2'], evidence: 'fact' },
      { type: 'heading', text: 'Market', eyebrow: '01' },
      { type: 'heading', text: 'Plain' },
      { type: 'callout', title: 'Gap', text: 'No size data', tone: 'warning', evidence: 'unverified' },
      { type: 'callout', text: 'Default tone' },
      { type: 'quote', text: 'Quote', by: 'Someone', sources: ['missing'], evidence: 'inference' },
      { type: 'quote', text: 'Anonymous' },
    ])
    expect(screen.getByText('Bold').tagName).toBe('STRONG')
    expect(screen.getByRole('heading', { name: 'Market' })).toBeTruthy()
    expect(screen.getByText('01')).toBeTruthy()
    expect(screen.getByText('有来源')).toBeTruthy()
    expect(screen.getByText('待确认')).toBeTruthy()
    expect(screen.getByText('推断')).toBeTruthy()
    const cite = screen.getByTitle('来源：Report')
    expect(cite.textContent).toBe('2')
    expect(cite.getAttribute('href')).toBe('https://example.com/report')
    expect(screen.getByText('— Someone')).toBeTruthy()
  })

  it('shows stats with units, trends, and notes, and cards with tags and bullets', () => {
    show([
      { type: 'stats', items: [
        { label: 'Users', value: 1_250_000, unit: '人', delta: '+5%', trend: 'up', note: 'n' },
        { label: 'Churn', value: 3, delta: '-1', trend: 'down' },
        { label: 'Flat', value: 'n/a', delta: '0' },
        { label: 'Steady', value: 1, delta: '0', trend: 'flat' },
      ] },
      { type: 'cards', columns: 9, items: [{ title: 'A', text: 't', tag: 'new', tone: 'success', bullets: ['x', 'y'] }, { title: 'B' }] },
      { type: 'cards', items: [{ title: 'C' }] },
    ])
    expect(screen.getByText('人')).toBeTruthy()
    expect(screen.getByText('▲ +5%')).toBeTruthy()
    expect(screen.getByText('▼ -1')).toBeTruthy()
    expect(screen.getByText('n/a')).toBeTruthy()
    expect(screen.getByText('new')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['x', 'y'])
  })
})

describe('table', () => {
  const table: CanvasBlock = {
    type: 'table', caption: 'Compare', filterable: true, highlight: [1], sources: ['s1'],
    columns: [{ label: 'Name' }, { label: 'Price', align: 'right' }, { label: 'Note', align: 'center' }],
    rows: [['Beta', 20, null], ['Alpha', 5, 'x'], ['Gamma', null, 'y'], ['item 10', 7, 'z'], ['item 9', 7, 'w']],
  }

  it('sorts by a column in ascending, descending, then original order', () => {
    show([table])
    const names = (): string[] => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0]?.textContent ?? '')
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma', 'item 10', 'item 9'])
    fireEvent.click(screen.getByRole('button', { name: /Price/ }))
    expect(names()).toEqual(['Alpha', 'item 10', 'item 9', 'Beta', 'Gamma'])
    expect(screen.getByRole('columnheader', { name: /Price/ }).getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(screen.getByRole('button', { name: /Price/ }))
    expect(names()).toEqual(['Gamma', 'Beta', 'item 10', 'item 9', 'Alpha'])
    fireEvent.click(screen.getByRole('button', { name: /Price/ }))
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma', 'item 10', 'item 9'])
    fireEvent.click(screen.getByRole('button', { name: /Name/ }))
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma', 'item 9', 'item 10'])
    fireEvent.click(screen.getByRole('button', { name: /Note/ }))
    expect(names()[4]).toBe('Beta')
  })

  it('filters rows by text and reports the visible count', () => {
    show([table])
    fireEvent.change(screen.getByRole('searchbox', { name: '筛选表格…' }), { target: { value: 'alp' } })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText('1 / 5 行')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('没有匹配的行')).toBeTruthy()
  })

  it('right-aligns numbers by default and sorts empty cells last', () => {
    show([{ type: 'table', columns: [{ label: 'N' }], rows: [[null], [2], [null], [1]] }])
    const cells = (): string[] => screen.getAllByRole('cell').map(cell => cell.textContent ?? '')
    expect((screen.getAllByRole('cell')[1] as HTMLElement).style.textAlign).toBe('right')
    fireEvent.click(screen.getByRole('button', { name: /N/ }))
    expect(cells()).toEqual(['1', '2', '', ''])
  })

  it('renders a plain table without sorting controls', () => {
    show([{ type: 'table', sortable: false, columns: [{ label: 'A' }], rows: [['x']] }])
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
})

describe('grouping and interactive components', () => {
  it('switches tabs, expands accordion details, and lays out columns', () => {
    show([
      { type: 'tabs', tabs: [{ label: 'One', blocks: [{ type: 'markdown', text: 'first' }] }, { label: 'Two', blocks: [{ type: 'markdown', text: 'second' }] }] },
      { type: 'accordion', items: [{ title: 'More', blocks: [{ type: 'markdown', text: 'hidden detail' }] }] },
      { type: 'columns', columns: [[{ type: 'markdown', text: 'left' }], [{ type: 'markdown', text: 'right' }]] },
    ])
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels.map(panel => panel.hidden)).toEqual([false, true])
    fireEvent.click(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tabpanel', { hidden: true }).map(panel => panel.hidden)).toEqual([true, false])
    expect(screen.getByText('More').closest('details')).toBeTruthy()
    expect(screen.getByText('left')).toBeTruthy()
  })

  it('tracks checklist progress locally and numbers ordinary steps', () => {
    show([
      { type: 'steps', checklist: true, items: [{ title: 'A', done: true }, { title: 'B', text: 'detail' }] },
      { type: 'steps', items: [{ title: 'First' }] },
    ])
    expect(screen.getByText('已完成 1 / 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'B' }))
    expect(screen.getByText('已完成 2 / 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    expect(screen.getByText('已完成 1 / 2')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('recomputes calculator outputs as inputs change', () => {
    show([{
      type: 'calculator', note: 'assumptions',
      inputs: [
        { id: 'users', label: 'Users', kind: 'number', default: 10, unit: 'k' },
        { id: 'rate', label: 'Rate', kind: 'slider', default: 5, min: 0, max: 10, step: 1, unit: '%' },
        { id: 'price', label: 'Price', kind: 'select', default: 9, options: [{ label: 'Low', value: 9 }, { label: 'High', value: 29 }] },
        { id: 'empty', label: 'Empty', kind: 'select', default: 1 },
        { id: 'plain', label: 'Plain', kind: 'slider', default: 2 },
      ],
      outputs: [
        { label: 'Revenue', formula: 'users * rate / 100 * price', decimals: 2, unit: 'k¥', emphasis: true },
        { label: 'Users left', formula: 'users - users * rate / 100' },
      ],
    }])
    expect(screen.getByText('计算器')).toBeTruthy()
    const revenue = (): string | null | undefined => document.querySelectorAll('[data-emphasis] > span')[1]?.textContent
    expect(revenue()).toBe('4.50k¥')
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '20' } })
    expect(revenue()).toBe('9.00k¥')
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    expect(revenue()).toBe('9.00k¥')
    fireEvent.change(screen.getAllByRole('slider')[0] as HTMLElement, { target: { value: '10' } })
    expect(revenue()).toBe('18.00k¥')
    fireEvent.change(screen.getAllByRole('combobox')[0] as HTMLElement, { target: { value: '29' } })
    expect(revenue()).toBe('58.00k¥')
    expect(screen.getByText('18')).toBeTruthy()
  })

  it('renders charts and isolated html frames through the block dispatcher', () => {
    show([
      { type: 'chart', kind: 'bar', labels: ['a'], series: [{ name: 'S', values: [1] }], sources: ['s1'] },
      { type: 'html', html: '<p>x</p>', title: 'Frame' },
    ])
    expect(screen.getByRole('img')).toBeTruthy()
    expect(screen.getByTitle('Frame').tagName).toBe('IFRAME')
  })

  it('renders timelines, pros and cons, meters, and quotes', () => {
    show([
      { type: 'timeline', items: [{ time: 'Q1', title: 'Pilot', text: 'small', status: 'current' }, { time: 'Q2', title: 'Scale' }] },
      { type: 'proscons', pros: ['fast'], cons: ['slow'] },
      { type: 'proscons', prosTitle: 'Good', consTitle: 'Bad', pros: ['a'], cons: ['b'] },
      { type: 'meters', items: [{ label: 'Fit', value: 150, note: 'over', sources: ['s1'] }, { label: 'Share', value: 3, max: 10, tone: 'warning' }] },
    ])
    expect(screen.getByText('Q1')).toBeTruthy()
    expect(screen.getByText('优势')).toBeTruthy()
    expect(screen.getByText('Good')).toBeTruthy()
    expect(screen.getByText('3 / 10')).toBeTruthy()
    expect(screen.getByText('over')).toBeTruthy()
  })
})

describe('sources and actions', () => {
  it('numbers registered sources and opens links without granting the opener', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    show([{ type: 'sources', items: [SOURCES[0] as CanvasSource, { id: 'x', title: 'Unregistered', url: 'https://example.com/x' }] }])
    expect(screen.getByText('来源')).toBeTruthy()
    expect(screen.getByText('Lab · 发布于 2026-01 · 访问于 2026-10-20')).toBeTruthy()
    fireEvent.click(screen.getByText('Survey'))
    expect(open).toHaveBeenCalledWith('https://example.com/survey', '_blank', 'noopener,noreferrer')
    expect(screen.getAllByRole('listitem').map(item => item.getAttribute('value'))).toEqual(['1', null])
  })

  it('sends a follow-up prompt and disables actions when no agent is reachable', () => {
    const { env } = show([{ type: 'actions', items: [{ label: 'Dig in', prompt: 'Analyze A' }] }])
    fireEvent.click(screen.getByRole('button', { name: /Dig in/ }))
    expect(env.sendPrompt).toHaveBeenCalledWith('Analyze A')
    cleanup()
    show([{ type: 'actions', items: [{ label: 'Dig in', prompt: 'Analyze A' }] }], { sendPrompt: undefined })
    expect(screen.getByRole('button', { name: /Dig in/ }).hasAttribute('disabled')).toBe(true)
  })

  it('titles a source list from its block and summarizes it as publisher chips', () => {
    render(<CanvasProvider value={environment()}><SourceList title="Refs" items={[SOURCES[1] as CanvasSource, SOURCES[0] as CanvasSource]} /></CanvasProvider>)
    expect(screen.getByText('Refs')).toBeTruthy()
    expect(screen.getByText('2', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('2 example.com')).toBeTruthy()
    expect(screen.getByText('1 Lab')).toBeTruthy()
  })

  it('labels a source by host, falling back to the raw URL', () => {
    expect(sourceHost('https://www.gsmarena.com/x')).toBe('gsmarena.com')
    expect(sourceHost('not a url')).toBe('not a url')
  })
})

describe('helpers', () => {
  it('formats numbers compactly, with fixed digits, and marks non-finite values', () => {
    expect(formatNumber(1234.567, 'en')).toBe('1,234.57')
    expect(formatNumber(2_500_000, 'en')).toBe('2.5M')
    expect(formatNumber(3, 'en', 2)).toBe('3.00')
    expect(formatNumber(3, 'en', 99)).toBe('3.0000000000')
    expect(formatNumber(Number.NaN, 'en')).toBe('—')
  })

  it('maps unknown module class names to no class', () => {
    expect(moduleClass({ a: 'hashed' }, 'a')).toBe('hashed')
    expect(moduleClass({}, 'missing')).toBe('')
  })

  it('keeps the first source of a duplicated id and ignores unsafe link schemes', () => {
    const map = sourceMap([{ id: 'a', title: 'first', url: 'https://a' }], undefined, [{ id: 'a', title: 'second', url: 'https://b' }])
    expect(map.get('a')?.title).toBe('first')
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    openExternal('javascript:alert(1)')
    expect(open).not.toHaveBeenCalled()
  })

  it('reads the document language and requires a provider', () => {
    document.documentElement.lang = ''
    expect(pageLocale()).toBe('zh-CN')
    document.documentElement.lang = 'en'
    expect(pageLocale()).toBe('en')
    const Probe = () => { useCanvas(); return null }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('outside CanvasProvider')
  })

  it('renders streaming placeholders', () => {
    render(<CanvasProvider value={environment()}><PendingBlock /></CanvasProvider>)
    expect(screen.getByRole('status', { name: '正在生成…' })).toBeTruthy()
  })

  it('animates blocks only when the environment allows it', () => {
    const { view } = show([{ type: 'markdown', text: 'x' }], { animate: true })
    expect(view.container.querySelector('[data-animate]')).toBeTruthy()
  })
})
