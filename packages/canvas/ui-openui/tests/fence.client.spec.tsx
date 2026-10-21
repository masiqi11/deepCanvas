// @vitest-environment jsdom
/** Fences render live interfaces, keep page state, route actions to the conversation, and offer repair. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { OpenUIFence, type FenceStates } from '../src/client/OpenUIFence.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const t = makeTranslate(zh)

function fence(code: string, options: { streaming?: boolean; states?: FenceStates; block?: number } = {}) {
  const sendPrompt = vi.fn()
  const states = options.states ?? new Map()
  const props = {
    code, streaming: options.streaming ?? false, turn: 1, step: 0, block: options.block ?? 0,
    t, sendPrompt, sessionId: 's1', states,
  }
  return { props: props as never, sendPrompt, states }
}

const COUNTER = `root = Col([Title("Count " + $n), Button("Add", @Set($n, $n + 1)), Slider($level, 0, 10, 1, "Level")])
$n = 0
$level = 3`

describe('openui fence', () => {
  it('shows a building row for an empty fence', () => {
    const { props } = fence('', { streaming: true })
    render(createElement(OpenUIFence, props))
    expect(screen.getByText('正在生成交互界面…')).toBeTruthy()
  })

  it('renders the program and updates it locally', async () => {
    const { props, sendPrompt } = fence(COUNTER)
    render(createElement(OpenUIFence, props))
    expect(await screen.findByText('Count 0')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(await screen.findByText('Count 1')).toBeTruthy()
    expect(sendPrompt).not.toHaveBeenCalled()
  })

  it('keeps page state for the same fence across remounts', async () => {
    const states: FenceStates = new Map()
    const first = fence(COUNTER, { states })
    const view = render(createElement(OpenUIFence, first.props))
    fireEvent.click(await screen.findByRole('button', { name: /Add/ }))
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(await screen.findByText('Count 2')).toBeTruthy()
    view.unmount()
    render(createElement(OpenUIFence, fence(COUNTER, { states }).props))
    expect(await screen.findByText('Count 2')).toBeTruthy()
  })

  it('sends @ToAssistant messages with the page values and opens only web links', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { props, sendPrompt } = fence(`root = Col([Button("Plan it", @ToAssistant("Plan my trip")), Button("Docs", @OpenUrl("https://example.com/a")), Button("Bad", @OpenUrl("javascript:alert(1)")), Button("Silent", @ToAssistant(""))])
$days = 3`)
    render(createElement(OpenUIFence, props))
    fireEvent.click(await screen.findByRole('button', { name: /Plan it/ }))
    await waitFor(() => { expect(sendPrompt).toHaveBeenCalledTimes(1) })
    expect(sendPrompt.mock.calls[0]?.[0]).toMatch(/^Plan my trip/)
    fireEvent.click(screen.getByRole('button', { name: /Docs/ }))
    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer')
    fireEvent.click(screen.getByRole('button', { name: /Bad/ }))
    expect(open).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /Silent/ }))
    expect(sendPrompt).toHaveBeenCalledTimes(1)
  })

  it('copies text through the clipboard action', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { props } = fence('root = Col([Button("Copy list", @CopyToClipboard("eggs, milk"))])')
    render(createElement(OpenUIFence, props))
    fireEvent.click(await screen.findByRole('button', { name: /Copy list/ }))
    await waitFor(() => { expect(writeText).toHaveBeenCalledWith('eggs, milk') })
  })

  it('reports blocking problems once settled and asks the assistant to fix them', async () => {
    const broken = 'root = Col([Nope("x"), Title()])'
    const streaming = fence(broken, { streaming: true })
    const view = render(createElement(OpenUIFence, streaming.props))
    expect(screen.queryByRole('alert')).toBeNull()
    const settled = fence(broken)
    view.rerender(createElement(OpenUIFence, settled.props))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('这个交互界面没能显示')
    fireEvent.click(screen.getByRole('button', { name: '让助手修正' }))
    expect(settled.sendPrompt.mock.calls[0]?.[0]).toMatch(/^上一个交互界面有内容无法显示/)
    expect(screen.getByText(broken)).toBeTruthy()
    view.rerender(createElement(OpenUIFence, fence('').props))
    expect(screen.getByRole('alert').textContent).toContain('这个交互界面没能显示')
  })

  it('keeps the valid part visible and labels the problem as partial', async () => {
    const { props, sendPrompt } = fence('root = Col([Title("Hello"), Nope("x")])')
    render(createElement(OpenUIFence, props))
    expect(await screen.findByText('Hello')).toBeTruthy()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('这个交互界面有部分内容没能显示')
    expect(alert.getAttribute('data-partial')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '让助手修正' }))
    expect(sendPrompt.mock.calls[0]?.[0]).toContain('Nope')
  })

  it('renders callouts, labelled segmented controls, and large text without problems', async () => {
    const { props } = fence(`root = Col([Callout("Pay early", "warning", "Heads up"), SegmentedControl($mode, ["A", "B"], "Mode", true), Text("42", "2xl")])
$mode = "A"`)
    render(createElement(OpenUIFence, props))
    expect(await screen.findByText('Pay early')).toBeTruthy()
    expect(screen.getByText('Heads up')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeTruthy()
    expect(screen.getByText('42').className).toContain('iui-text-2xl')
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps rendering while warnings remain', async () => {
    const { props } = fence('root = Col([Title("Hello")])\nunused = Text("x")')
    render(createElement(OpenUIFence, props))
    expect(await screen.findByText('Hello')).toBeTruthy()
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
