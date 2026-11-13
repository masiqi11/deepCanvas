/**
 * Durable board publication facts declared by the canvas tools.
 * @module @deepseek-ai/dsh-tool-canvas/types
 */
import type { ToolCallId } from '@deepseek-ai/dsh-llm/brand'

/** One published board version; its content is the arguments of the cited `canvas_board` call. */
export interface CanvasBoardVersion {
  /** One-based version number within its board. */
  version: number
  /** The `canvas_board` call whose arguments hold this version. */
  callId: ToolCallId
  /** Board title at this version. */
  title: string
}

/** Every board of one Session with its versions in publication order. */
export type CanvasBoardsState = Record<string, { title: string; versions: CanvasBoardVersion[] }>

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** A successful `canvas_board` call published a new board version. Log-only UI state; never derived history. */
    'canvas/board': { boardId: string; version: number; callId: ToolCallId; title: string }
  }
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Boards and versions published in the Session, folded from `canvas/board`. */
    canvasBoards: CanvasBoardsState
  }
}
