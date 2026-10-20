/** Canvas tools validate descriptions and commit board versions only after a successful result. */
import { unsupportedInbox } from '@deepseek-ai/dsh-agent-loop-testkit'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { createScope, type Scope } from '@deepseek-ai/dsh-scope'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as Canvas from '../src/index.ts'

const LIMITS = { blocks: 60, sections: 24, items: 200, series: 12, depth: 3, text: 20_000, html: 200_000 }
const cleanups: Array<() => Promise<unknown>> = []
let callNumber = 0
afterEach(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup()
  cleanups.length = 0
})

async function agent(ctx: Context): Promise<Agent> {
  const id = SessionId(`canvas-owner-${++callNumber}`)
  let scope: Scope
  const session = Session.create(id, [], { version: SESSION_FORMAT_VERSION, id, createdAt: 0, isSeeded: false })
  const value: Agent = {
    id,
    options: {},
    session,
    inbox: unsupportedInbox(),
    status: 'idle',
    get ctx() { return scope.ctx },
    send: () => {},
    followup: () => {},
    steer: () => ({ outcome: Promise.resolve({ status: 'rejected' as const }) }),
    inject: () => {},
    cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  await ctx.plugin(Object.assign((inner: Context) => { scope = createScope(inner, value) }, { inject: ['tools'] }))
  await ctx.agents.register(value)
  return value
}

async function setup() {
  const ctx = new Context()
  cleanups.push(() => ctx.fiber.dispose())
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SessionProjectionRegistry)
  const fiber = ctx.plugin(Canvas, { limits: LIMITS })
  await fiber
  const owner = await agent(ctx)
  const execute = (name: string, args: Record<string, unknown>, caller: Agent | null = owner) => ctx.tools.execute({
    signal: new AbortController().signal, callId: ToolCallId(`call-${++callNumber}`), name, arguments: args,
    ...caller === null ? {} : { agent: caller },
  })
  return { ctx, owner, fiber, execute }
}

const text = (result: { readonly content: ReadonlyArray<{ readonly type: string; readonly text?: string }> }): string =>
  result.content.map(block => block.type === 'text' ? block.text ?? '' : '').join('')

const BOARD = {
  title: '大学生 AI 学习助手市场',
  layout: 'report',
  summary: '机会集中在课程场景。',
  sections: [{ title: '结论', blocks: [{ type: 'callout', tone: 'info', text: '缺少可靠的市场规模数据。', evidence: 'unverified' }] }],
}

it('validates persisted projection state', () => {
  const state = { b: { title: 't', versions: [{ version: 1, callId: 'c', title: 't' }] } }
  expect(Canvas.canvasBoardsProjection.stateSchema.parse(state)).toEqual(state)
  expect(() => Canvas.canvasBoardsProjection.stateSchema.parse({ b: { title: 't', versions: [{ version: 1, callId: 7, title: 't' }] } })).toThrow()
})

describe('show_ui', () => {
  it('accepts valid components and reports how many were shown', async () => {
    const { execute } = await setup()
    const result = await execute('show_ui', { blocks: [{ type: 'markdown', text: 'hi' }, { type: 'stats', items: [{ label: 'A', value: 1 }] }] })
    expect(result.isError).toBe(false)
    expect(text(result)).toBe('Displayed 2 component(s) to the user.')
  })

  it('returns every validation problem so the model can repair the call', async () => {
    const { execute } = await setup()
    const result = await execute('show_ui', { blocks: [{ type: 'chart', kind: 'bar', labels: ['a'], series: [{ name: 's', values: [1, 2] }] }] })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('show_ui arguments are invalid; nothing was shown. Fix these problems and call show_ui again:\n- arguments.blocks[0].series[0].values: expected 1 values to match labels')
  })
})

