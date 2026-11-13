/**
 * Validation of model-written canvas descriptions. Each problem names the
 * JSON path and the expectation, so a tool error tells the model exactly
 * what to fix.
 * @module @deepseek-ai/dsh-canvas-spec/validate
 */
import { FormulaError, formulaNames, parseFormula } from './formula.ts'
import type {
  BoardSection, CanvasBlock, CanvasBlockType, CanvasBoard, InlineCanvas,
} from './types.ts'

/** Size limits applied while validating; exceeding one is a validation problem. */
export interface CanvasLimits {
  /** Blocks in one block list. */
  readonly blocks: number
  /** Board sections or slides. */
  readonly sections: number
  /** Items in one list field (cards, rows, labels, sources, ...). */
  readonly items: number
  /** Series in one chart. */
  readonly series: number
  /** Nesting of tabs, accordion, and columns. */
  readonly depth: number
  /** UTF-16 length of one text field. */
  readonly text: number
  /** UTF-16 length of one html block. */
  readonly html: number
}

/** Limits used when a caller supplies none. */
export const DEFAULT_LIMITS: CanvasLimits = {
  blocks: 60, sections: 24, items: 200, series: 12, depth: 3, text: 20_000, html: 200_000,
}

/** Every component kind, in documentation order. */
export const BLOCK_TYPES: readonly CanvasBlockType[] = [
  'markdown', 'heading', 'callout', 'stats', 'cards', 'table', 'chart', 'timeline', 'steps',
  'tabs', 'accordion', 'columns', 'proscons', 'meters', 'calculator', 'quote', 'sources', 'actions', 'html',
]

const TONES = ['neutral', 'info', 'success', 'warning', 'danger']
const EVIDENCE = ['fact', 'inference', 'estimate', 'unverified']
const MAX_PROBLEMS = 20

/** Result of validating one description. */
export type Validation<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problems: readonly string[] }

type Json = Readonly<Record<string, unknown>>

class Checker {
  readonly problems: string[] = []
  constructor(readonly limits: CanvasLimits) {}

  fail(path: string, message: string): void {
    if (this.problems.length < MAX_PROBLEMS) this.problems.push(`${path}: ${message}`)
  }

  record(value: unknown, path: string): Json | undefined {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Json
    this.fail(path, 'expected an object')
    return undefined
  }

  string(value: Json, key: string, path: string, required: boolean): void {
    const field = value[key]
    if (field === undefined && !required) return
    if (typeof field !== 'string' || (required && field.trim() === '')) {
      this.fail(`${path}.${key}`, required ? 'expected a non-empty string' : 'expected a string')
      return
    }
    if (field.length > this.limits.text) this.fail(`${path}.${key}`, `longer than ${this.limits.text} characters`)
  }

  number(value: Json, key: string, path: string, required: boolean): void {
    const field = value[key]
    if (field === undefined && !required) return
    if (typeof field !== 'number' || !Number.isFinite(field)) this.fail(`${path}.${key}`, 'expected a finite number')
  }

  boolean(value: Json, key: string, path: string): void {
    const field = value[key]
    if (field !== undefined && typeof field !== 'boolean') this.fail(`${path}.${key}`, 'expected true or false')
  }

  oneOf(value: Json, key: string, path: string, options: readonly string[], required: boolean): void {
    const field = value[key]
    if (field === undefined && !required) return
    if (typeof field !== 'string' || !options.includes(field)) this.fail(`${path}.${key}`, `expected one of ${options.join(', ')}`)
  }

  array(value: Json, key: string, path: string, required: boolean, max = this.limits.items): readonly unknown[] | undefined {
    const field = value[key]
    if (field === undefined && !required) return undefined
    if (!Array.isArray(field)) {
      this.fail(`${path}.${key}`, 'expected an array')
      return undefined
    }
    if (required && field.length === 0) this.fail(`${path}.${key}`, 'expected at least one entry')
    if (field.length > max) this.fail(`${path}.${key}`, `expected at most ${max} entries`)
    const list: readonly unknown[] = field
    return list
  }

