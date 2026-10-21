/** Reply-flow presentation of one canvas call: its inline components or its published board card. */
import { useMemo } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { validateBoard, validateInline, type CanvasSource } from '@deepseek-ai/dsh-canvas-spec'
import { BlockView } from './Blocks.tsx'
import type { CanvasVisual } from './canvas-definition.ts'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from './context.tsx'
import type { NS } from './locales.ts'
import { BoardIcon, plainSummary, type CanvasViewInjected } from './ToolViews.tsx'
import css from './Canvas.module.css'

type NodeProps = PropsRuntime<'conversation.chat.node', 'canvas-visual'> & InjectFace<CanvasViewInjected> & PropsLocale<typeof NS>

function parse(raw: string): unknown {
  try { return JSON.parse(raw) } catch (_error) { return undefined /* Malformed arguments never displayed. */ }
}

/**
 * Render a canvas call where the model made it in the reply.
 * @param props - the canvas Chat node, copy, and Session actions.
 * @returns the validated components, a published board card, or null while neither exists.
 */
export function CanvasVisualNode(props: NodeProps) {
  const { node, t } = props
  const visual = node.data
  const args = useMemo(() => parse(visual.argsRaw), [visual.argsRaw])
  if (visual.name === 'canvas_board') return <PublishedBoard visual={visual} args={args} props={props} t={t} />
  const canvas = validateInline(args)
  if (!canvas.ok) return null
  return <InlineVisual blocks={canvas.value.blocks} sources={canvas.value.sources} props={props} t={t} />
}

function PublishedBoard({ visual, args, props, t }: { visual: CanvasVisual; args: unknown; props: NodeProps; t: Translate }) {
  if (visual.published === undefined) return null
  const board = validateBoard(args)
  if (!board.ok) return null
  const { boardId, version } = visual.published
  const kind = t(board.value.layout === 'slides' ? 'board.card.slides' : 'board.card.sections', { count: board.value.sections.length })
  return (
    <div className={css.boardCard} data-state="done">
      <div className={css.boardCardMain}>
        <BoardIcon />
        <div className={css.boardCardText}>
          <strong className={css.boardCardTitle}>{board.value.title}</strong>
          <span className={css.muted}>{[t('board.card.ready', { version }), kind].join(' · ')}</span>
        </div>
        <button type="button" className={css.openButton} onClick={() => { props.openBoard(boardId, visual.callId) }}>{t('board.card.open')}</button>
      </div>
      {board.value.summary !== undefined && <p className={css.boardCardSummary}>{plainSummary(board.value.summary)}</p>}
    </div>
  )
}

interface InlineVisualProps {
  readonly blocks: Parameters<typeof BlockView>[0]['block'][]
  readonly sources: CanvasSource[] | undefined
  readonly props: NodeProps
  readonly t: Translate
}

function InlineVisual({ blocks, sources, props, t }: InlineVisualProps) {
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