describe('canvas_board', () => {
  it('creates a board and publishes later versions under the same id', async () => {
    const { ctx, owner, execute } = await setup()
    const first = await execute('canvas_board', BOARD)
    expect(first.isError).toBe(false)
    if (first.isError) throw new Error('board failed')
    const created = first.value as { board_id: string; version: number; title: string }
    expect(created.board_id).toMatch(/^ai-[0-9a-f]{8}$/)
    expect(created.version).toBe(1)
    expect(text(first)).toBe(`Published board "大学生 AI 学习助手市场" (board_id ${created.board_id}, version 1). The user can open it from the conversation.`)

    const second = await execute('canvas_board', { ...BOARD, board_id: created.board_id, title: 'Revised', layout: 'slides' })
    expect(second.isError).toBe(false)
    if (second.isError) throw new Error('revision failed')
    expect(second.value).toEqual({ board_id: created.board_id, version: 2, title: 'Revised' })

    const events = owner.session.snapshotEvents().filter(event => event.type === 'canvas/board').map(event => event.data)
    expect(events.map(event => [event.boardId, event.version, event.title])).toEqual([
      [created.board_id, 1, '大学生 AI 学习助手市场'], [created.board_id, 2, 'Revised'],
    ])
    expect(ctx.sessionProjections.stateOf(owner.session, 'canvasBoards')).toEqual({
      [created.board_id]: { title: 'Revised', versions: events.map(({ version, callId, title }) => ({ version, callId, title })) },
    })
  })

  it('derives readable ids from Latin titles', async () => {
    const { execute } = await setup()
    const result = await execute('canvas_board', { ...BOARD, title: 'AI Tutor Market: China 2026' })
    if (result.isError) throw new Error('board failed')
    expect((result.value as { board_id: string }).board_id).toMatch(/^ai-tutor-market-china-2026-[0-9a-f]{8}$/)
  })

  it('reserves distinct versions for revisions that run concurrently', async () => {
    const { execute } = await setup()
    const first = await execute('canvas_board', BOARD)
    if (first.isError) throw new Error('board failed')
    const id = (first.value as { board_id: string }).board_id
    const [a, b] = await Promise.all([execute('canvas_board', { ...BOARD, board_id: id }), execute('canvas_board', { ...BOARD, board_id: id })])
    expect([a, b].map(result => result.isError ? 0 : (result.value as { version: number }).version).sort()).toEqual([2, 3])
  })

  it('rejects unknown ids, invalid boards, and calls without an agent, publishing nothing', async () => {
    const { owner, execute } = await setup()
    const unknown = await execute('canvas_board', { ...BOARD, board_id: 'ghost' })
    expect(text(unknown)).toContain('Unknown board_id "ghost"')
    const invalid = await execute('canvas_board', { ...BOARD, sections: [{ title: 'x', blocks: [] }] })
    expect(text(invalid)).toContain('- board.sections[0].blocks: expected at least one entry')
    const detached = await execute('canvas_board', BOARD, null)
    expect(detached.isError).toBe(true)
    expect(owner.session.snapshotEvents().some(event => event.type === 'canvas/board')).toBe(false)
  })

  it('does not publish when post-execute blocks a successful call', async () => {
    const { ctx, owner, execute } = await setup()
    ctx.on('tools/post-execute', async (_exec, _result, next) => {
      await next()
      return { kind: 'block', feedback: [{ type: 'text', text: 'blocked' }] }
    })
    expect((await execute('canvas_board', BOARD)).isError).toBe(true)
    expect(owner.session.snapshotEvents().some(event => event.type === 'canvas/board')).toBe(false)
  })

  it('names a board without Latin letters generically', async () => {
    const { execute } = await setup()
    const result = await execute('canvas_board', { ...BOARD, title: '市场' })
    if (result.isError) throw new Error('board failed')
    expect((result.value as { board_id: string }).board_id).toMatch(/^board-[0-9a-f]{8}$/)
  })

  it('treats a blank board_id as a new board and removes the tools on dispose', async () => {
    const { ctx, owner, fiber, execute } = await setup()
    const result = await execute('canvas_board', { ...BOARD, board_id: '  ' })
    expect(result.isError).toBe(false)
    expect(ctx.systemPrompt).toBeDefined()
    expect(ctx.tools.get('show_ui', owner)?.presentCall?.({ blocks: [] })).toEqual({ card: 'generic', title: 'Show visual answer', kind: 'other' })
    expect(ctx.tools.get('canvas_board', owner)?.presentCall?.(BOARD)).toEqual({ card: 'generic', title: `Publish board ${BOARD.title}`, kind: 'other' })
    await fiber.dispose()
    expect(ctx.tools.get('canvas_board', owner)).toBeUndefined()
    expect(ctx.tools.get('show_ui', owner)).toBeUndefined()
  })
})