  strings(value: Json, key: string, path: string, required: boolean): readonly unknown[] | undefined {
    const list = this.array(value, key, path, required)
    list?.forEach((entry, index) => {
      if (typeof entry !== 'string') this.fail(`${path}.${key}[${index}]`, 'expected a string')
      else if (entry.length > this.limits.text) this.fail(`${path}.${key}[${index}]`, `longer than ${this.limits.text} characters`)
    })
    return list
  }

  objects(value: Json, key: string, path: string, required: boolean, each: (item: Json, path: string) => void, max?: number): number {
    const list = this.array(value, key, path, required, max)
    if (list === undefined) return 0
    list.forEach((entry, index) => {
      const item = this.record(entry, `${path}.${key}[${index}]`)
      if (item !== undefined) each(item, `${path}.${key}[${index}]`)
    })
    return list.length
  }

  cited(value: Json, path: string): void {
    this.strings(value, 'sources', path, false)
    this.oneOf(value, 'evidence', path, EVIDENCE, false)
  }

  source(item: Json, path: string): void {
    this.string(item, 'id', path, true)
    this.string(item, 'title', path, true)
    this.string(item, 'url', path, true)
    const url = item.url
    if (typeof url === 'string' && !/^https?:\/\//i.test(url)) this.fail(`${path}.url`, 'expected an http(s) URL')
    this.string(item, 'publisher', path, false)
    this.string(item, 'published', path, false)
    this.string(item, 'accessed', path, false)
    this.string(item, 'excerpt', path, false)
  }

  blocks(value: Json, key: string, path: string, depth: number): void {
    this.objects(value, key, path, true, (block, blockPath) => { this.block(block, blockPath, depth) }, this.limits.blocks)
  }

  nested(value: Json, key: string, path: string, depth: number): void {
    if (depth >= this.limits.depth) {
      this.fail(`${path}.${key}`, `tabs, accordion, and columns nest at most ${this.limits.depth} levels`)
      return
    }
    this.blocks(value, key, path, depth + 1)
  }

  block(block: Json, path: string, depth: number): void {
    const type = block.type
    if (typeof type !== 'string' || !(BLOCK_TYPES as readonly string[]).includes(type)) {
      this.fail(`${path}.type`, `expected one of ${BLOCK_TYPES.join(', ')}`)
      return
    }
    switch (type as CanvasBlockType) {
      case 'markdown':
        this.string(block, 'text', path, true)
        this.cited(block, path)
        return
      case 'heading':
        this.string(block, 'text', path, true)
        this.string(block, 'eyebrow', path, false)
        return
      case 'callout':
        this.oneOf(block, 'tone', path, TONES, false)
        this.string(block, 'title', path, false)
        this.string(block, 'text', path, true)
        this.cited(block, path)
        return
      case 'stats':
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'label', itemPath, true)
          const value = item.value
          if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) this.fail(`${itemPath}.value`, 'expected a string or finite number')
          for (const key of ['unit', 'delta', 'note']) this.string(item, key, itemPath, false)
          this.oneOf(item, 'trend', itemPath, ['up', 'down', 'flat'], false)
          this.cited(item, itemPath)
        }, 12)
        return
      case 'cards':
        this.number(block, 'columns', path, false)
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'title', itemPath, true)
          this.string(item, 'text', itemPath, false)
          this.string(item, 'tag', itemPath, false)
          this.oneOf(item, 'tone', itemPath, TONES, false)
          this.strings(item, 'bullets', itemPath, false)
          this.cited(item, itemPath)
        }, 24)
        return
      case 'table': {
        this.string(block, 'caption', path, false)
        const columns = this.objects(block, 'columns', path, true, (column, columnPath) => {
          this.string(column, 'label', columnPath, true)
          this.oneOf(column, 'align', columnPath, ['left', 'center', 'right'], false)
        }, 16)
        const rows = this.array(block, 'rows', path, true)
        rows?.forEach((row, index) => {
          if (!Array.isArray(row)) { this.fail(`${path}.rows[${index}]`, 'expected an array of cells'); return }
          if (row.length !== columns) this.fail(`${path}.rows[${index}]`, `expected ${columns} cells to match columns`)
          row.forEach((cell: unknown, cellIndex: number) => {
            if (cell !== null && typeof cell !== 'string' && (typeof cell !== 'number' || !Number.isFinite(cell))) {
              this.fail(`${path}.rows[${index}][${cellIndex}]`, 'expected a string, finite number, or null')
            }
          })
        })
        const highlight = this.array(block, 'highlight', path, false)
        highlight?.forEach((entry, index) => {
          if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0 || entry >= (rows?.length ?? 0)) {
            this.fail(`${path}.highlight[${index}]`, 'expected a row index')
          }
        })
        this.boolean(block, 'sortable', path)
        this.boolean(block, 'filterable', path)
        this.cited(block, path)
        return
      }
      case 'chart': {
        this.oneOf(block, 'kind', path, ['bar', 'line', 'area', 'pie', 'donut'], true)
        for (const key of ['title', 'unit', 'note']) this.string(block, key, path, false)
        const labels = this.strings(block, 'labels', path, true)
        const pie = block.kind === 'pie' || block.kind === 'donut'
        this.objects(block, 'series', path, true, (series, seriesPath) => {
          this.string(series, 'name', seriesPath, true)
          const values = this.array(series, 'values', seriesPath, true)
          values?.forEach((entry, index) => {
            if (typeof entry !== 'number' || !Number.isFinite(entry)) this.fail(`${seriesPath}.values[${index}]`, 'expected a finite number')
            else if (pie && entry < 0) this.fail(`${seriesPath}.values[${index}]`, 'pie and donut values must not be negative')
          })
          if (values !== undefined && labels !== undefined && values.length !== labels.length) {
            this.fail(`${seriesPath}.values`, `expected ${labels.length} values to match labels`)
          }
        }, pie ? 1 : this.limits.series)
        this.boolean(block, 'stacked', path)
        this.boolean(block, 'horizontal', path)
        this.cited(block, path)
        return
      }
      case 'timeline':
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'time', itemPath, true)
          this.string(item, 'title', itemPath, true)
          this.string(item, 'text', itemPath, false)
          this.oneOf(item, 'status', itemPath, ['done', 'current', 'upcoming'], false)
        }, 40)
        return
      case 'steps':
        this.boolean(block, 'checklist', path)
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'title', itemPath, true)
          this.string(item, 'text', itemPath, false)
          this.boolean(item, 'done', itemPath)
        }, 40)
        return
      case 'tabs':
        this.objects(block, 'tabs', path, true, (tab, tabPath) => {
          this.string(tab, 'label', tabPath, true)
          this.nested(tab, 'blocks', tabPath, depth)
        }, 8)
        return
      case 'accordion':
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'title', itemPath, true)
          this.nested(item, 'blocks', itemPath, depth)
        }, 24)
        return
      case 'columns': {
        const columns = this.array(block, 'columns', path, true, 4)
        if (depth >= this.limits.depth) {
          this.fail(`${path}.columns`, `tabs, accordion, and columns nest at most ${this.limits.depth} levels`)
          return
        }
        columns?.forEach((column, index) => {
          if (!Array.isArray(column)) { this.fail(`${path}.columns[${index}]`, 'expected an array of blocks'); return }
          this.blocks({ blocks: column }, 'blocks', `${path}.columns[${index}]`, depth + 1)
        })
        return
      }
      case 'proscons':
        this.string(block, 'prosTitle', path, false)
        this.string(block, 'consTitle', path, false)
        this.strings(block, 'pros', path, true)
        this.strings(block, 'cons', path, true)
        return
      case 'meters':
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'label', itemPath, true)
          this.number(item, 'value', itemPath, true)
          this.number(item, 'max', itemPath, false)
          if (typeof item.max === 'number' && item.max <= 0) this.fail(`${itemPath}.max`, 'expected a positive number')
          this.oneOf(item, 'tone', itemPath, TONES, false)
          this.string(item, 'note', itemPath, false)
          this.cited(item, itemPath)
        }, 30)
        return
      case 'calculator':
        this.calculator(block, path)
        return
      case 'quote':
        this.string(block, 'text', path, true)
        this.string(block, 'by', path, false)
        this.cited(block, path)
        return
      case 'sources':
        this.string(block, 'title', path, false)
        this.objects(block, 'items', path, true, (item, itemPath) => { this.source(item, itemPath) })
        return
      case 'actions':
        this.objects(block, 'items', path, true, (item, itemPath) => {
          this.string(item, 'label', itemPath, true)
          this.string(item, 'prompt', itemPath, true)
        }, 6)
        return
      case 'html': {
        this.string(block, 'title', path, false)
        const html = block.html
        if (typeof html !== 'string' || html.trim() === '') this.fail(`${path}.html`, 'expected a non-empty string')
        else if (html.length > this.limits.html) this.fail(`${path}.html`, `longer than ${this.limits.html} characters`)
        this.number(block, 'height', path, false)
        return
      }
    }
  }

  calculator(block: Json, path: string): void {
    this.string(block, 'title', path, false)
    this.string(block, 'note', path, false)
    const ids: string[] = []
    this.objects(block, 'inputs', path, true, (input, inputPath) => {
      const id = input.id
      if (typeof id !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) this.fail(`${inputPath}.id`, 'expected an identifier such as monthly_users')
      else if (ids.includes(id)) this.fail(`${inputPath}.id`, `duplicate input id "${id}"`)
      else ids.push(id)
      this.string(input, 'label', inputPath, true)
      this.oneOf(input, 'kind', inputPath, ['number', 'slider', 'select'], true)
      this.number(input, 'default', inputPath, true)
      for (const key of ['min', 'max', 'step']) this.number(input, key, inputPath, false)
      this.string(input, 'unit', inputPath, false)
      if (input.kind === 'select') {
        this.objects(input, 'options', inputPath, true, (option, optionPath) => {
          this.string(option, 'label', optionPath, true)
          this.number(option, 'value', optionPath, true)
        }, 20)
      }
    }, 12)
    this.objects(block, 'outputs', path, true, (output, outputPath) => {
      this.string(output, 'label', outputPath, true)
      this.string(output, 'unit', outputPath, false)
      this.number(output, 'decimals', outputPath, false)
      this.boolean(output, 'emphasis', outputPath)
      const formula = output.formula
      if (typeof formula !== 'string' || formula.trim() === '') { this.fail(`${outputPath}.formula`, 'expected a non-empty string'); return }
      try {
        for (const name of formulaNames(parseFormula(formula))) {
          if (!ids.includes(name)) this.fail(`${outputPath}.formula`, `"${name}" is not an input id`)
        }
      } catch (error) {
        /* v8 ignore next -- parseFormula reports every syntax problem as FormulaError. */
        if (!(error instanceof FormulaError)) throw error
        this.fail(`${outputPath}.formula`, `${error.message} at character ${error.at}`)
      }
    }, 12)
  }

  sourceList(value: Json, path: string): Set<string> {
    const ids = new Set<string>()
    this.objects(value, 'sources', path, false, (item, itemPath) => {
      this.source(item, itemPath)
      if (typeof item.id === 'string') {
        if (ids.has(item.id)) this.fail(`${itemPath}.id`, `duplicate source id "${item.id}"`)
        ids.add(item.id)
      }
    })
    return ids
  }
}

