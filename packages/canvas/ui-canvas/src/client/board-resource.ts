/** Board identities and the resource provider that reads board versions from Session history. */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionFollowFrame } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ResourceProvider } from '@deepseek-ai/dsh-client-resources/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { RemoteError, remoteErrorOf, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { validateBoard, type CanvasBoard } from '@deepseek-ai/dsh-canvas-spec'

/** One readable board version. */
export interface BoardVersionView {
  readonly version: number
  readonly callId: string
  readonly board: CanvasBoard
}

/** Every published version of one board, oldest first. */
export interface BoardHistory {
  readonly boardId: string
  readonly versions: readonly BoardVersionView[]
}

/** A saved workspace tab names one board in one root Session; one tab serves all its versions. */
export interface BoardAddress {
  readonly sessionId: SessionId
  readonly boardId: string
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The resource URL does not identify a board. */
    'canvas-board/invalid-address': Record<string, never>
    /** Session history ended before an opening snapshot. */
    'canvas-board/unavailable': Record<string, never>
    /** The Session has no published version of this board. */
    'canvas-board/not-found': Record<string, never>
    /** The Session history read failed. */
    'canvas-board/read-failed': Record<string, never>
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /** Published versions of one canvas board, updated as new versions are published. */
    'canvas-board': BoardHistory
  }
}

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** The board version to show; the latest version when absent. */
    'canvas-board': { readonly callId: string }
  }
}

const PREFIX = 'dsh-resource://canvas-board/'

/**
 * Encode a board version address.
 * @param target - Session, board, and call identity.
 * @returns the resource address.
 */
export function boardAddress(target: BoardAddress): string {
  return `${PREFIX}${[target.sessionId, target.boardId].map(encodeURIComponent).join('/')}`
}

/**
 * Decode a saved or caller-supplied board address.
 * @param address - address submitted to the workspace or the provider.
 * @returns the identity, or undefined for an unsupported address.
 */
export function parseBoardAddress(address: string): BoardAddress | undefined {
  if (!address.startsWith(PREFIX)) return undefined
  try {
    const parts = address.slice(PREFIX.length).split('/').map(decodeURIComponent)
    if (parts.length !== 2 || parts.some(part => part === '')) return undefined
    return { sessionId: parts[0] as SessionId, boardId: parts[1] as string }
  } catch (_error) {
    // Invalid saved percent encoding cannot identify a board.
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Collected facts from history records, in any order. */
interface Collected {
  readonly published: Map<string, number>
  readonly boards: Map<string, CanvasBoard>
}

/**
 * Fold one logged event into the board facts.
 * @param event - Session event from history.
 * @param boardId - board being read.
 * @param into - accumulated facts.
 */
export function collectBoardEvent(event: { readonly type: string; readonly data: unknown }, boardId: string, into: Collected): void {
  const data = event.data
  if (!isRecord(data)) return
  if (event.type === 'canvas/board') {
    if (data.boardId === boardId && typeof data.callId === 'string' && typeof data.version === 'number') into.published.set(data.callId, data.version)
    return
  }
  if (event.type !== 'tool/call' || data.name !== 'canvas_board' || typeof data.callId !== 'string' || typeof data.arguments !== 'string') return
  let args: unknown
  try { args = JSON.parse(data.arguments) } catch (_error) { return /* Malformed calls never published a version. */ }
  const checked = validateBoard(args)
  if (checked.ok) into.boards.set(data.callId, checked.value)
}

/**
 * Assemble the versions of a board from collected facts.
 * @param boardId - board being read.
 * @param facts - collected facts.
 * @returns the history, or undefined when no version was published.
 */
export function assembleHistory(boardId: string, facts: Collected): BoardHistory | undefined {
  const versions = [...facts.published].flatMap(([callId, version]) => {
    const board = facts.boards.get(callId)
    return board === undefined ? [] : [{ version, callId, board }]
  }).sort((a, b) => a.version - b.version)
  return versions.length === 0 ? undefined : { boardId, versions }
}

/**
 * Bind board reads to the Session history Remote.
 * @param remote - Session follow and page API.
 * @returns a provider that reads the complete history, then yields again whenever a new version is published.
 */
export function boardResourceProvider(remote: Pick<Context['remote']['session'], 'follow' | 'page'>): ResourceProvider<'canvas-board'> {
  return {
    protocol: 'canvas-board',
    async *open(address, { signal }): AsyncIterable<RemoteResult<BoardHistory>> {
      // A function read keeps the abort check live across awaits.
      const aborted = (): boolean => signal.aborted
      if (aborted()) return
      const target = parseBoardAddress(address)
      if (target === undefined) {
        yield { ok: false, error: new RemoteError('canvas-board/invalid-address', 'Invalid board resource address.', {}) }
        return
      }
      const sessionAddress = { kind: 'session' as const, sessionId: target.sessionId }
      const facts: Collected = { published: new Map(), boards: new Map() }
      try {
        // The follow stream opens with a snapshot and then delivers new durable events,
        // so an open tab sees versions published after it was opened.
        const frames = remote.follow({ address: sessionAddress }, signal)[Symbol.asyncIterator]()
        let snapshot: Extract<SessionFollowFrame, { type: 'snapshot' }> | undefined
        while (snapshot === undefined) {
          const next = await frames.next()
          if (next.done === true) break
          if (next.value.type === 'snapshot') snapshot = next.value
        }
        if (aborted()) return
        if (snapshot === undefined) throw new RemoteError('canvas-board/unavailable', 'Session history ended before the board could be read.', {})
        let page = { records: snapshot.records, hasMore: snapshot.hasMore }
        while (true) {
          for (const entry of page.records) collectBoardEvent(entry.event, target.boardId, facts)
          const beforeSeq = page.records[0]?.event.seq
          if (!page.hasMore || beforeSeq === undefined) break
          const next = await remote.page({ address: sessionAddress, throughSeq: snapshot.cursor, beforeSeq }, signal)
          if (aborted()) return
          if (!next.ok) { yield next; return }
          page = next.value
        }
        let history = assembleHistory(target.boardId, facts)
        yield history === undefined
          ? { ok: false, error: new RemoteError('canvas-board/not-found', 'The board was not found in this Session.', {}) }
          : { ok: true, value: history }
        while (!aborted()) {
          const next = await frames.next()
          if (next.done === true) return
          if (next.value.type !== 'event') continue
          collectBoardEvent(next.value.event, target.boardId, facts)
          const updated = assembleHistory(target.boardId, facts)
          if (updated !== undefined && updated.versions.length !== history?.versions.length) {
            history = updated
            yield { ok: true, value: updated }
          }
        }
      } catch (error) {
        if (!aborted()) yield {
          ok: false,
          error: remoteErrorOf(error) ?? new RemoteError('canvas-board/read-failed', error instanceof Error ? error.message : String(error), {}),
        }
      }
    },
  }
}
