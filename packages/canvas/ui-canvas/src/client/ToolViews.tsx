/** Conversation views of the show_ui and canvas_board calls. */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  validateBlock, validateInline, type CanvasSource,
} from '@deepseek-ai/dsh-canvas-spec'
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
 * Inline visual answer: complete blocks appear as they stream, and the final
 * validated set replaces them once the call succeeds.
 * @param props - tool call phase, copy, and session actions.
 * @returns the rendered components or a status row.
 */
export function InlineCanvasView(props: ViewProps) {
  const { t, phase } = props
  const args = props.block.args
  const failed = props.phase === 'result' && props.block.isError
  const streaming = phase === 'preparing'
  const raw = streaming ? args.partialValue('blocks', STREAM_STEP) : args.value('blocks')
  const rawSources = streaming ? args.partialValue('sources', STREAM_STEP) : args.value('sources')
  const final = useMemo(() => phase === 'preparing' ? undefined : validateInline({ blocks: raw, ...rawSources === undefined ? {} : { sources: rawSources } }), [phase, raw, rawSources])
  const environment = useEnvironment(props, sourcesOf(rawSources), raw)
  if (props.phase === 'result' && failed) {
    const interrupted = props.block.error?.code === 'interrupted'
    return (
      <div className={css.statusRow} data-state={interrupted ? 'stopped' : 'error'}>
        <span>{interrupted ? t('inline.stopped') : t('inline.invalid')}</span>
        {!interrupted && <details className={css.problems}><summary>{t('inline.invalidHint')}</summary><pre>{resultText(props.block)}</pre></details>}
      </div>
    )
  }
  const list = Array.isArray(raw) ? raw : []
  // The Turn tail shows the final components; the trace keeps a compact record.
  if (props.phase === 'result') return <div className={css.statusRow} data-state="done">{t('inline.shown', { count: list.length })}</div>
  if (list.length === 0) return <div className={css.statusRow} data-state="running"><span className={css.spinner} />{t('inline.preparing')}</div>
  let content: ReactNode
  if (final?.ok === true) {
    content = final.value.blocks.map((block, index) => <BlockView key={index} block={block} index={index} />)
  } else {
    content = list.map((entry, index) => {
      const checked = validateBlock(entry)
      const last = index === list.length - 1
      if (checked.ok && !(streaming && last)) return <BlockView key={index} block={checked.value} index={index} />
      return <PendingBlock key={index} invalid={!streaming && !checked.ok} />
    })
  }
  return (
    <CanvasProvider value={environment}>
      <div className={css.inline} data-state="running">{content}</div>
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
 * Board call card: progress while the board streams, then its version and an
 * entry that opens the workspace. A live publication opens the board once.
 * @param props - tool call phase, copy, and session actions.
 * @returns the card element.
 */
export function BoardCardView(props: ViewProps) {
  const { t, phase, openBoard } = props
  const args = props.block.args
  const streaming = phase === 'preparing'
  const title = args.text('title') ?? ''
  const layout = args.text('layout')
  const summary = args.text('summary')
  const sections = sectionTitles(streaming ? args.partialValue('sections', STREAM_STEP) : args.value('sections'))
  const published = props.phase === 'result' && !props.block.isError ? publishedOf(props.block) : undefined
  const sawRunning = useRef(phase !== 'result')
  useEffect(() => {
    if (published === undefined || !sawRunning.current) return
    sawRunning.current = false
    openBoard(published.boardId, props.callId)
  }, [published, openBoard, props.callId])
  const failed = props.phase === 'result' && props.block.isError
  const state = failed ? 'error' : published !== undefined ? 'done' : 'running'
  return (
    <div className={css.boardCard} data-state={state}>
      <div className={css.boardCardMain}>
        <span className={css.boardIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity=".14" /><rect x="7" y="12" width="2.6" height="5" rx="1" fill="currentColor" /><rect x="10.7" y="9" width="2.6" height="8" rx="1" fill="currentColor" /><rect x="14.4" y="6.5" width="2.6" height="10.5" rx="1" fill="currentColor" /></svg>
        </span>
        <div className={css.boardCardText}>
          <strong className={css.boardCardTitle}>{title === '' ? t('board.title') : title}</strong>
          <span className={css.muted}>
            {failed ? t('board.card.failed')
              : published !== undefined ? [t('board.card.ready', { version: published.version }), t(layout === 'slides' ? 'board.card.slides' : 'board.card.sections', { count: sections.length })].join(' · ')
                : sections.length === 0 ? t('board.card.preparing') : t('board.card.progress', { section: sections[sections.length - 1] as string })}
          </span>
        </div>
        {published !== undefined && (
          <button type="button" className={css.openButton} onClick={() => { openBoard(published.boardId, props.callId) }}>{t('board.card.open')}</button>
        )}
        {state === 'running' && <span className={css.spinner} />}
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