/** Collect every source id cited inside a block tree. */
function citations(value: unknown, path: string, found: Array<{ id: string; path: string }>): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => { citations(entry, `${path}[${index}]`, found) })
    return
  }
  if (typeof value !== 'object' || value === null) return
  for (const [key, field] of Object.entries(value)) {
    if (key === 'sources' && Array.isArray(field) && field.every(entry => typeof entry === 'string')) {
      field.forEach((id: string, index) => found.push({ id, path: `${path}.sources[${index}]` }))
    } else if (key !== 'items' || (value as Json).type !== 'sources') {
      citations(field, `${path}.${key}`, found)
    }
  }
}

function checkCitations(checker: Checker, root: unknown, ids: ReadonlySet<string>, path: string): void {
  const found: Array<{ id: string; path: string }> = []
  citations(root, path, found)
  for (const citation of found) {
    if (!ids.has(citation.id)) checker.fail(citation.path, `cites unknown source "${citation.id}"; add it to sources`)
  }
}

/** Sources registered by `sources` blocks, which blocks may also cite. */
function blockSourceIds(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return []
  return blocks.flatMap((block: unknown) => {
    if (typeof block !== 'object' || block === null) return []
    const record = block as Json
    if (record.type === 'sources' && Array.isArray(record.items)) {
      return record.items.flatMap((item: unknown) => typeof item === 'object' && item !== null && typeof (item as Json).id === 'string' ? [(item as Json).id as string] : [])
    }
    return []
  })
}

