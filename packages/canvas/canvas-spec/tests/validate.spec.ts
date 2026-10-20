import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIMITS, validateBlock, validateBoard, validateInline, validateSection, type CanvasBlock, type Validation,
} from '../src/index.ts'

const source = { id: 's1', title: 'Report', url: 'https://example.com/report', excerpt: 'Users grew 20%.' }

/** One valid example of every component kind. */
const EVERY_BLOCK: CanvasBlock[] = [
  { type: 'markdown', text: 'Intro', sources: ['s1'], evidence: 'fact' },
  { type: 'heading', text: 'Market', eyebrow: '01' },
  { type: 'callout', tone: 'warning', title: 'Gap', text: 'No reliable market size.', evidence: 'unverified' },
  { type: 'stats', items: [{ label: 'Users', value: 120, unit: 'M', delta: '+20%', trend: 'up', note: '2025', sources: ['s1'] }, { label: 'Share', value: 'n/a' }] },
  { type: 'cards', columns: 2, items: [{ title: 'A', text: 't', tag: 'new', tone: 'success', bullets: ['x'] }] },
  { type: 'table', caption: 'Compare', columns: [{ label: 'Name' }, { label: 'Price', align: 'right' }], rows: [['A', 1], ['B', null]], highlight: [1], sortable: true, filterable: true },
  { type: 'chart', kind: 'bar', title: 'Growth', labels: ['2024', '2025'], series: [{ name: 'Users', values: [1, 2] }], unit: 'M', stacked: false, horizontal: true, note: 'n' },
  { type: 'chart', kind: 'pie', labels: ['a', 'b'], series: [{ name: 'Share', values: [60, 40] }] },
  { type: 'timeline', items: [{ time: '2024', title: 'Launch', text: 't', status: 'done' }] },
  { type: 'steps', checklist: true, items: [{ title: 'Do', text: 't', done: true }] },
  { type: 'tabs', tabs: [{ label: 'One', blocks: [{ type: 'markdown', text: 'a' }] }] },
  { type: 'accordion', items: [{ title: 'More', blocks: [{ type: 'quote', text: 'q', by: 'x' }] }] },
  { type: 'columns', columns: [[{ type: 'markdown', text: 'left' }], [{ type: 'markdown', text: 'right' }]] },
  { type: 'proscons', prosTitle: 'Good', consTitle: 'Bad', pros: ['fast'], cons: ['costly'] },
  { type: 'meters', items: [{ label: 'Fit', value: 70, max: 100, tone: 'info', note: 'n' }] },
  {
    type: 'calculator', title: 'Revenue', note: 'n',
    inputs: [
      { id: 'users', label: 'Users', kind: 'slider', default: 100, min: 0, max: 1000, step: 10, unit: 'k' },
      { id: 'plan', label: 'Plan', kind: 'select', default: 9, options: [{ label: 'Basic', value: 9 }] },
    ],
    outputs: [{ label: 'Monthly', formula: 'users * plan', unit: 'k¥', decimals: 1, emphasis: true }],
  },
  { type: 'quote', text: 'Quote', by: 'Someone', sources: ['s1'] },
  { type: 'sources', title: 'Refs', items: [{ id: 's2', title: 'Other', url: 'http://example.org', publisher: 'P', published: '2025-01-01', accessed: '2026-10-20' }] },
  { type: 'actions', items: [{ label: 'Dig in', prompt: 'Analyze opportunity A' }] },
  { type: 'html', title: 'Sim', html: '<p>hi</p>', height: 300 },
]

const problems = (validation: Validation<unknown>): readonly string[] => validation.ok ? [] : validation.problems

