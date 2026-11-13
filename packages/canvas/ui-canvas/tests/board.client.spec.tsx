// @vitest-environment jsdom
/** Boards are read from Session history, stay live, render as reports or slides, export offline, and surface in the conversation. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import type { CanvasBoard } from '@deepseek-ai/dsh-canvas-spec'
import {
  assembleHistory, boardAddress, boardResourceProvider, collectBoardEvent, parseBoardAddress, type BoardHistory,
} from '../src/client/board-resource.ts'
import { BoardDocument, BoardTab, BoardTitle } from '../src/client/BoardView.tsx'
import { boardPublication, canvasCall, canvasDefinition, type CanvasVisual } from '../src/client/canvas-definition.ts'
import { downloadBoard, exportDocument, pageStyles } from '../src/client/export.ts'
import { CanvasVisualNode } from '../src/client/VisualNode.tsx'
import { BoardCardView, InlineCanvasView, plainSummary } from '../src/client/ToolViews.tsx'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from '../src/client/context.tsx'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const t: Translate = makeTranslate(zh)
const labels: CanvasEnvironment['markdownLabels'] = { code: { copyLabel: 'c', copiedLabel: 'd', toolbarLabels: { codeLabel: 'c', wrapLabel: 'w', unwrapLabel: 'u' } }, footnotes: 'f' }

const BOARD: CanvasBoard = {
  title: 'Market board', subtitle: 'Sub', layout: 'report', summary: '**Key** finding',
  sources: [{ id: 's1', title: 'Survey', url: 'https://example.com/s' }],
  sections: [
    { title: 'Findings', blocks: [{ type: 'markdown', text: 'one', sources: ['s1'] }, { type: 'actions', items: [{ label: 'Go', prompt: 'next' }] }] },
    { title: 'Details', eyebrow: 'Deep', blocks: [{ type: 'tabs', tabs: [{ label: 'A', blocks: [{ type: 'markdown', text: 'a' }] }, { label: 'B', blocks: [{ type: 'markdown', text: 'b' }] }] }] },
  ],
}
const SLIDES: CanvasBoard = { title: BOARD.title, layout: 'slides', sections: BOARD.sections, ...BOARD.sources === undefined ? {} : { sources: BOARD.sources } }

const callEvent = (callId: string, board: unknown, name = 'canvas_board') => ({ type: 'tool/call', data: { name, callId, arguments: JSON.stringify(board) } })
const publishEvent = (callId: string, version: number, boardId = 'b1') => ({ type: 'canvas/board', data: { boardId, version, callId, title: 'x' } })

describe('board addresses and history', () => {
  it('round-trips addresses and rejects other shapes', () => {
    const address = boardAddress({ sessionId: 'sess/1' as never, boardId: 'b 1' })
    expect(address).toBe('dsh-resource://canvas-board/sess%2F1/b%201')
    expect(parseBoardAddress(address)).toEqual({ sessionId: 'sess/1', boardId: 'b 1' })
    for (const bad of ['dsh-resource://plan/a/b', 'dsh-resource://canvas-board/a', 'dsh-resource://canvas-board/a//', 'dsh-resource://canvas-board/%E0/b']) {
      expect(parseBoardAddress(bad)).toBeUndefined()
    }
  })

  it('assembles published versions in order and ignores unpublished or malformed calls', () => {
    const facts = { published: new Map<string, number>(), boards: new Map<string, CanvasBoard>() }
    for (const event of [
      callEvent('c2', { ...BOARD, title: 'v2' }), publishEvent('c2', 2), callEvent('c1', BOARD), publishEvent('c1', 1),
      callEvent('c3', BOARD), { type: 'tool/call', data: { name: 'canvas_board', callId: 'bad', arguments: '{' } },
      callEvent('c4', { title: 'invalid' }), publishEvent('c4', 4), publishEvent('other', 1, 'b2'),
      callEvent('c5', BOARD, 'show_ui'), { type: 'tool/call', data: 'x' }, { type: 'canvas/board', data: { boardId: 'b1' } },
    ]) collectBoardEvent(event, 'b1', facts)
    const history = assembleHistory('b1', facts)
    expect(history?.versions.map(version => [version.version, version.callId, version.board.title])).toEqual([[1, 'c1', 'Market board'], [2, 'c2', 'v2']])
    expect(assembleHistory('none', { published: new Map(), boards: new Map() })).toBeUndefined()
  })
})

function remote(frames: unknown[], pages: unknown[] = []) {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  return {
    release: () => { release() },
    session: {
      follow: vi.fn(async function* () {
        for (const frame of frames) yield frame
        await gate
      }),
      page: vi.fn(() => Promise.resolve(pages.shift())),
    },
  }
}

async function collect(
  provider: ReturnType<typeof boardResourceProvider>, address: string, count: number, signal = new AbortController().signal,
) {
  const results: unknown[] = []
  for await (const result of provider.open(address, { signal })) {
    results.push(result)
    if (results.length === count) break
  }
  return results
}

describe('board resource provider', () => {
  const address = boardAddress({ sessionId: 's' as never, boardId: 'b1' })
  const snapshot = (records: unknown[], hasMore = false) => ({ type: 'snapshot', cursor: 9, hasMore, records: records.map((event, seq) => ({ type: 'event', event: { ...event as object, seq: seq + 5 } })) })

  it('reads older pages, then yields again when a new version is published', async () => {
    const fake = remote([
      { type: 'assistant-stream' },
      snapshot([publishEvent('c1', 1)], true),
      { type: 'event', event: callEvent('c2', { ...BOARD, title: 'v2' }) },
      { type: 'event', event: { type: 'turn/end', data: {} } },
      { type: 'assistant-stream' },
      { type: 'event', event: publishEvent('c2', 2) },
    ], [{ ok: true, value: { records: [{ type: 'event', event: { ...callEvent('c1', BOARD), seq: 1 } }], hasMore: false } }])
    const results = await collect(boardResourceProvider(fake.session as never), address, 2)
    expect(fake.session.page).toHaveBeenCalledWith({ address: { kind: 'session', sessionId: 's' }, throughSeq: 9, beforeSeq: 5 }, expect.anything())
    expect((results as Array<{ value: BoardHistory }>).map(result => result.value.versions.length)).toEqual([1, 2])
  })

  it('reports invalid addresses, missing snapshots, missing boards, page failures, and read errors', async () => {
    const provider = (frames: unknown[], pages?: unknown[]) => boardResourceProvider(remote(frames, pages).session as never)
    expect(await collect(provider([]), 'dsh-resource://canvas-board/x', 5)).toMatchObject([{ ok: false, error: { code: 'canvas-board/invalid-address' } }])
    const ended = { session: { follow: async function* () {}, page: vi.fn() } }
    expect(await collect(boardResourceProvider(ended.session as never), address, 1)).toMatchObject([{ ok: false, error: { code: 'canvas-board/unavailable' } }])
    expect(await collect(provider([snapshot([])]), address, 1)).toMatchObject([{ ok: false, error: { code: 'canvas-board/not-found' } }])
    const pageFailure = { ok: false, error: { code: 'session/gone', message: 'gone' } }
    expect(await collect(provider([snapshot([publishEvent('c1', 1)], true)], [pageFailure]), address, 5)).toEqual([pageFailure])
    const broken = { session: { follow: async function* () { yield await Promise.reject(new Error('socket closed')) }, page: vi.fn() } }
    expect(await collect(boardResourceProvider(broken.session as never), address, 1)).toMatchObject([{ ok: false, error: { code: 'canvas-board/read-failed', message: 'socket closed' } }])
    const thrown = { session: {
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- non-Error rejection normalization is the scenario.
      follow: async function* () { yield await Promise.reject('text') }, page: vi.fn(),
    } }
    expect(await collect(boardResourceProvider(thrown.session as never), address, 1)).toMatchObject([{ ok: false, error: { message: 'text' } }])
  })

  it('stops quietly when the reader aborts or the stream ends', async () => {
    const aborted = new AbortController()
    aborted.abort()
    expect(await collect(boardResourceProvider(remote([]).session as never), address, 1, aborted.signal)).toEqual([])
    const controller = new AbortController()
    const fake = remote([snapshot([callEvent('c1', BOARD), publishEvent('c1', 1)])])
    const iterator = boardResourceProvider(fake.session as never).open(address, { signal: controller.signal })[Symbol.asyncIterator]()
    expect(((await iterator.next()).value as { ok: boolean }).ok).toBe(true)
    const pending = iterator.next()
    controller.abort()
    fake.release()
    expect((await pending).done).toBe(true)
    const ending = { session: { follow: async function* () { yield snapshot([callEvent('c1', BOARD), publishEvent('c1', 1)]) }, page: vi.fn() } }
    expect(await collect(boardResourceProvider(ending.session as never), address, 5)).toHaveLength(1)
    const late = new AbortController()
    const pageAbort = { session: { follow: async function* () { yield snapshot([publishEvent('c1', 1)], true) }, page: vi.fn(() => { late.abort(); return Promise.resolve({ ok: true, value: { records: [], hasMore: false } }) }) } }
    expect(await collect(boardResourceProvider(pageAbort.session as never), address, 1, late.signal)).toEqual([])
    const snapAbort = new AbortController()
    const snapshotAbort = { session: { follow: async function* () { snapAbort.abort(); yield snapshot([]) }, page: vi.fn() } }
    expect(await collect(boardResourceProvider(snapshotAbort.session as never), address, 1, snapAbort.signal)).toEqual([])
    const errAbort = new AbortController()
    const errorAbort = { session: { follow: async function* () { errAbort.abort(); yield await Promise.reject(new Error('x')) }, page: vi.fn() } }
    expect(await collect(boardResourceProvider(errorAbort.session as never), address, 1, errAbort.signal)).toEqual([])
  })
})

function boardEnvironment(animate = false): CanvasEnvironment {
  return { t, sources: sourceMap(BOARD.sources), sendPrompt: vi.fn(), draftPrompt: vi.fn(), markdownLabels: labels, animate }
}

describe('BoardDocument', () => {
  it('renders a report with contents navigation, sources, and version choices', () => {
    const onSelect = vi.fn()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    render(<CanvasProvider value={boardEnvironment()}>
      <BoardDocument board={BOARD} t={t} versions={[{ callId: 'c1', label: 'v1' }, { callId: 'c2', label: 'v2' }]} selected="c2" onSelect={onSelect} />
    </CanvasProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Market board' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '02Details' }))
    expect(scroll).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } })
    expect(onSelect).toHaveBeenCalledWith('c1')
    expect(screen.getAllByText('来源').length).toBeGreaterThan(0)
  })

  it('pages slides by buttons, dots, and keys, and toggles presentation', async () => {
    const request = vi.fn(function (this: HTMLElement) {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: this })
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    })
    HTMLElement.prototype.requestFullscreen = request
    const exit = vi.fn(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    })
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    const view = render(<CanvasProvider value={boardEnvironment()}>
      <BoardDocument board={SLIDES} t={t} versions={[{ callId: 'c1', label: '版本 1' }]} selected="c1" onSelect={vi.fn()} />
    </CanvasProvider>)
    const active = (): string | null | undefined => view.container.querySelector('section[data-active] h2')?.textContent
    expect(active()).toBe('Findings')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(active()).toBe('Details')
    expect(screen.getByText('2 / 2')).toBeTruthy()
    const board = view.container.firstElementChild as HTMLElement
    fireEvent.keyDown(board, { key: 'ArrowLeft' })
    expect(active()).toBe('Findings')
    fireEvent.keyDown(board, { key: ' ' })
    expect(active()).toBe('Details')
    fireEvent.keyDown(board, { key: 'x' })
    fireEvent.click(screen.getByRole('button', { name: 'Findings' }))
    expect(active()).toBe('Findings')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    fireEvent.click(screen.getByRole('button', { name: '上一页' }))
    expect(active()).toBe('Findings')
    fireEvent.click(screen.getByRole('button', { name: '演示' }))
    await waitFor(() => { expect(screen.getByRole('button', { name: '退出演示' })).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: '退出演示' }))
    await waitFor(() => { expect(screen.getByRole('button', { name: '演示' })).toBeTruthy() })
    expect(exit).toHaveBeenCalled()
    HTMLElement.prototype.requestFullscreen = vi.fn(() => Promise.reject(new Error('denied')))
    fireEvent.click(screen.getByRole('button', { name: '演示' }))
    await waitFor(() => { expect(screen.getByRole('button', { name: '退出演示' })).toBeTruthy() })
  })

  it('ignores slide keys in report layout and exports the rendered board', () => {
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.useFakeTimers()
    const view = render(<CanvasProvider value={boardEnvironment()}>
      <BoardDocument board={BOARD} t={t} versions={[{ callId: 'c1', label: '版本 1' }]} selected="c1" onSelect={vi.fn()} />
    </CanvasProvider>)
    fireEvent.keyDown(view.container.firstElementChild as HTMLElement, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '导出 HTML' }))
    expect(click).toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(revoke).toHaveBeenCalledWith('blob:x')
    vi.useRealTimers()
  })
})

describe('export', () => {
  it('shows every panel, removes workspace controls, and disables agent actions', () => {
    const view = render(<CanvasProvider value={boardEnvironment(true)}>
      <BoardDocument board={SLIDES} t={t} versions={[{ callId: 'c1', label: '版本 1' }]} selected="c1" onSelect={vi.fn()} />
    </CanvasProvider>)
    document.body.setAttribute('data-ds-dark-theme', '')
    document.documentElement.lang = 'zh-CN'
    const html = exportDocument(view.container.firstElementChild as HTMLElement, 'A <b>&"</b>', '离线不可用')
    document.body.removeAttribute('data-ds-dark-theme')
    expect(html).toContain('<title>A &lt;b&gt;&amp;&quot;&lt;/b&gt;</title>')
    expect(html).toContain('<body data-ds-dark-theme="">')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelectorAll('[data-cv-toolbar]')).toHaveLength(0)
    expect(doc.querySelectorAll('[hidden]')).toHaveLength(0)
    expect(doc.querySelectorAll('section[data-active]')).toHaveLength(2)
    const action = doc.querySelector('[data-cv-action]') as HTMLButtonElement
    expect(action.hasAttribute('disabled')).toBe(true)
    expect(action.title).toBe('离线不可用')
    expect(doc.querySelectorAll('[data-animate]')).toHaveLength(0)
  })

  it('omits the source appendix for a board without sources', () => {
    render(<CanvasProvider value={boardEnvironment()}>
      <BoardDocument board={{ title: 'Bare', layout: 'report', sections: [{ title: 'Only', blocks: [{ type: 'markdown', text: 'x' }] }] }} t={t} versions={[{ callId: 'c', label: 'v' }]} selected="c" onSelect={vi.fn()} />
    </CanvasProvider>)
    expect(screen.queryByText('来源')).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('copies readable style rules and skips sheets that refuse access', () => {
    const style = document.createElement('style')
    style.textContent = '.x { color: red; }'
    document.head.append(style)
    const blocked = { get cssRules(): CSSRuleList { throw new DOMException('cross-origin') } }
    expect(pageStyles([...Array.from(document.styleSheets), blocked])).toContain('color: red')
    style.remove()
  })

  it('names the download after the title', () => {
    URL.createObjectURL = vi.fn(() => 'blob:y')
    URL.revokeObjectURL = vi.fn()
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download })
    const root = document.createElement('div')
    document.body.append(root)
    downloadBoard(root, 'a/b: c', 'x')
    expect(name).toBe('a b  c.html')
    downloadBoard(root, '///', 'x')
    expect(name).toBe('board.html')
    root.remove()
  })
})

const viewActions = () => ({ sendPrompt: vi.fn(), draftPrompt: vi.fn(), openBoard: vi.fn(), markdownLabels: labels })
type InlineProps = Parameters<typeof InlineCanvasView>[0]

function streaming(text: string): PartialArguments {
  const view = new PartialArguments()
  view.append(text)
  return view
}

function viewProps(phase: 'preparing' | 'start' | 'result', args: PartialArguments, result?: { text: string; isError?: boolean; code?: string }): InlineProps {
  const block = phase === 'result'
    ? { kind: 'tool-result', args, content: [{ type: 'text', text: result?.text ?? '' }, { type: 'image', data: '', mimeType: 'image/png' }], isError: result?.isError ?? false, ...result?.code === undefined ? {} : { error: { name: 'Error', code: result.code } } }
    : { phase, args, argsRaw: '' }
  return { phase, block, callId: 'call-1', toolName: 'show_ui', t, ...viewActions() } as InlineProps
}

describe('show_ui conversation view', () => {
  it('renders complete streamed blocks and a placeholder for the block still arriving', () => {
    render(<InlineCanvasView {...viewProps('preparing', streaming('{"blocks":[{"type":"markdown","text":"first"},{"type":"stats","items":[{"label":"A","value":1}]},{"type":"markdown","text":"sec'))} />)
    expect(screen.getByText('first')).toBeTruthy()
    expect(screen.getByText('A')).toBeTruthy()
    expect(screen.getByRole('status', { name: '正在生成…' })).toBeTruthy()
  })

  it('shows a building row before any block arrives and cites streamed sources', () => {
    const empty = render(<InlineCanvasView {...viewProps('preparing', streaming('{"blo'))} />)
    expect(screen.getByText('正在生成可视化…')).toBeTruthy()
    empty.unmount()
    render(<InlineCanvasView {...viewProps('preparing', streaming(JSON.stringify({
      sources: [{ id: 's0', title: 'Top', url: 'https://top' }, { id: 1 }],
      blocks: [{ type: 'markdown', text: 'done', sources: ['s1'] }, { type: 'markdown' }, { type: 'sources', items: [{ id: 's1', title: 'Survey', url: 'https://x' }] }, { type: 'markdown', text: 'tail' }],
    })))} />)
    expect(screen.getByText('done')).toBeTruthy()
    expect(screen.getByTitle('来源：Survey').textContent).toBe('2')
    expect(screen.getAllByRole('status', { name: '正在生成…' })).toHaveLength(2)
  })

  it('compacts once the call is logged', () => {
    render(<InlineCanvasView {...viewProps('start', PartialArguments.fromText(JSON.stringify({ blocks: [{ type: 'markdown', text: 'ok' }], sources: 'x' })))} />)
    expect(screen.getByText('已展示 1 个组件')).toBeTruthy()
    expect(screen.queryByText('ok')).toBeNull()
    cleanup()
    render(<InlineCanvasView {...viewProps('start', PartialArguments.fromText('{"blocks":"x"}'))} />)
    expect(screen.getByText('已展示 0 个组件')).toBeTruthy()
  })

  it('compacts after success and explains failures or interruptions', () => {
    const args = PartialArguments.fromText('{"blocks":[{"type":"markdown","text":"x"}]}')
    const done = render(<InlineCanvasView {...viewProps('result', args, { text: 'Displayed' })} />)
    expect(screen.getByText('已展示 1 个组件')).toBeTruthy()
    done.unmount()
    const failed = render(<InlineCanvasView {...viewProps('result', args, { text: '- arguments.blocks[0]: bad', isError: true })} />)
    expect(screen.getByText('可视化参数有误，正在修正')).toBeTruthy()
    expect(screen.getByText('- arguments.blocks[0]: bad')).toBeTruthy()
    failed.unmount()
    render(<InlineCanvasView {...viewProps('result', args, { text: '', isError: true, code: 'interrupted' })} />)
    expect(screen.getByText('可视化未完成')).toBeTruthy()
  })
})

describe('canvas_board conversation card', () => {
  const boardArgs = (text: string) => streaming(text)

  it('reports the section being built and the summary as plain text', () => {
    render(<BoardCardView {...viewProps('preparing', boardArgs('{"title":"Market","layout":"report","summary":"**Key** [finding](https://x) `x`","sections":[{"title":"One","blocks":[]},{"title":"Two"'))} />)
    expect(screen.getByText('Market')).toBeTruthy()
    expect(screen.getByText('正在生成：Two')).toBeTruthy()
    expect(screen.getByText('Key finding x')).toBeTruthy()
    cleanup()
    render(<BoardCardView {...viewProps('preparing', boardArgs('{"sections":[{'))} />)
    expect(screen.getByText('看板')).toBeTruthy()
    expect(screen.getByText('正在生成看板…')).toBeTruthy()
    cleanup()
    render(<BoardCardView {...viewProps('start', PartialArguments.fromText('{"title":"T","sections":"none"}'))} />)
    expect(screen.getByText('正在生成看板…')).toBeTruthy()
  })

  it('opens a board published while the card was mounted, once, and compacts to a record', () => {
    const args = PartialArguments.fromText(JSON.stringify({ ...SLIDES }))
    const props = viewProps('start', args)
    const view = render(<BoardCardView {...props} />)
    const published = viewProps('result', args, { text: 'Published board "Market board" (board_id b-1, version 3). The user can open it from the conversation.' })
    view.rerender(<BoardCardView {...{ ...published, openBoard: props.openBoard }} />)
    expect(props.openBoard).toHaveBeenCalledTimes(1)
    expect(props.openBoard).toHaveBeenCalledWith('b-1', 'call-1')
    expect(screen.getByText('已发布看板「Market board」版本 3')).toBeTruthy()
    view.rerender(<BoardCardView {...{ ...published, openBoard: props.openBoard }} />)
    expect(props.openBoard).toHaveBeenCalledTimes(1)
  })

  it('does not open a replayed board automatically and shows failures', () => {
    const args = PartialArguments.fromText(JSON.stringify(BOARD))
    const replay = viewProps('result', args, { text: 'Published board "x" (board_id b-2, version 1).' })
    render(<BoardCardView {...replay} />)
    expect(replay.openBoard).not.toHaveBeenCalled()
    expect(screen.getByText('已发布看板「Market board」版本 1')).toBeTruthy()
    cleanup()
    render(<BoardCardView {...viewProps('result', args, { text: 'Unknown board_id', isError: true })} />)
    expect(screen.getByText('看板发布失败，正在修正')).toBeTruthy()
    cleanup()
    render(<BoardCardView {...viewProps('result', args, { text: 'no id here' })} />)
    expect(screen.queryByRole('button', { name: '打开看板' })).toBeNull()
  })

  it('strips Markdown markup from summaries', () => {
    expect(plainSummary('**a** __b__ `c` [d](https://e)')).toBe('a b c d')
  })
})

describe('reply-flow canvas node', () => {
  type NodeProps = Parameters<typeof CanvasVisualNode>[0]
  const nodeProps = (data: CanvasVisual): NodeProps =>
    ({ node: { kind: 'canvas-visual', data }, t, ...viewActions() }) as never

  it('renders a valid inline visual and a published board card', () => {
    const inline = render(<CanvasVisualNode {...nodeProps({ callId: 'a', name: 'show_ui', argsRaw: JSON.stringify({ blocks: [{ type: 'markdown', text: 'inline visual', sources: ['q'] }, { type: 'sources', items: [{ id: 'q', title: 'Q', url: 'https://q' }] }] }) })} />)
    expect(screen.getByText('inline visual')).toBeTruthy()
    expect(screen.getByTitle('来源：Q')).toBeTruthy()
    inline.unmount()
    const props = nodeProps({ callId: 'b', name: 'canvas_board', argsRaw: JSON.stringify(BOARD), published: { boardId: 'b1', version: 2 } })
    const board = render(<CanvasVisualNode {...props} />)
    expect(screen.getByText('版本 2 · 2 个章节')).toBeTruthy()
    expect(screen.getByText('Key finding')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '打开看板' }))
    expect(props.openBoard).toHaveBeenCalledWith('b1', 'b')
    board.unmount()
    render(<CanvasVisualNode {...nodeProps({ callId: 'f', name: 'canvas_board', argsRaw: JSON.stringify({ ...SLIDES, summary: undefined }), published: { boardId: 'b2', version: 1 } })} />)
    expect(screen.getByText('版本 1 · 2 页幻灯片')).toBeTruthy()
  })

  it('renders nothing for unpublished boards and invalid arguments', () => {
    for (const data of [
      { callId: 'c', name: 'canvas_board', argsRaw: JSON.stringify(BOARD) },
      { callId: 'd', name: 'canvas_board', argsRaw: '{', published: { boardId: 'b1', version: 3 } },
      { callId: 'e', name: 'show_ui', argsRaw: '{"blocks":[]}' },
    ] satisfies CanvasVisual[]) {
      const view = render(<CanvasVisualNode {...nodeProps(data)} />)
      expect(view.container.innerHTML).toBe('')
      view.unmount()
    }
  })

  it('folds tool calls and board publications into Turn-level chat nodes', () => {
    const call = { type: 'tool/call', seq: 3, data: { name: 'canvas_board', callId: 'k', arguments: '{}' } }
    const publish = { type: 'canvas/board', seq: 4, data: { boardId: 'b', version: 1, callId: 'k', title: 't' } }
    expect(canvasDefinition.match(call as never)).toEqual({ id: 'k', role: 'start' })
    expect(canvasDefinition.match(publish as never)).toEqual({ id: 'k', role: 'update' })
    expect(canvasDefinition.match({ type: 'turn/end', seq: 5, data: {} } as never)).toBeNull()
    const state = canvasDefinition.start({} as never, { event: call } as never, {} as never)
    expect(state).toEqual({ callId: 'k', name: 'canvas_board', argsRaw: '{}' })
    expect(canvasDefinition.update({ state } as never, { event: publish } as never)).toMatchObject({ published: { boardId: 'b', version: 1 } })
    expect(canvasDefinition.update({ state } as never, { event: call } as never)).toBe(state)
    const location = { turn: 1 }
    expect(canvasDefinition.buildViewNode?.({ key: 'x', id: 'k', state, start: { event: call, location }, matches: [] } as never)).toMatchObject({ kind: 'canvas-visual', visibility: 'visible', groupTree: 'turn', anchorSeq: 3, data: state })
    expect(canvasDefinition.buildViewNode?.({ key: 'x', id: 'k', state: undefined, matches: [] } as never)).toBeNull()
    expect(canvasDefinition.buildViewNode?.({ key: 'x', id: 'k', state, matches: [{ event: call, location }] } as never)).toMatchObject({ anchorSeq: 3 })
    expect(canvasCall({ type: 'tool/call', data: { name: 'other', callId: 'x', arguments: '{}' } })).toBeUndefined()
    expect(canvasCall({ type: 'tool/call', data: null })).toBeUndefined()
    expect(boardPublication({ type: 'canvas/board', data: { boardId: 1 } })).toBeUndefined()
    expect(boardPublication({ type: 'tool/call', data: {} })).toBeUndefined()
  })
})

describe('board workspace tab', () => {
  type TabProps = Parameters<typeof BoardTab>[0]
  const second: CanvasBoard = { ...BOARD, title: 'Second', sections: [...BOARD.sections, { title: 'Extra', blocks: [
    { type: 'sources', items: [{ id: 's9', title: 'Appendix', url: 'https://example.com/a' }] },
    { type: 'html', title: 'Sim', html: '<p>x</p>' },
  ] }] }
  const history: BoardHistory = {
    boardId: 'b1',
    versions: [{ version: 1, callId: 'c1', board: BOARD }, { version: 2, callId: 'c2', board: second }],
  }
  type TabResource = { value?: BoardHistory; status?: string; failure?: { code: string } }
  const tabProps = (resource: TabResource, params?: { callId: string }): TabProps => ({
    useTabInfo: () => ({ tab: { title: 'Board', navigation: { address: boardAddress({ sessionId: 's1' as never, boardId: 'b1' }), params } } }),
    useResource: () => resource,
    t, sendPrompt: vi.fn(), draftPrompt: vi.fn(), markdownLabels: labels,
  }) as TabProps

  it('shows the latest version, a requested version, and a version chosen in the selector', () => {
    const props = tabProps({ value: history, status: 'ready' })
    const view = render(<BoardTab {...props} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Second')
    expect(screen.getByRole('option', { name: '版本 2（最新）' })).toBeTruthy()
    const frame = screen.getByTitle('Sim') as HTMLIFrameElement
    act(() => { window.dispatchEvent(new MessageEvent('message', { data: { protocol: 'deepcanvas.bridge/1', type: 'prompt', text: 'from frame' }, source: frame.contentWindow })) })
    expect(props.draftPrompt).toHaveBeenCalledWith('s1', 'from frame')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Market board')
    fireEvent.click(screen.getByRole('button', { name: /Go/ }))
    expect(props.sendPrompt).toHaveBeenCalledWith('s1', 'next')
    view.rerender(<BoardTab {...tabProps({ value: history }, { callId: 'c2' })} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Second')
    view.rerender(<BoardTab {...tabProps({ value: history }, { callId: 'c1' })} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Market board')
  })

  it('reports loading, missing, and failed boards', () => {
    const view = render(<BoardTab {...tabProps({ status: 'loading' })} />)
    expect(screen.getByRole('status').textContent).toBe('正在加载看板…')
    view.rerender(<BoardTab {...tabProps({ status: 'failed', failure: { code: 'canvas-board/not-found' } })} />)
    expect(screen.getByRole('status').textContent).toBe('在当前任务中找不到这个看板。')
    view.rerender(<BoardTab {...tabProps({ status: 'failed', failure: { code: 'x' } })} />)
    expect(screen.getByRole('status').textContent).toBe('看板加载失败。')
  })

  it('titles the tab with the latest board title', () => {
    type TitleProps = Parameters<typeof BoardTitle>[0]
    const view = render(<BoardTitle {...({ useTabInfo: () => ({ tab: { title: 'Board', navigation: { address: 'x' } } }), useResource: () => ({ value: history }) }) as TitleProps} />)
    expect(view.container.textContent).toBe('Second')
    view.rerender(<BoardTitle {...({ useTabInfo: () => ({ tab: { title: 'Board', navigation: { address: 'x' } } }), useResource: () => ({}) }) as TitleProps} />)
    expect(view.container.textContent).toBe('Board')
  })
})

describe('plugin registration', () => {
  it('keeps the host Loader entry inert and declares its services', () => {
    expect(hostApply).not.toThrow()
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiConversation', 'resources', 'sidebarRight', 'sidebarRightTabs'])
  })

  it('registers views, the reply-flow node, the resource, and the tab, and routes composer and workspace actions', () => {
    const registrations: Array<{ options: { name: string; key?: string; inject?: (sessionId: string) => Record<string, unknown> } }> = []
    const effects: Array<() => unknown> = []
    const input = { setDraft: vi.fn(), submit: vi.fn(), focus: vi.fn() }
    const sessionCtx = { get: vi.fn(() => ({ input: { for: vi.fn(() => input) } })) }
    const ctx = {
      effect: (fn: () => unknown) => { effects.push(fn) },
      locale: { register: vi.fn(), bind: vi.fn(() => (key: string) => key) },
      resources: { register: vi.fn() },
      sidebarRightTabs: { register: vi.fn() },
      sidebarRight: { openResource: vi.fn() },
      remote: { session: {} },
      sessions: { binding: vi.fn((id: string) => id === 'gone' ? undefined : { ctx: sessionCtx }) },
      uiConversation: { events: { register: vi.fn() } },
      slots: {
        inject: (_name: string, body: () => unknown) => {
          const result = body()
          if (result !== null && typeof result === 'object' && Symbol.iterator in result) for (const _ of result as Iterable<unknown>) { /* drain the registration generator */ }
        },
        register: (options: { name: string; key?: string }) => { registrations.push({ options }); return () => {} },
      },
    }
    apply(ctx as never)
    for (const effect of effects) effect()
    expect(ctx.resources.register).toHaveBeenCalled()
    expect(ctx.uiConversation.events.register).toHaveBeenCalledWith(canvasDefinition)
    type TabType = { canOpen: (address: string) => boolean; title: () => string }
    const tabType = vi.mocked(ctx.sidebarRightTabs.register).mock.calls[0]?.[0] as TabType
    expect(tabType.canOpen(boardAddress({ sessionId: 's' as never, boardId: 'b' }))).toBe(true)
    expect(tabType.canOpen('dsh-resource://plan/x')).toBe(false)
    expect(tabType.title()).toBe('board.title')
    expect(registrations.map(entry => entry.options.key ?? entry.options.name)).toEqual(['show_ui', 'canvas_board', 'canvas-visual', '@deepseek-ai/dsh-client-ui-canvas', '@deepseek-ai/dsh-client-ui-canvas'])
    const view = registrations[0]?.options.inject?.('s1') as ReturnType<typeof viewActions>
    view.sendPrompt('hello')
    expect(input.setDraft).toHaveBeenCalledWith('hello')
    expect(input.submit).toHaveBeenCalled()
    view.draftPrompt('draft')
    expect(input.focus).toHaveBeenCalled()
    view.openBoard('b', 'c')
    expect(ctx.sidebarRight.openResource).toHaveBeenCalledWith(boardAddress({ sessionId: 's1' as never, boardId: 'b' }), { params: { callId: 'c' } })
    const gone = registrations[0]?.options.inject?.('gone') as ReturnType<typeof viewActions>
    gone.sendPrompt('x')
    gone.draftPrompt('x')
    expect(input.setDraft).toHaveBeenCalledTimes(2)
    expect(registrations[2]?.options.inject).toBe(registrations[0]?.options.inject)
    const tab = registrations[3]?.options.inject?.('s1') as { sendPrompt: (session: string, prompt: string) => void; markdownLabels: unknown }
    tab.sendPrompt('s1', 'tab prompt')
    expect(input.setDraft).toHaveBeenCalledWith('tab prompt')
    expect(tab.markdownLabels).toBe(view.markdownLabels)
  })
})