/**
 * Validate a single block, for progressive rendering of streamed lists.
 * @param value - untrusted block JSON.
 * @param limits - size limits.
 * @returns the block, or the problems found.
 */
export function validateBlock(value: unknown, limits: CanvasLimits = DEFAULT_LIMITS): Validation<CanvasBlock> {
  const checker = new Checker(limits)
  const block = checker.record(value, 'block')
  if (block !== undefined) checker.block(block, 'block', 0)
  return checker.problems.length === 0 ? { ok: true, value: value as CanvasBlock } : { ok: false, problems: checker.problems }
}

/**
 * Validate an inline canvas: blocks plus the sources they cite.
 * @param value - untrusted tool arguments.
 * @param limits - size limits.
 * @returns the canvas, or the problems found.
 */
export function validateInline(value: unknown, limits: CanvasLimits = DEFAULT_LIMITS): Validation<InlineCanvas> {
  const checker = new Checker(limits)
  const root = checker.record(value, 'arguments')
  if (root !== undefined) {
    checker.blocks(root, 'blocks', 'arguments', 0)
    const ids = checker.sourceList(root, 'arguments')
    for (const id of blockSourceIds(root.blocks)) ids.add(id)
    checkCitations(checker, root.blocks, ids, 'arguments.blocks')
  }
  return checker.problems.length === 0 ? { ok: true, value: value as InlineCanvas } : { ok: false, problems: checker.problems }
}

