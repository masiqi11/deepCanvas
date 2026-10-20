/**
 * Model-facing canvas tools: `show_ui` renders validated components inline in
 * the conversation, and `canvas_board` publishes immutable board versions to
 * the workspace. Descriptions live in the call arguments; a successful board
 * call appends `canvas/board`, which the `canvasBoards` projection folds into
 * per-board version lists.
 * @module @deepseek-ai/dsh-tool-canvas
 */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { z as zod } from 'zod'
import { defineTool, type ToolExecution } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolCallId } from '@deepseek-ai/dsh-llm/brand'
import {
  BLOCK_TYPES, validateBoard, validateInline, type CanvasLimits, type Validation,
} from '@deepseek-ai/dsh-canvas-spec'
import { PRESENTATION_GUIDANCE } from './prompt.ts'
import type { CanvasBoardsState } from './types.ts'

export type * from './types.ts'

/** Stable Loader identity. */
export const name = 'tool-canvas'

/** Services used by the scoped canvas tools. */
export const inject = ['tools', 'sessionProjections', 'systemPrompt']

/** Validation size limits; each bound applies to one description. */
export interface Config {
  limits: CanvasLimits
}

/** Validated limits with the shipped defaults. */
export const Config: z<Config> = z.object({
  limits: z.object({
    blocks: z.natural().default(60).description('Blocks in one block list.'),
    sections: z.natural().default(24).description('Board sections or slides.'),
    items: z.natural().default(200).description('Entries in one list field.'),
    series: z.natural().default(12).description('Series in one chart.'),
    depth: z.natural().default(3).description('Nesting of tabs, accordion, and columns.'),
    text: z.natural().default(20_000).description('Characters in one text field.'),
    html: z.natural().default(200_000).description('Characters in one html block.'),
  }),
})

const boardsSchema: zod.ZodType<CanvasBoardsState> = zod.record(zod.string(), zod.object({
  title: zod.string(),
  versions: zod.array(zod.object({ version: zod.number(), callId: zod.custom<ToolCallId>(value => typeof value === 'string'), title: zod.string() })),
}))

const BLOCKS_PARAMETER = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    properties: { type: { type: 'string', required: true, enum: [...BLOCK_TYPES] } },
  },
} as const

const SOURCES_PARAMETER = {
  type: 'array',
  description: 'Sources cited by id from blocks: {id, title, url, publisher?, published?, accessed?, excerpt?}.',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', required: true },
      title: { type: 'string', required: true },
      url: { type: 'string', required: true },
      publisher: { type: 'string' },
      published: { type: 'string' },
      accessed: { type: 'string' },
      excerpt: { type: 'string' },
    },
  },
} as const

/** Host-only fold of `canvas/board` events into per-board version lists. */
export const canvasBoardsProjection = {
  key: 'canvasBoards',
  stateSchema: boardsSchema,
  init: (): CanvasBoardsState => ({}),
  apply: (state: CanvasBoardsState, event: SessionEvent): CanvasBoardsState => {
    if (event.type !== 'canvas/board') return state
    const { boardId, version, callId, title } = event.data
    const previous = state[boardId]?.versions ?? []
    return { ...state, [boardId]: { title, versions: [...previous, { version, callId, title }] } }
  },
  stateVersion: 1,
} as const

/** Turn validation problems into a tool error the model can act on. */
function rejectInvalid<T>(tool: string, validation: Validation<T>): T {
  if (validation.ok) return validation.value
  throw new Error(`${tool} arguments are invalid; nothing was shown. Fix these problems and call ${tool} again:\n- ${validation.problems.join('\n- ')}`)
}

/** Lowercase slug of a title, for readable board ids. */
function slug(title: string): string {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  return ascii === '' ? 'board' : ascii
}

/**
 * Register the canvas tools, the board projection, and the presentation guidance.
 * @param ctx - agent-scoped services.
 * @param config - validation limits.
 */
