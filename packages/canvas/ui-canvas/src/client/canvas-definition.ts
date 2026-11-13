/** Per-call canvas facts folded from Session history into reply-flow Chat nodes. */
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** One show_ui or canvas_board call and, for boards, its publication. */
export interface CanvasVisual {
  readonly callId: string
  readonly name: 'show_ui' | 'canvas_board'
  /** Complete model arguments as logged. */
  readonly argsRaw: string
  /** Set once `canvas/board` records the version this call published. */
  readonly published?: { readonly boardId: string; readonly version: number }
}

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    /** A canvas tool call shown in the reply where the model made it. */
    'canvas-visual': CanvasVisual
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read a canvas call from a logged `tool/call` event.
 * @param event - Session event.
 * @returns the call facts, or undefined for other events.
 */
export function canvasCall(event: { readonly type: string; readonly data: unknown }): CanvasVisual | undefined {
  if (event.type !== 'tool/call' || !isRecord(event.data)) return undefined
  const { name, callId, arguments: argsRaw } = event.data
  if ((name !== 'show_ui' && name !== 'canvas_board') || typeof callId !== 'string' || typeof argsRaw !== 'string') return undefined
  return { callId, name, argsRaw }
}

/**
 * Read a board publication from a logged `canvas/board` event.
 * @param event - Session event.
 * @returns the publishing call id and version, or undefined for other events.
 */
export function boardPublication(
  event: { readonly type: string; readonly data: unknown },
): { callId: string; boardId: string; version: number } | undefined {
  if (event.type !== 'canvas/board' || !isRecord(event.data)) return undefined
  const { callId, boardId, version } = event.data
  if (typeof callId !== 'string' || typeof boardId !== 'string' || typeof version !== 'number') return undefined
  return { callId, boardId, version }
}

/**
 * Chat nodes at Turn level, so a completed Turn's folded work trace never hides
 * the visuals: each node stays at its call's position between the reply text.
 */
export const canvasDefinition: ConversationNodeDefinition<CanvasVisual> = {
  kind: 'canvas-visual',
  target: 'chat',
  match: (event) => {
    const call = canvasCall(event)
    if (call !== undefined) return { id: call.callId, role: 'start' }
    const publication = boardPublication(event)
    return publication === undefined ? null : { id: publication.callId, role: 'update' }
  },
  start: (_context, match) => canvasCall(match.event) as CanvasVisual,
  update: (context, match) => {
    const publication = boardPublication(match.event)
    if (publication === undefined) return context.state
    return { ...context.state, published: { boardId: publication.boardId, version: publication.version } }
  },
  buildViewNode: (context) => {
    const start = context.start ?? context.matches[0]
    if (context.state === undefined || start === undefined) return null
    return {
      key: context.key, kind: 'canvas-visual', id: context.id, target: 'chat',
      anchorSeq: start.event.seq, location: start.location,
      visibility: 'visible', groupTree: 'turn', data: context.state,
    } satisfies ChatNode<'canvas-visual'>
  },
}
