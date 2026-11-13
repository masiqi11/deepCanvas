// @vitest-environment jsdom
/** Scene components keep working when the model writes a value in a nearby but wrong form. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { OpenUIFence } from '../src/client/OpenUIFence.tsx'
import { zh } from '../src/client/locales.ts'
import { numberOf, textOf } from '../src/client/library/scene-values.ts'

const t = makeTranslate(zh)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 12, 9, 0, 0))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function show(code: string) {
  const props = { code, streaming: false, turn: 1, step: 0, block: 0, t, sendPrompt: vi.fn(), sessionId: 's', states: new Map() }
  return render(createElement(OpenUIFence, props as never)).container
}

const texts = (root: Element, selector: string) => [...root.querySelectorAll(selector)].map(el => el.textContent ?? '')
const problems = (root: Element) => texts(root, '.iui-fence-problem li')

describe('labels written as numbers', () => {
  it('shows a number title in a week plan instead of dropping the item', () => {
    const root = show('root = Col([WeekPlan(items)])\nitems = [{day: 1, title: 5}, {day: 3, title: "交报告"}]')
    expect(texts(root, '.iui-week-title')).toEqual(['5', '交报告'])
    expect(problems(root)).toEqual([])
  })

  it('shows number years and titles in a timeline', () => {
    const root = show('root = Col([Timeline(ev)])\nev = [{when: 2020, title: "DDPM"}, {when: "2022", title: 3}]')
    expect(texts(root, '.iui-time-when')).toEqual(['2020', '2022'])
    expect(texts(root, '.iui-time-body strong')).toEqual(['DDPM', '3'])
  })

  it('accepts number options in a quiz and number tasks in a roadmap', () => {
    const quiz = show('root = Col([Quiz(qs)])\nqs = [{q: "1 + 1 = ?", options: [1, 2, 3], answer: 1}]')
    expect(texts(quiz, '.iui-quiz-option')).toEqual(['A1', 'B2', 'C3'])
    const road = show('root = Col([Roadmap(ps)])\nps = [{name: 1, tasks: ["读论文", 2]}]')
    expect(texts(road, '.iui-road-name strong')).toEqual(['1'])
    expect(texts(road, '.iui-road-task span')).toEqual(['读论文', '2'])
  })
})

describe('Decision amounts', () => {
  it('reads weights written as strings', () => {
    const root = show('root = Col([Decision(["A", "B"], cs)])\ncs = [{name: "x", weight: "3", scores: [5, 1]}, {name: "y", weight: 1, scores: [1, 5]}]')
    expect(problems(root)).toEqual([])
    expect(texts(root, '.iui-decide-score')).toEqual(['80', '40'])
  })

  it('keeps every score in its option\'s column when one is written as a string', () => {
    const root = show('root = Col([Decision(["A", "B"], cs)])\ncs = [{name: "x", weight: 3, scores: ["5", 1]}]')
    expect(problems(root)).toEqual([])
    expect(texts(root, '.iui-decide-cell')).toEqual(['5', '1'])
    expect(texts(root, '.iui-decide-score')).toEqual(['100', '20'])
  })

  it('leaves an unreadable score empty in place', () => {
    const root = show('root = Col([Decision(["A", "B", "C"], cs)])\ncs = [{name: "x", weight: 1, scores: [5, "很好", 1]}]')
    expect(texts(root, '.iui-decide-cell')).toEqual(['5', '–', '1'])
  })

  it('asks for a weight when every weight is zero', () => {
    const root = show('root = Col([Decision(["A", "B"], cs)])\ncs = [{name: "x", weight: 0, scores: [5, 1]}]')
    expect(texts(root, '.iui-decide-score')).toEqual(['0', '0'])
    expect(root.querySelector('[data-scene="Decision"] .iui-scene-hint')?.textContent).toBe(zh['decide.noWeight'])
    fireEvent.change(root.querySelector<HTMLInputElement>('.iui-decide-range')!, { target: { value: '2' } })
    expect(root.querySelector('[data-scene="Decision"] .iui-scene-hint')?.textContent).toBe(zh['decide.hint'])
  })
})

describe('missing parts', () => {
  it('shows a paper brief without the cells the model left out', () => {
    const root = show('root = Col([PaperBrief("T", "一句话", "问题", "方法", "结果")])')
    expect(root.querySelector('[data-scene="PaperBrief"]')).not.toBeNull()
    expect(texts(root, '.iui-paper-cell b')).toEqual(['解决什么问题', '怎么做的', '效果如何'])
    expect(problems(root)).toEqual([])
  })

  it('drops only the list item that lacks a required field', () => {
    const root = show('root = Col([WeekPlan(items)])\nitems = [{day: 1, title: "开会"}, {day: 2}, {day: 3, title: "交报告"}]')
    expect(texts(root, '.iui-week-title')).toEqual(['开会', '交报告'])
    expect(problems(root)).toHaveLength(1)
  })

  it('does not score a quiz question whose answer matches no option', () => {
    const root = show('root = Col([Quiz(qs)])\nqs = [{q: "一", options: ["a", "b"], answer: "Z"}, {q: "二", options: ["a", "b"], answer: 0}]')
    fireEvent.click(root.querySelectorAll<HTMLButtonElement>('.iui-quiz-option')[0]!)
    expect(root.querySelectorAll('.iui-quiz-option.is-right, .iui-quiz-option.is-wrong')).toHaveLength(0)
    expect(root.querySelector('.iui-quiz-foot p')?.textContent).toBe(zh['quiz.unscored'])
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-quiz-foot button')!)
    fireEvent.click(root.querySelectorAll<HTMLButtonElement>('.iui-quiz-option')[0]!)
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-quiz-foot button')!)
    expect(root.querySelector('.iui-quiz-end strong')?.textContent).toBe('答对 1 / 1')
  })
})

describe('empty and out-of-range data', () => {
  it('says so when a week has nothing planned', () => {
    const root = show('root = Col([WeekPlan([])])')
    expect(root.querySelector('[data-scene="WeekPlan"] .iui-scene-hint')?.textContent).toBe(zh['week.empty'])
  })

  it('counts the items that fall outside the seven days', () => {
    const root = show('root = Col([WeekPlan(items, "本周", "2026-11-12")])\nitems = [{day: "2026-11-13", title: "在里面"}, {day: "2026-12-01", title: "太远"}, {day: "下周", title: "看不懂"}]')
    expect(texts(root, '.iui-week-title')).toEqual(['在里面'])
    expect(texts(root, '.iui-scene-hint')).toContain('还有 2 项不在这七天内，没有显示。')
  })

  it.each([
    ['Roadmap', 'root = Col([Roadmap([])])'],
    ['Countdown', 'root = Col([Countdown([])])'],
    ['Timeline', 'root = Col([Timeline([])])'],
    ['ReadingList', 'root = Col([ReadingList([])])'],
    ['ConceptMap', 'root = Col([ConceptMap([])])'],
  ])('%s with no data shows the empty line', (scene, code) => {
    const root = show(code)
    expect(root.querySelector(`[data-scene="${scene}"]`)?.textContent).toContain(zh['scene.empty'])
  })

  it('shows HTML in model text as text', () => {
    const root = show('root = Col([Timeline(ev)])\nev = [{when: "2020", title: "<img src=x onerror=alert(1)>"}]')
    expect(root.querySelectorAll('img')).toHaveLength(0)
    expect(texts(root, '.iui-time-body strong')).toEqual(['<img src=x onerror=alert(1)>'])
  })
})

describe('scene value helpers', () => {
  it('reads labels', () => {
    expect([textOf('a'), textOf(3), textOf(Number.NaN), textOf(undefined), textOf({})]).toEqual(['a', '3', '', '', ''])
  })

  it('reads amounts', () => {
    expect([numberOf(3), numberOf(' 4.5 '), numberOf('3分'), numberOf(''), numberOf(Number.POSITIVE_INFINITY), numberOf(null)]).toEqual([3, 4.5, null, null, null, null])
  })
})
