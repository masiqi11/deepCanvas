/**
 * Canvas component descriptions: the JSON vocabulary the model writes and the
 * Web client renders. Every field is plain JSON so a description can be
 * logged, validated, streamed, and replayed unchanged.
 * @module @deepseek-ai/dsh-canvas-spec/types
 */

/** Semantic color of a callout, card, or meter. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/** Evidence class of a statement, shown as a badge. */
export type Evidence = 'fact' | 'inference' | 'estimate' | 'unverified'

/** Optional citation and evidence fields shared by blocks and items. */
export interface Cited {
  /** Ids of entries in the enclosing source list. */
  sources?: string[]
  /** How well the statement is supported. */
  evidence?: Evidence
}

/** One registered source that blocks cite by id. */
export interface CanvasSource {
  id: string
  title: string
  url: string
  publisher?: string
  /** Publication date as written by the source, when known. */
  published?: string
  /** Access date of the page. */
  accessed?: string
  /** Passage that supports the citing statement. */
  excerpt?: string
}

/** Paragraph text in Markdown. */
export interface MarkdownBlock extends Cited {
  type: 'markdown'
  text: string
}

/** Section heading inside a block list. */
export interface HeadingBlock {
  type: 'heading'
  text: string
  /** Small label above the heading. */
  eyebrow?: string
}

/** Highlighted conclusion, tip, or risk. */
export interface CalloutBlock extends Cited {
  type: 'callout'
  tone?: Tone
  title?: string
  text: string
}

/** One headline number. */
export interface StatItem extends Cited {
  label: string
  value: string | number
  unit?: string
  /** Change text such as `+12%`. */
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  note?: string
}

/** Row of headline numbers. */
export interface StatsBlock {
  type: 'stats'
  items: StatItem[]
}

/** One card in a grid. */
export interface CardItem extends Cited {
  title: string
  text?: string
  tag?: string
  tone?: Tone
  bullets?: string[]
}

/** Grid of cards for options, opportunities, or segments. */
export interface CardsBlock {
  type: 'cards'
  /** Preferred column count on wide screens. */
  columns?: number
  items: CardItem[]
}

/** One table column. */
export interface TableColumn {
  label: string
  align?: 'left' | 'center' | 'right'
}

/** Table cell value; null renders as an empty cell. */
export type TableCell = string | number | null

/** Comparison table with optional sorting and text filtering. */
export interface TableBlock extends Cited {
  type: 'table'
  caption?: string
  columns: TableColumn[]
  rows: TableCell[][]
  /** Zero-based row indexes to emphasize. */
  highlight?: number[]
  sortable?: boolean
  filterable?: boolean
}

/** One data series of a chart. */
export interface ChartSeries {
  name: string
  values: number[]
}

/** Chart drawn by the client; values must come from sources or stated calculations. */
export interface ChartBlock extends Cited {
  type: 'chart'
  kind: 'bar' | 'line' | 'area' | 'pie' | 'donut'
  title?: string
  labels: string[]
  series: ChartSeries[]
  unit?: string
  stacked?: boolean
  horizontal?: boolean
  note?: string
}

/** One timeline entry. */
export interface TimelineItem {
  time: string
  title: string
  text?: string
  status?: 'done' | 'current' | 'upcoming'
}

/** Ordered events or milestones. */
export interface TimelineBlock {
  type: 'timeline'
  items: TimelineItem[]
}

/** One step or checklist entry. */
export interface StepItem {
  title: string
  text?: string
  done?: boolean
}

/** Numbered steps, or a checklist the reader can tick locally. */
export interface StepsBlock {
  type: 'steps'
  checklist?: boolean
  items: StepItem[]
}

/** One tab of a tabs block. */
export interface TabItem {
  label: string
  blocks: CanvasBlock[]
}

/** Alternative views of related content. */
export interface TabsBlock {
  type: 'tabs'
  tabs: TabItem[]
}

/** One collapsible entry. */
export interface AccordionItem {
  title: string
  blocks: CanvasBlock[]
}

/** Collapsible details. */
export interface AccordionBlock {
  type: 'accordion'
  items: AccordionItem[]
}

/** Side-by-side layout of block lists. */
export interface ColumnsBlock {
  type: 'columns'
  columns: CanvasBlock[][]
}

/** Advantages against drawbacks. */
export interface ProsConsBlock {
  type: 'proscons'
  prosTitle?: string
  consTitle?: string
  pros: string[]
  cons: string[]
}

/** One labeled score bar. */
export interface MeterItem extends Cited {
  label: string
  value: number
  /** Scale maximum; defaults to 100. */
  max?: number
  tone?: Tone
  note?: string
}

/** Score or share bars. */
export interface MetersBlock {
  type: 'meters'
  items: MeterItem[]
}

/** One calculator option of a select input. */
export interface CalculatorOption {
  label: string
  value: number
}

/** One calculator input; its id is a variable in output formulas. */
export interface CalculatorInput {
  id: string
  label: string
  kind: 'number' | 'slider' | 'select'
  default: number
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: CalculatorOption[]
}

/** One calculator output computed from a formula over input ids. */
export interface CalculatorOutput {
  label: string
  /** Arithmetic formula; see the expression grammar in the tool description. */
  formula: string
  unit?: string
  decimals?: number
  emphasis?: boolean
}

/** Interactive what-if calculator evaluated locally by the client. */
export interface CalculatorBlock {
  type: 'calculator'
  title?: string
  inputs: CalculatorInput[]
  outputs: CalculatorOutput[]
  note?: string
}

/** Quotation from a person or document. */
export interface QuoteBlock extends Cited {
  type: 'quote'
  text: string
  by?: string
}

/** Source list rendered as a block. */
export interface SourcesBlock {
  type: 'sources'
  title?: string
  items: CanvasSource[]
}

/** One follow-up suggestion; choosing it sends the prompt to the agent. */
export interface ActionItem {
  label: string
  prompt: string
}

/** Follow-up buttons. */
export interface ActionsBlock {
  type: 'actions'
  items: ActionItem[]
}

/** Isolated custom page for interactions the components cannot express. */
export interface HtmlBlock {
  type: 'html'
  title?: string
  html: string
  /** Initial frame height in CSS pixels. */
  height?: number
}

/** Every component kind. */
export type CanvasBlock =
  | MarkdownBlock | HeadingBlock | CalloutBlock | StatsBlock | CardsBlock | TableBlock
  | ChartBlock | TimelineBlock | StepsBlock | TabsBlock | AccordionBlock | ColumnsBlock
  | ProsConsBlock | MetersBlock | CalculatorBlock | QuoteBlock | SourcesBlock | ActionsBlock
  | HtmlBlock

/** Component kind discriminant. */
export type CanvasBlockType = CanvasBlock['type']

/** Inline visual answer shown in the conversation. */
export interface InlineCanvas {
  blocks: CanvasBlock[]
  sources?: CanvasSource[]
}

/** One report section or one slide. */
export interface BoardSection {
  title: string
  eyebrow?: string
  blocks: CanvasBlock[]
}

/** Complete board version shown in the workspace. */
export interface CanvasBoard {
  title: string
  subtitle?: string
  layout: 'report' | 'slides'
  /** Key takeaway shown above the sections. */
  summary?: string
  sections: BoardSection[]
  sources?: CanvasSource[]
}
