// @vitest-environment jsdom
/** What the user changes inside a scene survives a remount of its fence and travels with messages to the assistant. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { OpenUIFence, type FenceStates } from '../src/client/OpenUIFence.tsx'
import { zh } from '../src/client/locales.ts'
import { itemKeys } from '../src/client/library/scene-state.ts'

const t = makeTranslate(zh)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 12, 9, 0, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mount(code: string, states: FenceStates, streaming = false) {
  const sendPrompt = vi.fn()
  const props = { code, streaming, turn: 1, step: 0, block: 0, t, sendPrompt, sessionId: 's', states }
  const view = render(createElement(OpenUIFence, props as never))
  return { root: view.container, sendPrompt, view, props }
}

const WEEK = 'root = Col([WeekPlan(items, "本周", "2026-11-12")])\nitems = [{day: "2026-11-12", title: "上课"}, {day: "2026-11-13", title: "读论文"}, {day: "2026-11-14", title: "读论文"}]'
const titles = (root: Element) => [...root.querySelectorAll('.iui-week-row')].map(row => [...row.querySelectorAll('.iui-week-title')].map(el => el.textContent))

describe('WeekPlan', () => {
  it('keeps ticks and moves across a remount', () => {
    const states: FenceStates = new Map()
    const first = mount(WEEK, states)
    fireEvent.click(first.root.querySelector<HTMLButtonElement>('.iui-week-item .iui-tick')!)
    fireEvent.click([...first.root.querySelectorAll<HTMLButtonElement>('.iui-week-body')].find(b => b.textContent === '上课')!)
    fireEvent.click(first.root.querySelectorAll<HTMLButtonElement>('.iui-week-drop')[2]!)
    first.view.unmount()
    const second = mount(WEEK, states)
    expect(titles(second.root).slice(0, 4)).toEqual([[], ['读论文'], ['读论文'], ['上课']])
    expect(second.root.querySelector('.iui-week-item.is-done .iui-week-title')?.textContent).toBe('上课')
  })

  it('sends what changed, by item name and date, with the re-plan request', () => {
    const { root, sendPrompt } = mount(WEEK, new Map())
    expect([...root.querySelectorAll('button')].some(b => b.textContent === zh['week.replan'])).toBe(false)
    fireEvent.click([...root.querySelectorAll<HTMLButtonElement>('.iui-week-body')].find(b => b.textContent === '上课')!)
    fireEvent.click(root.querySelectorAll<HTMLButtonElement>('.iui-week-drop')[2]!)
    fireEvent.click([...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === zh['week.replan'])!)
    expect(sendPrompt).toHaveBeenCalledWith(`${zh['week.replanAsk']}\n\n当前界面数值：{"WeekPlan·本周":{"done":[],"moved":{"上课·2026-11-12":"2026-11-15"}}}`)
  })

  it('ticks one of two items with the same title without ticking the other', () => {
    const { root } = mount(WEEK, new Map())
    const reads = [...root.querySelectorAll('.iui-week-item')].filter(el => el.textContent?.includes('读论文'))
    fireEvent.click(reads[1]!.querySelector<HTMLButtonElement>('.iui-tick')!)
    expect(reads.map(el => el.classList.contains('is-done'))).toEqual([false, true])
  })

  it('records a move as a weekday name when the plan has no start date', () => {
    const { root, sendPrompt } = mount('root = Col([WeekPlan(items)])\nitems = [{day: 1, title: "开会"}]', new Map())
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-week-body')!)
    fireEvent.click(root.querySelectorAll<HTMLButtonElement>('.iui-week-drop')[1]!)
    fireEvent.click([...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === zh['week.replan'])!)
    expect(String(sendPrompt.mock.calls[0]?.[0])).toContain('"moved":{"开会·1":"周三"}')
    expect(titles(root)[2]).toEqual(['开会'])
  })

  it('keeps the user\'s changes when the reply finishes streaming', () => {
    const states: FenceStates = new Map()
    const { root, view, props } = mount(WEEK, states, true)
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-week-item .iui-tick')!)
    view.rerender(createElement(OpenUIFence, { ...props, streaming: false } as never))
    expect(root.querySelector('.iui-week-item.is-done .iui-week-title')?.textContent).toBe('上课')
  })
})

describe('other scenes', () => {
  it('keeps roadmap ticks and reading ticks across a remount', () => {
    const code = 'root = Col([Roadmap(ps, "备考"), ReadingList(rs, "论文")])\nps = [{name: "摸底", tasks: ["真题", "归类"]}]\nrs = [{title: "DDPM"}, {title: "DDIM"}]'
    const states: FenceStates = new Map()
    const first = mount(code, states)
    fireEvent.click(first.root.querySelectorAll<HTMLButtonElement>('.iui-road-task .iui-tick')[1]!)
    fireEvent.click(first.root.querySelectorAll<HTMLButtonElement>('.iui-read-item .iui-tick')[0]!)
    first.view.unmount()
    const second = mount(code, states)
    expect([...second.root.querySelectorAll('.iui-road-task')].map(el => el.classList.contains('is-done'))).toEqual([false, true])
    expect([...second.root.querySelectorAll('.iui-read-item')].map(el => el.classList.contains('is-done'))).toEqual([true, false])
    expect(JSON.stringify([...states.values()])).toContain('"Roadmap·备考":{"value":["摸底/归类"]}')
  })

  it('keeps decision weights by criterion name across a remount', () => {
    const code = 'root = Col([Decision(["A", "B"], cs, "选")])\ncs = [{name: "x", weight: 1, scores: [5, 1]}, {name: "y", weight: 1, scores: [1, 5]}]'
    const states: FenceStates = new Map()
    const first = mount(code, states)
    fireEvent.change(first.root.querySelectorAll<HTMLInputElement>('.iui-decide-range')[1]!, { target: { value: '5' } })
    first.view.unmount()
    const second = mount(code, states)
    expect(second.root.querySelectorAll<HTMLInputElement>('.iui-decide-range')[1]?.value).toBe('5')
    expect(JSON.stringify([...states.values()])).toContain('"Decision·选":{"value":{"y":5}}')
  })

  it('resumes a quiz at the first unanswered question and records answers as text', () => {
    const code = 'root = Col([Quiz(qs, "测")])\nqs = [{q: "一", options: ["甲", "乙"], answer: 0}, {q: "二", options: ["丙", "丁"], answer: 1}]'
    const states: FenceStates = new Map()
    const first = mount(code, states)
    fireEvent.click(first.root.querySelectorAll<HTMLButtonElement>('.iui-quiz-option')[1]!)
    first.view.unmount()
    const second = mount(code, states)
    expect(second.root.querySelector('.iui-quiz-q')?.textContent).toBe('二')
    expect(JSON.stringify([...states.values()])).toContain('"Quiz·测":{"value":{"一":"乙"}}')
  })

  it('keeps concepts marked learned across a remount', () => {
    const code = 'root = Col([ConceptMap(ls, "图", "甲")])\nls = [{name: "层", concepts: [{name: "甲", text: "一"}]}]'
    const states: FenceStates = new Map()
    const first = mount(code, states)
    fireEvent.click([...first.root.querySelectorAll<HTMLButtonElement>('.iui-map-actions button')].at(-1)!)
    first.view.unmount()
    const second = mount(code, states)
    expect(second.root.querySelector('.iui-map-node')?.classList.contains('is-known')).toBe(true)
  })
})

describe('itemKeys', () => {
  it('numbers repeated labels from the second one', () => {
    expect(itemKeys(['a', 'b', 'a', 'a'])).toEqual(['a', 'b', 'a #2', 'a #3'])
  })
})