export function apply(ctx: Context, config: Config): void {
  const limits = config.limits
  ctx.sessionProjections.register(canvasBoardsProjection)
  ctx.systemPrompt.section({
    name: 'canvas:presentation',
    order: ctx.systemPrompt.getSectionOrder('TOOL_REPORT'),
    text: PRESENTATION_GUIDANCE,
  })

  ctx.tools.register(defineTool({
    name: 'show_ui',
    description: 'Show validated visual components inside the conversation, such as a comparison table, chart, cards, timeline, or calculator. '
      + 'See "Presenting results" for when to use it and the component reference for block fields. '
      + 'Invalid arguments return the problems to fix; nothing is shown until the call succeeds.',
    parameters: {
      blocks: { ...BLOCKS_PARAMETER, required: true, description: 'Components in display order.' },
      sources: SOURCES_PARAMETER,
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { blocks: { type: 'integer', required: true } },
      },
      render: (_args, value) => [{ type: 'text', text: `Displayed ${value.blocks} component(s) to the user.` }],
    },
    execute(args) {
      const canvas = rejectInvalid('show_ui', validateInline(args, limits))
      return Promise.resolve({ blocks: canvas.blocks.length })
    },
    presentCall: () => ({ card: 'generic', title: 'Show visual answer', kind: 'other' }),
  }))

  const pending = new WeakMap<ToolExecution, { session: Session; boardId: string; version: number; title: string }>()
  const reserved = new WeakMap<Session, Map<string, number>>()
  ctx.tools.register(defineTool({
    name: 'canvas_board',
    description: 'Publish a board to the user\'s workspace: a complete, navigable deliverable built from components. '
      + 'Omit board_id to create a board; pass the board_id from an earlier result to publish a new version of that board, which keeps earlier versions. '
      + 'Each call carries the complete board, not a diff. Invalid arguments return the problems to fix and publish nothing.',
    parameters: {
      board_id: { type: 'string', description: 'Existing board to revise; omit to create a new board.' },
      title: { type: 'string', required: true },
      subtitle: { type: 'string' },
      layout: { type: 'string', required: true, enum: ['report', 'slides'], description: 'report scrolls; slides pages one section at a time.' },
      summary: { type: 'string', description: 'Key takeaway shown first.' },
      sections: {
        type: 'array', required: true,
        description: 'Report sections or slides, in order.',
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            title: { type: 'string', required: true },
            eyebrow: { type: 'string' },
            blocks: { ...BLOCKS_PARAMETER, required: true },
          },
        },
      },
      sources: SOURCES_PARAMETER,
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          board_id: { type: 'string', required: true },
          version: { type: 'integer', required: true },
          title: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Published board "${value.title}" (board_id ${value.board_id}, version ${value.version}). The user can open it from the conversation.`,
      }],
    },
    execute(args, exec) {
      if (exec.agent === undefined) throw new Error('canvas_board requires an agent Session')
      const board = rejectInvalid('canvas_board', validateBoard(args, limits))
      const session = exec.agent.session
      // This plugin registers the projection, so the read cannot miss its key.
      /* v8 ignore next */
      const boards = ctx.sessionProjections.stateOf(session, 'canvasBoards') ?? {}
      const requested = args.board_id?.trim()
      if (requested !== undefined && requested !== '' && boards[requested] === undefined) {
        throw new Error(`Unknown board_id "${requested}". Omit board_id to create a new board, or use an id returned by an earlier canvas_board call.`)
      }
      const boardId = requested !== undefined && requested !== '' ? requested : `${slug(board.title)}-${randomUUID().slice(0, 8)}`
      const sessionReserved = reserved.get(session) ?? new Map<string, number>()
      reserved.set(session, sessionReserved)
      const version = Math.max(boards[boardId]?.versions.length ?? 0, sessionReserved.get(boardId) ?? 0) + 1
      sessionReserved.set(boardId, version)
      pending.set(exec, { session, boardId, version, title: board.title })
      return Promise.resolve({ board_id: boardId, version, title: board.title })
    },
    presentCall: args => ({ card: 'generic', title: `Publish board ${args.title}`, kind: 'other' }),
  }))
  ctx.on('tools/result', (exec, result) => {
    const publication = pending.get(exec)
    pending.delete(exec)
    if (publication === undefined || result.isError) return
    const { session, boardId, version, title } = publication
    session.append('canvas/board', { boardId, version, callId: exec.callId, title })
  })
}