/**
 * Validate a complete board version.
 * @param value - untrusted board JSON.
 * @param limits - size limits.
 * @returns the board, or the problems found.
 */
export function validateBoard(value: unknown, limits: CanvasLimits = DEFAULT_LIMITS): Validation<CanvasBoard> {
  const checker = new Checker(limits)
  const root = checker.record(value, 'board')
  if (root !== undefined) {
    checker.string(root, 'title', 'board', true)
    checker.string(root, 'subtitle', 'board', false)
    checker.string(root, 'summary', 'board', false)
    checker.oneOf(root, 'layout', 'board', ['report', 'slides'], true)
    checker.objects(root, 'sections', 'board', true, (section, sectionPath) => {
      checker.string(section, 'title', sectionPath, true)
      checker.string(section, 'eyebrow', sectionPath, false)
      checker.blocks(section, 'blocks', sectionPath, 0)
    }, limits.sections)
    const ids = checker.sourceList(root, 'board')
    const sections: readonly unknown[] = Array.isArray(root.sections) ? root.sections : []
    for (const section of sections) {
      if (typeof section === 'object' && section !== null) for (const id of blockSourceIds((section as Json).blocks)) ids.add(id)
    }
    checkCitations(checker, root.sections, ids, 'board.sections')
  }
  return checker.problems.length === 0 ? { ok: true, value: value as CanvasBoard } : { ok: false, problems: checker.problems }
}

/**
 * Validate one section, for progressive rendering of a streamed board.
 * @param value - untrusted section JSON.
 * @param limits - size limits.
 * @returns the section, or the problems found.
 */
export function validateSection(value: unknown, limits: CanvasLimits = DEFAULT_LIMITS): Validation<BoardSection> {
  const checker = new Checker(limits)
  const section = checker.record(value, 'section')
  if (section !== undefined) {
    checker.string(section, 'title', 'section', true)
    checker.string(section, 'eyebrow', 'section', false)
    checker.blocks(section, 'blocks', 'section', 0)
  }
  return checker.problems.length === 0 ? { ok: true, value: value as BoardSection } : { ok: false, problems: checker.problems }
}
