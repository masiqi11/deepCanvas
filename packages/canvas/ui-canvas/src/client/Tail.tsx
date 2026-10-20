/** Turn-tail presentation: final inline visuals and published board cards under the closing reply. */
import { useMemo } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { validateBoard, validateInline, type CanvasSource } from '@deepseek-ai/dsh-canvas-spec'
import { BlockView } from './Blocks.tsx'
import type { CanvasVisual } from './canvas-definition.ts'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from './context.tsx'
import type { NS } from './locales.ts'
import { plainSummary } from './ToolViews.tsx'
import css from './Canvas.module.css'

/** Turn-keyed canvas calls and Session-bound actions. */
export interface CanvasTailInjected {
  keyedHooks: {
    /** Resolve this Turn's canvas calls in invocation order. */
    visuals: (turn: string) => ObservableSnapshot<readonly CanvasVisual[]>
  }
  sendPrompt: (prompt: string) => void
  draftPrompt: (prompt: string) => void
  openBoard: (boardId: string, callId: string) => void
  markdownLabels: CanvasEnvironment['markdownLabels']
}

type TailProps = PropsRuntime<'conversation.chat.turnTail'> & InjectFace<CanvasTailInjected> & PropsLocale<typeof NS>

function parse(raw: string): unknown {
  try { return JSON.parse(raw) } catch (_error) { return undefined /* Malformed arguments never displayed. */ }
}

/**
 * Render a Turn's successful canvas calls in invocation order.
 * @param props - Turn identity, its canvas calls, copy, and actions.
 * @returns the visuals and board cards, or null for a Turn without any.
 */
export function CanvasTail(props: TailProps) {
  const { turn, useVisuals, t } = props
  const visuals = useVisuals(String(turn.turn))
  if (visuals === undefined || visuals.length === 0) return null
  return <div className={css.tail}>{visuals.map(visual => <TailItem key={visual.callId} visual={visual} props={props} t={t} />)}</div>
}

function TailItem({ visual, props, t }: { visual: CanvasVisual; props: TailProps; t: Translate }) {
  const args = useMemo(() => parse(visual.argsRaw), [visual.argsRaw])
  if (visual.name === 'canvas_board') {
    if (visual.published === undefined) return null
    const board = validateBoard(args)
    if (!board.ok) return null
    const { boardId, version } = visual.published
    return (
      <div className={css.boardCard} data-state="done">
        <div className={css.boardCardMain}>
          <span className={css.boardIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity=".14" /><rect x="7" y="12" width="2.6" height="5" rx="1" fill="currentColor" /><rect x="10.7" y="9" width="2.6" height="8" rx="1" fill="currentColor" /><rect x="14.4" y="6.5" width="2.6" height="10.5" rx="1" fill="currentColor" /></svg>
          </span>
          <div className={css.boardCardText}>
            <strong className={css.boardCardTitle}>{board.value.title}</strong>
            <span className={css.muted}>{[t('board.card.ready', { version }), t(board.value.layout === 'slides' ? 'board.card.slides' : 'board.card.sections', { count: board.value.sections.length })].join(' · ')}</span>
          </div>
          <button type="button" className={css.openButton} onClick={() => { props.openBoard(boardId, visual.callId) }}>{t('board.card.open')}</button>
        </div>
        {board.value.summary !== undefined && <p className={css.boardCardSummary}>{plainSummary(board.value.summary)}</p>}
      </div>
    )
  }
  const canvas = validateInline(args)
  if (!canvas.ok) return null
  return <InlineVisual blocks={canvas.value.blocks} sources={canvas.value.sources} props={props} t={t} />
}

function InlineVisual({ blocks, sources, props, t }: { blocks: Parameters<typeof BlockView>[0]['block'][]; sources: CanvasSource[] | undefined; props: TailProps; t: Translate }) {
  const environment = useMemo<CanvasEnvironment>(() => ({
    t,
    sources: sourceMap(sources, blocks.flatMap(block => block.type === 'sources' ? block.items : [])),
    sendPrompt: props.sendPrompt,
    draftPrompt: props.draftPrompt,
    markdownLabels: props.markdownLabels,
    animate: true,
  }), [t, sources, blocks, props.sendPrompt, props.draftPrompt, props.markdownLabels])
  return (
    <CanvasProvider value={environment}>
      <div className={css.inline}>{blocks.map((block, index) => <BlockView key={index} block={block} index={index} />)}</div>
    </CanvasProvider>
  )
}
