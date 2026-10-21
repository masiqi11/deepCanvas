// @vitest-environment jsdom
/** Charts draw every kind, and html frames accept bridge messages only from their own window. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { ChartBlock } from '@deepseek-ai/dsh-canvas-spec'
import { Chart } from '../src/client/Chart.tsx'
import { arc, axisDomain } from '../src/client/chart-geometry.ts'
import { BRIDGE_PROTOCOL, frameDocument, parseBridgeMessage } from '../src/client/bridge.ts'
import { HtmlFrame } from '../src/client/HtmlFrame.tsx'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from '../src/client/context.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const t: Translate = makeTranslate(zh)

describe('chart geometry', () => {
  it('includes zero and ends the domain on readable steps', () => {
    expect(axisDomain([3, 47])).toEqual({ min: 0, max: 60, ticks: [0, 20, 40, 60] })
    expect(axisDomain([-12, 8])).toEqual({ min: -15, max: 10, ticks: [-15, -10, -5, 0, 5, 10] })
    expect(axisDomain([0, 0])).toEqual({ min: 0, max: 1, ticks: [0, 0.5, 1] })
    expect(axisDomain([0, 7]).max).toBe(8)
    expect(axisDomain([0, 1300]).max).toBe(1500)
    expect(axisDomain([0, 30]).ticks).toEqual([0, 10, 20, 30])
    expect(axisDomain([0, 4]).ticks).toEqual([0, 1, 2, 3, 4])
  })

  it('draws clockwise arcs and flags large sweeps', () => {
    expect(arc(10, 10, 10, 0, Math.PI / 2)).toBe('M10.00,0.00 A10,10 0 0 1 20.00,10.00')
    expect(arc(10, 10, 10, 0, Math.PI * 1.5)).toContain(' 0 1 1 ')
  })
})

describe('Chart', () => {
  const base: Omit<ChartBlock, 'kind'> = { type: 'chart', labels: ['Jan', 'Feb', 'A very long category label'], series: [{ name: 'A', values: [1, -2, 3] }, { name: 'B', values: [2, 2, 2] }] }

  it.each(['bar', 'line', 'area'] as const)('draws a %s chart with a legend that highlights one series', (kind) => {
    const view = render(<Chart block={{ ...base, kind, title: 'Growth', unit: '%', note: 'demo' }} locale="en" />)
    expect(screen.getByRole('img', { name: 'Growth' })).toBeTruthy()
    expect(screen.getByText('A very long c…')).toBeTruthy()
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'B' }))
    expect(view.container.querySelectorAll('[data-dim]').length).toBeGreaterThan(0)
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'B' }))
    fireEvent.focus(screen.getByRole('button', { name: 'A' }))
    fireEvent.blur(screen.getByRole('button', { name: 'A' }))
    expect(view.container.querySelectorAll('[data-dim]')).toHaveLength(0)
    expect(screen.getByText('demo')).toBeTruthy()
  })

  it('stacks bars and areas on the running total', () => {
    const bar = render(<Chart block={{ ...base, kind: 'bar', stacked: true, labels: ['x'], series: [{ name: 'A', values: [2] }, { name: 'B', values: [3] }] }} locale="en" />)
    expect(bar.container.querySelectorAll('rect')).toHaveLength(2)
    bar.unmount()
    const area = render(<Chart block={{ ...base, kind: 'area', stacked: true, labels: ['x', 'y'], series: [{ name: 'A', values: [2, 1] }, { name: 'B', values: [3, 1] }] }} locale="en" />)
    expect(area.container.querySelectorAll('path')).toHaveLength(4)
  })

  it('thins crowded axis labels', () => {
    const labels = Array.from({ length: 30 }, (_, i) => `d${i}`)
    render(<Chart block={{ type: 'chart', kind: 'line', labels, series: [{ name: 'S', values: labels.map((_, i) => i) }] }} locale="en" />)
    expect(screen.queryByText('d1')).toBeNull()
    expect(screen.getByText('d0')).toBeTruthy()
  })

  it('draws horizontal bars with values', () => {
    render(<Chart block={{ ...base, kind: 'bar', horizontal: true, unit: '%', labels: ['x', 'y'], series: [{ name: 'A', values: [10, 0] }] }} locale="en" />)
    expect(screen.getByText('10%')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'A' })).toBeTruthy()
  })

  it('tolerates series shorter than their labels', () => {
    for (const kind of ['bar', 'line', 'area'] as const) {
      const view = render(<Chart block={{ type: 'chart', kind, stacked: true, labels: ['a', 'b'], series: [{ name: 'S', values: [1] }, { name: 'T', values: [] }] }} locale="en" />)
      expect(view.container.querySelector('svg')).toBeTruthy()
      view.unmount()
    }
    for (const kind of ['bar', 'area'] as const) {
      const view = render(<Chart block={{ type: 'chart', kind, stacked: true, labels: ['a'], series: [{ name: 'S', values: [] }, { name: 'T', values: [1, 2] }] }} locale="en" />)
      expect(view.container.querySelectorAll('title').length).toBeGreaterThan(0)
      view.unmount()
    }
    const extra = render(<Chart block={{ type: 'chart', kind: 'pie', labels: ['a'], series: [{ name: 'S', values: [1, 2] }] }} locale="en" />)
    expect(extra.container.querySelectorAll('path')).toHaveLength(2)
    extra.unmount()
    const bars = render(<Chart block={{ type: 'chart', kind: 'bar', horizontal: true, labels: ['a', 'b'], series: [{ name: 'S', values: [1] }, { name: 'T', values: [2, 3] }] }} locale="en" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'T' }))
    expect(bars.container.querySelectorAll('[data-dim]').length).toBeGreaterThan(0)
    bars.unmount()
    const pie = render(<Chart block={{ type: 'chart', kind: 'donut', labels: ['a', 'b', 'c'], series: [{ name: 'S', values: [1] }] }} locale="en" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'c' }))
    expect(screen.getByText('0.0%')).toBeTruthy()
    pie.unmount()
    render(<Chart block={{ type: 'chart', kind: 'pie', labels: [], series: [] }} locale="en" />)
    expect(screen.getByRole('img', { name: '' })).toBeTruthy()
  })

  it('draws pie and donut slices with a focusable center total', () => {
    const block: ChartBlock = { type: 'chart', kind: 'donut', labels: ['a', 'b'], series: [{ name: 'Share', values: [3, 1] }] }
    const donut = render(<Chart block={block} locale="en" />)
    expect(screen.getByText('4')).toBeTruthy()
    const slice = donut.container.querySelector('path') as SVGPathElement
    fireEvent.mouseEnter(slice)
    expect(screen.getByText('75.0%')).toBeTruthy()
    fireEvent.mouseLeave(slice)
    donut.unmount()
    const pie = render(<Chart block={{ ...block, kind: 'pie', labels: ['only'], series: [{ name: 'S', values: [5] }] }} locale="en" />)
    expect(pie.container.querySelectorAll('path')).toHaveLength(1)
    pie.unmount()
    const empty = render(<Chart block={{ ...block, kind: 'pie', series: [{ name: 'S', values: [0, 0] }] }} locale="en" />)
    expect(empty.container.querySelectorAll('circle')).toHaveLength(1)
  })
})

describe('bridge protocol', () => {
  it('accepts only well-formed messages of the current protocol and bounds their text', () => {
    expect(parseBridgeMessage({ protocol: BRIDGE_PROTOCOL, type: 'resize', height: 300 })).toEqual({ protocol: BRIDGE_PROTOCOL, type: 'resize', height: 300 })
    expect(parseBridgeMessage({ protocol: BRIDGE_PROTOCOL, type: 'error', message: 'x'.repeat(900) })).toMatchObject({ message: 'x'.repeat(500) })
    expect(parseBridgeMessage({ protocol: BRIDGE_PROTOCOL, type: 'prompt', text: 'go' })).toMatchObject({ type: 'prompt', text: 'go' })
    expect(parseBridgeMessage({ protocol: BRIDGE_PROTOCOL, type: 'open-source', url: 'https://x' })).toMatchObject({ url: 'https://x' })
    for (const forged of [null, 'resize', { type: 'resize', height: 1 }, { protocol: 'other/1', type: 'resize', height: 1 },
      { protocol: BRIDGE_PROTOCOL, type: 'resize', height: Number.NaN }, { protocol: BRIDGE_PROTOCOL, type: 'error' },
      { protocol: BRIDGE_PROTOCOL, type: 'prompt', text: '  ' }, { protocol: BRIDGE_PROTOCOL, type: 'open-source' },
      { protocol: BRIDGE_PROTOCOL, type: 'run-command', command: 'rm -rf /' }]) {
      expect(parseBridgeMessage(forged)).toBeUndefined()
    }
  })

  it('places the network-blocking policy and bridge before the page content', () => {
    const fragment = frameDocument('<p>hi</p>')
    expect(fragment.startsWith('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';')).toBe(true)
    expect(fragment).toContain('<body><p>hi</p></body>')
    const page = frameDocument('<html><head lang="x"><title>t</title></head><body></body></html>')
    expect(page.indexOf('Content-Security-Policy')).toBeLessThan(page.indexOf('<title>'))
  })
})

describe('HtmlFrame', () => {
  function environment(overrides: Partial<CanvasEnvironment> = {}): CanvasEnvironment {
    return {
      t, sources: sourceMap([{ id: 's', title: 'S', url: 'https://example.com/s' }]), sendPrompt: vi.fn(), draftPrompt: vi.fn(),
      markdownLabels: { code: { copyLabel: 'c', copiedLabel: 'd', toolbarLabels: { codeLabel: 'c', wrapLabel: 'w', unwrapLabel: 'u' } }, footnotes: 'f' },
      animate: false, ...overrides,
    }
  }

  function mount(overrides: Partial<CanvasEnvironment> = {}) {
    const env = environment(overrides)
    render(<CanvasProvider value={env}><HtmlFrame block={{ type: 'html', html: '<p>x</p>', title: 'Sim', height: 5000 }} /></CanvasProvider>)
    const frame = screen.getByTitle('Sim') as HTMLIFrameElement
    const post = (data: unknown, source: MessageEventSource | null = frame.contentWindow): void => {
      act(() => { window.dispatchEvent(new MessageEvent('message', { data, source })) })
    }
    return { env, frame, post }
  }

  it('isolates the frame and clamps its initial height', () => {
    const { frame } = mount()
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(frame.style.height).toBe('1600px')
  })

  it('ignores messages from any other window, including forged bridge messages', () => {
    const { post, env } = mount()
    post({ protocol: BRIDGE_PROTOCOL, type: 'error', message: 'forged' }, window)
    post({ protocol: BRIDGE_PROTOCOL, type: 'prompt', text: 'forged' }, null)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(env.draftPrompt).not.toHaveBeenCalled()
  })

  it('resizes, drafts prompts without sending, and offers a repair request after an error', () => {
    const { frame, post, env } = mount()
    post({ protocol: BRIDGE_PROTOCOL, type: 'resize', height: 10 })
    expect(frame.style.height).toBe('80px')
    post({ protocol: BRIDGE_PROTOCOL, type: 'prompt', text: 'more please' })
    expect(env.draftPrompt).toHaveBeenCalledWith('more please')
    expect(env.sendPrompt).not.toHaveBeenCalled()
    post({ protocol: BRIDGE_PROTOCOL, type: 'unknown' })
    post({ protocol: BRIDGE_PROTOCOL, type: 'error', message: 'boom' })
    expect(screen.getByRole('alert').textContent).toContain('交互内容运行出错：boom')
    fireEvent.click(screen.getByRole('button', { name: '让 DeepCanvas 修复' }))
    expect(env.sendPrompt).toHaveBeenCalledWith('看板中的交互内容运行出错：boom。请修复后重新发布。')
  })

  it('opens only registered source links', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { post } = mount()
    post({ protocol: BRIDGE_PROTOCOL, type: 'open-source', url: 'https://evil.example' })
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toBe('只能打开已登记的来源链接。')
    post({ protocol: BRIDGE_PROTOCOL, type: 'open-source', url: 'https://example.com/s' })
    expect(open).toHaveBeenCalledWith('https://example.com/s', '_blank', 'noopener,noreferrer')
  })

  it('works without composer actions and without a title', () => {
    render(<CanvasProvider value={environment({ sendPrompt: undefined, draftPrompt: undefined })}><HtmlFrame block={{ type: 'html', html: '<p>x</p>' }} /></CanvasProvider>)
    const frame = screen.getByTitle('交互内容') as HTMLIFrameElement
    expect(frame.style.height).toBe('360px')
    act(() => { window.dispatchEvent(new MessageEvent('message', { data: { protocol: BRIDGE_PROTOCOL, type: 'prompt', text: 'x' }, source: frame.contentWindow })) })
    act(() => { window.dispatchEvent(new MessageEvent('message', { data: { protocol: BRIDGE_PROTOCOL, type: 'error', message: 'x' }, source: frame.contentWindow })) })
    expect(screen.queryByRole('button')).toBeNull()
  })
})