describe('canvas validation', () => {
  it('accepts every component kind and cross-references sources', () => {
    expect(problems(validateInline({ blocks: EVERY_BLOCK, sources: [source] }))).toEqual([])
    const board = validateBoard({
      title: 'Report', subtitle: 's', summary: 'k', layout: 'slides', sources: [source],
      sections: [{ title: 'One', eyebrow: 'e', blocks: EVERY_BLOCK }],
    })
    expect(board.ok).toBe(true)
    expect(validateSection({ title: 'One', blocks: [{ type: 'markdown', text: 'x' }] }).ok).toBe(true)
    expect(validateBlock({ type: 'markdown', text: 'x' })).toEqual({ ok: true, value: { type: 'markdown', text: 'x' } })
  })

  it('names the path and expectation of each problem', () => {
    expect(problems(validateInline({ blocks: [
      { type: 'nope' },
      { type: 'markdown' },
      { type: 'callout', text: 'x', tone: 'loud' },
      { type: 'table', columns: [{ label: 'A' }], rows: [['a', 'b'], 'x', [{}]], highlight: [5] },
      { type: 'chart', kind: 'bar', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 'x', 3] }] },
      { type: 'chart', kind: 'pie', labels: ['a'], series: [{ name: 'S', values: [-1] }] },
      { type: 'stats', items: [{ label: 'L', value: Number.POSITIVE_INFINITY }] },
      { type: 'meters', items: [{ label: 'L', value: 1, max: 0 }] },
      { type: 'sources', items: [{ id: 'x', title: 't', url: 'ftp://x' }] },
      { type: 'html', html: ' ' },
      { type: 'markdown', text: 'x', sources: ['ghost'] },
    ] }))).toEqual([
      'arguments.blocks[0].type: expected one of markdown, heading, callout, stats, cards, table, chart, timeline, steps, tabs, accordion, columns, proscons, meters, calculator, quote, sources, actions, html',
      'arguments.blocks[1].text: expected a non-empty string',
      'arguments.blocks[2].tone: expected one of neutral, info, success, warning, danger',
      'arguments.blocks[3].rows[0]: expected 1 cells to match columns',
      'arguments.blocks[3].rows[1]: expected an array of cells',
      'arguments.blocks[3].rows[2][0]: expected a string, finite number, or null',
      'arguments.blocks[3].highlight[0]: expected a row index',
      'arguments.blocks[4].series[0].values[1]: expected a finite number',
      'arguments.blocks[4].series[0].values: expected 2 values to match labels',
      'arguments.blocks[5].series[0].values[0]: pie and donut values must not be negative',
      'arguments.blocks[6].items[0].value: expected a string or finite number',
      'arguments.blocks[7].items[0].max: expected a positive number',
      'arguments.blocks[8].items[0].url: expected an http(s) URL',
      'arguments.blocks[9].html: expected a non-empty string',
      'arguments.blocks[10].sources[0]: cites unknown source "ghost"; add it to sources',
    ])
  })

  it('checks calculator inputs and formulas', () => {
    expect(problems(validateBlock({
      type: 'calculator',
      inputs: [
        { id: '1bad', label: 'x', kind: 'number', default: 1 },
        { id: 'a', label: 'a', kind: 'number', default: 1 },
        { id: 'a', label: 'dup', kind: 'number', default: 1 },
        { id: 'c', label: 'c', kind: 'select', default: 1 },
      ],
      outputs: [
        { label: 'o1', formula: 'a + b' },
        { label: 'o2', formula: 'a +' },
        { label: 'o3', formula: '' },
      ],
    }))).toEqual([
      'block.inputs[0].id: expected an identifier such as monthly_users',
      'block.inputs[2].id: duplicate input id "a"',
      'block.inputs[3].options: expected an array',
      'block.outputs[0].formula: "b" is not an input id',
      'block.outputs[1].formula: unexpected end of formula at character 3',
      'block.outputs[2].formula: expected a non-empty string',
    ])
  })

  it('enforces size limits and nesting depth', () => {
    const tight = { ...DEFAULT_LIMITS, blocks: 1, items: 1, text: 3, html: 4, depth: 1 }
    expect(problems(validateInline({ blocks: [
      { type: 'markdown', text: 'long text' },
      { type: 'markdown', text: 'x' },
    ] }, tight))).toEqual([
      'arguments.blocks: expected at most 1 entries',
      'arguments.blocks[0].text: longer than 3 characters',
    ])
    expect(problems(validateBlock({ type: 'html', html: '<p>x</p>' }, tight))).toEqual(['block.html: longer than 4 characters'])
    expect(problems(validateBlock({ type: 'proscons', pros: ['a', 'b'], cons: ['toolong'] }, tight))).toEqual([
      'block.pros: expected at most 1 entries',
      'block.cons[0]: longer than 3 characters',
    ])
    const nested = { type: 'tabs', tabs: [{ label: 'a', blocks: [{ type: 'columns', columns: [[{ type: 'markdown', text: 'x' }]] }] }] }
    expect(problems(validateBlock(nested, { ...DEFAULT_LIMITS, depth: 1 }))).toEqual([
      'block.tabs[0].blocks[0].columns: tabs, accordion, and columns nest at most 1 levels',
    ])
    expect(problems(validateBlock({ type: 'accordion', items: [{ title: 't', blocks: [{ type: 'markdown', text: 'x' }] }] }, { ...DEFAULT_LIMITS, depth: 0 }))).toEqual([
      'block.items[0].blocks: tabs, accordion, and columns nest at most 0 levels',
    ])
  })

  it('rejects malformed containers and scalar fields', () => {
    expect(problems(validateBlock('x'))).toEqual(['block: expected an object'])
    expect(problems(validateInline(null))).toEqual(['arguments: expected an object'])
    expect(problems(validateInline({ blocks: [] }))).toEqual(['arguments.blocks: expected at least one entry'])
    expect(problems(validateInline({ blocks: 'x' }))).toEqual(['arguments.blocks: expected an array'])
    expect(problems(validateBlock({ type: 'cards', columns: 'two', items: [7, { title: 't', bullets: [1], sources: 'x' }] }))).toEqual([
      'block.columns: expected a finite number',
      'block.items[0]: expected an object',
      'block.items[1].bullets[0]: expected a string',
      'block.items[1].sources: expected an array',
    ])
    expect(problems(validateBlock({ type: 'steps', checklist: 'yes', items: [{ title: 't', text: 5 }] }))).toEqual([
      'block.checklist: expected true or false',
      'block.items[0].text: expected a string',
    ])
    expect(problems(validateBlock({ type: 'columns', columns: ['x'] }))).toEqual(['block.columns[0]: expected an array of blocks'])
    expect(problems(validateBoard({ title: 'T', layout: 'deck', sections: [{ blocks: [] }], sources: [source, source] }))).toEqual([
      'board.layout: expected one of report, slides',
      'board.sections[0].title: expected a non-empty string',
      'board.sections[0].blocks: expected at least one entry',
      'board.sources[1].id: duplicate source id "s1"',
    ])
    expect(problems(validateBoard(1))).toEqual(['board: expected an object'])
    expect(problems(validateSection([]))).toEqual(['section: expected an object'])
  })

  it('accepts sources registered by a sources block and stops after twenty problems', () => {
    expect(validateBoard({
      title: 'T', layout: 'report',
      sections: [{ title: 'S', blocks: [
        { type: 'markdown', text: 'x', sources: ['s2'] },
        { type: 'sources', items: [{ id: 's2', title: 't', url: 'https://x' }] },
      ] }, 'x'],
    })).toEqual({ ok: false, problems: ['board.sections[1]: expected an object'] })
    const many = validateInline({ blocks: Array.from({ length: 30 }, () => ({ type: 'markdown' })) })
    expect(problems(many)).toHaveLength(20)
    expect(validateInline({ blocks: [{ type: 'markdown', text: 'x' }, 'junk', { type: 'sources', items: 'x' }] }).ok).toBe(false)
    expect(validateInline({ blocks: [{ type: 'sources', items: ['x', { title: 't' }] }], sources: [{ title: 'no id', url: 'https://x' }] }).ok).toBe(false)
    expect(problems(validateBlock({ type: 'table', columns: [{ label: 'A' }], highlight: [0] }))).toEqual([
      'block.rows: expected an array',
      'block.highlight[0]: expected a row index',
    ])
    expect(problems(validateBoard({ title: 'T', layout: 'report' }))).toEqual(['board.sections: expected an array'])
  })
})
