/** Conversation views of the show_ui and canvas_board calls. */
import { useEffect, useRef } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { validateBlock, type CanvasSource } from '@deepseek-ai/dsh-canvas-spec'
import { BlockView, PendingBlock } from './Blocks.tsx'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from './context.tsx'
import type { NS } from './locales.ts'
import css from './Canvas.module.css'

/** Session actions injected into both tool views. */
export interface CanvasViewInjected {
  /** Send a follow-up prompt as the user's next message. */
  sendPrompt: (prompt: string) => void
  /** Place text into the composer without sending it. */
  draftPrompt: (prompt: string) => void
  /** Open one board version in the workspace. */
  openBoard: (boardId: string, callId: string) => void
  /** Labels for Markdown rendering, stable per locale. */
  markdownLabels: CanvasEnvironment['markdownLabels']
}

type ViewProps = ToolCallViewProps & PropsLocale<typeof NS> & CanvasViewInjected

/** Arguments are read while streaming in coarse steps to bound re-render work. */
const STREAM_STEP = 120

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resultText(block: Extract<ViewProps, { phase: 'result' }>['block']): string {
  return block.content.map(item => item.type === 'text' ? item.text : '').join('\n')
}

/** Validate a source list leniently: entries missing required fields are dropped. */
function sourcesOf(value: unknown): CanvasSource[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is CanvasSource => isRecord(entry) && typeof entry.id === 'string'
    && typeof entry.title === 'string' && typeof entry.url === 'string')
}

/**
 * Inline visual call in the work trace: complete blocks appear as they stream;
 * once the call is logged, the reply-flow node renders the components and the
 * trace keeps a compact record.
 * @param props - tool call phase, copy, and session actions.
 * @returns the streaming components or a status row.
 */
export function InlineCanvasView(props: ViewProps) {
  const { t, phase } = props
  const args = props.block.args
  const streaming = phase === 'preparing'
  const raw = streaming ? args.partialValue('blocks', STREAM_STEP) : args.value('blocks')
  const rawSources = streaming ? args.partialValue('sources', STREAM_STEP) : args.value('sources')
  const environment = useEnvironment(props, sourcesOf(rawSources), raw)
  if (props.phase === 'result' && props.block.isError) {
    const interrupted = props.block.error?.code === 'interrupted'
    return (
      <div className={css.statusRow} data-state={interrupted ? 'stopped' : 'error'}>
        <span>{interrupted ? t('inline.stopped') : t('inline.invalid')}</span>
        {!interrupted && <details className={css.problems}><summary>{t('inline.invalidHint')}</summary><pre>{resultText(props.block)}</pre></details>}
      </div>
    )
  }
  const list = Array.isArray(raw) ? raw : []
  if (!streaming) return <div className={css.statusRow} data-state="done">{t('inline.shown', { count: list.length })}</div>
  if (list.length === 0) return <div className={css.statusRow} data-state="running"><span className={css.spinner} />{t('inline.preparing')}</div>
  return (
    <CanvasProvider value={environment}>
      <div className={css.inline} data-state="running">
        {list.map((entry, index) => {
          const checked = validateBlock(entry)
          if (checked.ok && index < list.length - 1) return <BlockView key={index} block={checked.value} index={index} />
          return <PendingBlock key={index} />
        })}
      </div>
    </CanvasProvider>
  )
}

function useEnvironment(props: ViewProps, sources: readonly CanvasSource[], raw: unknown): CanvasEnvironment {
  const { t, sendPrompt, draftPrompt, markdownLabels } = props
  // Blocks may register sources through `sources` blocks as well as the top-level list.
  const blockSources = Array.isArray(raw) ? raw.flatMap((block: unknown) =>
    isRecord(block) && block.type === 'sources' ? sourcesOf(block.items) : []) : []
  const map = sourceMap(sources, blockSources)
  const translate: Translate = t
  return { t: translate, sources: map, sendPrompt, draftPrompt, markdownLabels, animate: true }
}

/** Section titles received so far, for the building card. */
function sectionTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((section: unknown) => isRecord(section) && typeof section.title === 'string' && section.title !== '' ? [section.title] : [])
}

/**
 * Board glyph shared by the building card and the published card.
 * @returns the decorative icon.
 */
export function BoardIcon() {
  return (
    <span className={css.boardIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity=".14" />
        <rect x="7" y="12" width="2.6" height="5" rx="1" fill="currentColor" />
        <rect x="10.7" y="9" width="2.6" height="8" rx="1" fill="currentColor" />
        <rect x="14.4" y="6.5" width="2.6" height="10.5" rx="1" fill="currentColor" />
      </svg>
    </span>
  )
}

/**
 * Board call in the work trace: progress while the board streams, then a
 * compact record once published, because the reply-flow node shows the card.
 * A live publication opens the board once.
 * @param props - tool call phase, copy, and session actions.
 * @returns the building card or a status row.
 */
export function BoardCardView(props: ViewProps) {
  const { t, phase, openBoard } = props
  const args = props.block.args
  const streaming = phase === 'preparing'
  const title = args.text('title') ?? ''
  const summary = args.text('summary')
  const sections = sectionTitles(streaming ? args.partialValue('sections', STREAM_STEP) : args.value('sections'))
  const published = props.phase === 'result' && !props.block.isError ? publishedOf(props.block) : undefined
  const sawRunning = useRef(phase !== 'result')
  useEffect(() => {
    if (published === undefined || !sawRunning.current) return
    sawRunning.current = false
    openBoard(published.boardId, props.callId)
  }, [published, openBoard, props.callId])
  if (published !== undefined) {
    return <div className={css.statusRow} data-state="done">{t('board.card.published', { title, version: published.version })}</div>
  }
  const failed = props.phase === 'result' && props.block.isError
  return (
    <div className={css.boardCard} data-state={failed ? 'error' : 'running'}>
      <div className={css.boardCardMain}>
        <BoardIcon />
        <div className={css.boardCardText}>
          <strong className={css.boardCardTitle}>{title === '' ? t('board.title') : title}</strong>
          <span className={css.muted}>
            {failed ? t('board.card.failed')
              : sections.length === 0 ? t('board.card.preparing') : t('board.card.progress', { section: sections[sections.length - 1] as string })}
          </span>
        </div>
        {!failed && <span className={css.spinner} />}
      </div>
      {summary !== undefined && summary !== '' && !failed && <p className={css.boardCardSummary}>{plainSummary(summary)}</p>}
      {props.phase === 'result' && props.block.isError && <details className={css.problems}><summary>{t('inline.invalidHint')}</summary><pre>{resultText(props.block)}</pre></details>}
    </div>
  )
}

/**
 * Board summaries are Markdown; cards show them as one plain line.
 * @param text - summary Markdown.
 * @returns text without emphasis, code, and link markup.
 */
export function plainSummary(text: string): string {
  return text.replace(/\*\*|__|`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

/** Read the published board id and version from the result text `tool-canvas` renders for a successful call. */
function publishedOf(block: Extract<ViewProps, { phase: 'result' }>['block']): { boardId: string; version: number } | undefined {
  const text = resultText(block)
  const match = /board_id ([^,\s)]+), version (\d+)/.exec(text)
  if (match === null) return undefined
  return { boardId: match[1] as string, version: Number(match[2]) }
}
