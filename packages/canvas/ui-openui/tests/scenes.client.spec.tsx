// @vitest-environment jsdom
/** Scene components render mock answers without problems and respond to the user in place. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { OpenUIFence } from '../src/client/OpenUIFence.tsx'
import { zh } from '../src/client/locales.ts'
import { daysBetween, readDate, weekdayIndex } from '../src/client/library/dates.ts'
import { weighted } from '../src/client/library/decide.tsx'
import { answerIndex } from '../src/client/library/study.tsx'
import { rowOf } from '../src/client/library/week-plan.tsx'
import { scenePrograms } from './fixtures/scene-programs.client.ts'

const t = makeTranslate(zh)
const TODAY = new Date(2026, 10, 12, 9, 0, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function show(id: string, streaming = false, code?: string) {
  const program = scenePrograms.find(p => p.id === id)
  if (program === undefined) throw new Error(`no scene program ${id}`)
  const sendPrompt = vi.fn()
  const props = { code: code ?? program.code, streaming, turn: 1, step: 0, block: 0, t, sendPrompt, sessionId: 's', states: new Map() }
  const view = render(createElement(OpenUIFence, props as never))
  return { view, sendPrompt, root: view.container, program }
}

const texts = (root: Element, selector: string) => [...root.querySelectorAll(selector)].map(el => el.textContent ?? '')

const SCENES: Record<string, string[]> = {
  'scene-week-rolling': ['WeekPlan'],
  'scene-week-fixed': ['WeekPlan'],
  'scene-roadmap': ['Roadmap'],
  'scene-countdown': ['Countdown'],
  'scene-field-map': ['ConceptMap', 'ReadingList', 'Timeline'],
  'scene-paper': ['PaperBrief', 'FollowUps'],
  'scene-quiz': ['Quiz'],
  'scene-decision': ['Decision'],
}

describe.each(scenePrograms)('$id', ({ id, code }) => {
  it('renders settled without problems and names its scenes', () => {
    const { root } = show(id)
    expect([...root.querySelectorAll('[data-scene]')].map(el => el.getAttribute('data-scene'))).toEqual(SCENES[id])
    expect(texts(root, '.iui-fence-problem li')).toEqual([])
  })

  it('renders every streamed prefix without throwing', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { view } = show(id, true, '')
    for (let end = 40; end < code.length; end += 97) {
      view.rerender(createElement(OpenUIFence, {
        code: code.slice(0, end), streaming: true, turn: 1, step: 0, block: 0, t, sendPrompt: vi.fn(), sessionId: 's', states: new Map(),
      } as never))
    }
    const crashes = errors.mock.calls.map(call => String(call[0]).slice(0, 160))
      .filter(line => /Error: |Cannot read|is not a function|is not iterable/.test(line))
    expect(crashes).toEqual([])
  })
})

describe('WeekPlan', () => {
  const rows = (root: Element) => [...root.querySelectorAll('.iui-week-row')].map(row => texts(row, '.iui-week-title'))

  it('lays items out from the start date and drops days outside the seven', () => {
    const { root } = show('scene-week-rolling')
    expect(texts(root, '.iui-week-dayname')).toEqual(['周四', '周五', '周六', '周日', '周一', '周二', '周三'])
    expect(rows(root)).toEqual([['上午补实验数据', '14:00上课'], ['17:00 前提交课程设计'], ['09:12回家'], [], ['上午读组会论文'], ['做组会 PPT'], ['10:00组会汇报']])
    expect(root.querySelector('.iui-week-row.is-today .iui-week-date')?.textContent).toBe('今天')
    expect(texts(root, '.iui-chip')).toEqual(['7 件事', '2 个截止'])
    expect(root.textContent).not.toContain('不在这七天里')
  })

  it('runs Monday to Sunday without a start date and reads weekday names', () => {
    const { root } = show('scene-week-fixed')
    expect(texts(root, '.iui-week-dayname')).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日'])
    expect(rows(root)).toEqual([['开会'], [], ['交报告'], [], ['考试'], [], ['复习']])
    expect(root.querySelectorAll('.iui-week-row')[3]?.classList.contains('is-today')).toBe(true)
  })

  it('moves a picked item to another day and ticks it off', () => {
    const { root } = show('scene-week-rolling')
    const body = [...root.querySelectorAll<HTMLButtonElement>('.iui-week-body')].find(el => el.textContent?.includes('上课'))
    fireEvent.click(body!)
    const drops = root.querySelectorAll<HTMLButtonElement>('.iui-week-drop')
    expect(drops).toHaveLength(6)
    fireEvent.click(drops[2]!)
    expect(rows(root)[0]).toEqual(['上午补实验数据'])
    expect(rows(root)[3]).toEqual(['14:00上课'])
    expect(root.querySelectorAll('.iui-week-drop')).toHaveLength(0)
    const check = root.querySelector<HTMLButtonElement>('.iui-week-item .iui-tick')!
    fireEvent.click(check)
    expect(check.getAttribute('aria-pressed')).toBe('true')
    expect(root.querySelector('.iui-week-item.is-done .iui-week-title')?.textContent).toBe('上午补实验数据')
  })
})

describe('Roadmap', () => {
  it('counts ticked tasks and completes a phase when all its tasks are ticked', () => {
    const { root } = show('scene-roadmap')
    expect(texts(root, '.iui-scene-head .iui-chip')).toEqual(['完成 0 / 7'])
    const first = root.querySelectorAll('.iui-road-phase')[0]!
    for (const check of first.querySelectorAll<HTMLButtonElement>('.iui-tick')) fireEvent.click(check)
    expect(texts(root, '.iui-scene-head .iui-chip')).toEqual(['完成 2 / 7'])
    expect(root.querySelectorAll('.iui-road-phase')[0]?.classList.contains('is-done')).toBe(true)
    expect(root.querySelectorAll('.iui-road-phase')[1]?.classList.contains('is-done')).toBe(false)
  })
})

describe('Countdown', () => {
  it('sorts by days left from today and words each state', () => {
    const { root } = show('scene-countdown')
    expect(texts(root, '.iui-count-title strong')).toEqual(['奖学金材料', '组会汇报', '课程设计', '开题报告初稿', '日期写错的一项'])
    expect(texts(root, '.iui-count-left')).toEqual(['已过 2 天', '今天截止', '还有 1 天', '还有 12 天', '下周'])
  })
})

describe('ConceptMap, ReadingList and Timeline', () => {
  it('opens on the focused concept, marks it learned and asks the assistant', () => {
    const { root, sendPrompt } = show('scene-field-map')
    expect(root.querySelector('.iui-map-detail strong')?.textContent).toBe('反向去噪')
    expect(texts(root, '.iui-scene-head .iui-chip')[0]).toBe('已掌握 3 / 7')
    const actions = [...root.querySelectorAll<HTMLButtonElement>('.iui-map-actions button')]
    fireEvent.click(actions.find(b => b.textContent === '标记为已掌握')!)
    expect(texts(root, '.iui-scene-head .iui-chip')[0]).toBe('已掌握 4 / 7')
    fireEvent.click(actions.find(b => b.textContent === '考考我')!)
    // The concept the user just marked learned travels with the message.
    expect(sendPrompt).toHaveBeenCalledWith('出几道题考考我对“反向去噪”的理解\n\n当前界面数值：{"ConceptMap·扩散模型入门地图":{"反向去噪":true}}')
  })

  it('shows another concept when it is picked', () => {
    const { root } = show('scene-field-map')
    fireEvent.click([...root.querySelectorAll<HTMLButtonElement>('.iui-map-node')].find(b => b.textContent === '训练目标')!)
    expect(root.querySelector('.iui-map-detail strong')?.textContent).toBe('训练目标')
  })

  it('links only http(s) sources and tracks what was read', () => {
    const { root } = show('scene-field-map')
    expect([...root.querySelectorAll<HTMLAnchorElement>('.iui-read-link')].map(a => a.href)).toEqual(['https://arxiv.org/abs/2006.11239', 'https://arxiv.org/abs/2010.02502'])
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-read-item .iui-tick')!)
    expect(texts(root, '.iui-scene-head .iui-chip')).toContain('已读 1 / 3')
    expect(root.querySelectorAll('.iui-time-event.is-key')).toHaveLength(1)
  })
})

describe('PaperBrief and FollowUps', () => {
  it('shows the four cells and the verdict', () => {
    const { root } = show('scene-paper')
    expect(texts(root, '.iui-paper-cell b')).toEqual(['解决什么问题', '怎么做的', '效果如何', '局限在哪'])
    expect(root.querySelector('.iui-paper-verdict strong')?.textContent).toBe('值得精读')
  })

  it('opens nested questions and sends the user\'s own question', () => {
    const { root, sendPrompt } = show('scene-paper')
    expect(texts(root, '.iui-ask-a > p')).toEqual(['训练稳定、不会模式崩塌，样本更多样；代价是采样慢。'])
    fireEvent.click([...root.querySelectorAll<HTMLButtonElement>('.iui-ask-q')].find(b => b.textContent?.includes('采样变快'))!)
    expect(texts(root, '.iui-ask-a > p')).toContain('DDIM 把采样步数从 1000 降到几十步。')
    const input = root.querySelector<HTMLInputElement>('.iui-ask-own input')!
    fireEvent.change(input, { target: { value: '  这篇的代码开源了吗  ' } })
    fireEvent.submit(root.querySelector('.iui-ask-own')!)
    expect(sendPrompt).toHaveBeenCalledWith('这篇的代码开源了吗')
    expect(input.value).toBe('')
  })
})

describe('Quiz', () => {
  it('skips unusable questions, marks answers and reports the score', () => {
    const { root } = show('scene-quiz')
    expect(texts(root, '.iui-scene-head .iui-chip')).toEqual(['第 1 / 2 题'])
    const options = () => [...root.querySelectorAll<HTMLButtonElement>('.iui-quiz-option')]
    fireEvent.click(options()[0]!)
    expect(options()[0]?.classList.contains('is-wrong')).toBe(true)
    expect(options()[1]?.classList.contains('is-right')).toBe(true)
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-quiz-foot button')!)
    fireEvent.click(options()[2]!)
    expect(options()[2]?.classList.contains('is-right')).toBe(true)
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-quiz-foot button')!)
    expect(root.querySelector('.iui-quiz-end strong')?.textContent).toBe('答对 1 / 2')
    fireEvent.click(root.querySelector<HTMLButtonElement>('.iui-quiz-end button')!)
    expect(texts(root, '.iui-scene-head .iui-chip')).toEqual(['第 1 / 2 题'])
  })
})

describe('Decision', () => {
  it('ranks options and re-ranks when a weight changes', () => {
    const { root } = show('scene-decision')
    expect(texts(root, '.iui-decide-score')).toEqual(['74', '76', '64'])
    expect(root.querySelector('.iui-decide-option.is-best .iui-decide-name')?.textContent).toBe('导师 B')
    fireEvent.change(root.querySelectorAll<HTMLInputElement>('.iui-decide-range')[1]!, { target: { value: '0' } })
    expect(texts(root, '.iui-decide-score')).toEqual(['89', '66', '57'])
    expect(root.querySelector('.iui-decide-option.is-best .iui-decide-name')?.textContent).toBe('导师 A')
  })
})

describe('scene helpers', () => {
  it('reads weekdays written as numbers, Chinese or English names', () => {
    expect([1, '7', '周三', '星期天', 'Thu', 'friday', 0].map(weekdayIndex)).toEqual([0, 6, 2, 6, 3, 4, 6])
    expect(['8', '', '下周', null, 'month-end', 'Sat.'].map(weekdayIndex)).toEqual([-1, -1, -1, -1, -1, 5])
  })

  it('reads dates with and without a year', () => {
    const at = (value: unknown) => {
      const date = readDate(value, TODAY)
      return date === null ? null : [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    }
    expect(at('2027-01-03')).toEqual([2027, 1, 3])
    expect(at('11-16')).toEqual([2026, 11, 16])
    expect(at('11/16')).toEqual([2026, 11, 16])
    expect(at('11月16日')).toEqual([2026, 11, 16])
    expect(at('周三')).toBeNull()
    expect(at('13-45')).toBeNull()
    expect(at('2-30')).toBeNull()
    expect(daysBetween(TODAY, new Date(2026, 10, 24, 23, 59))).toBe(12)
  })

  it('places days in a rolling or a Monday-based week', () => {
    const start = new Date(2026, 10, 12)
    expect(rowOf('2026-11-12', start, TODAY)).toBe(0)
    expect(rowOf('2026-11-18', start, TODAY)).toBe(6)
    expect(rowOf('2026-11-19', start, TODAY)).toBe(-1)
    expect(rowOf('2026-11-11', start, TODAY)).toBe(-1)
    expect(rowOf(1, start, TODAY)).toBe(4)
    expect(rowOf('周四', start, TODAY)).toBe(0)
    expect(rowOf('2026-11-15', null, TODAY)).toBe(6)
    expect(rowOf(3, null, TODAY)).toBe(2)
    expect(rowOf('someday', null, TODAY)).toBe(-1)
  })

  it('reads a quiz answer as an index, an option or a letter', () => {
    const options = ['甲', '乙', '丙']
    expect([1, '乙', 'b', 'C', 3, -1, 1.5, 'D', '丁'].map(value => answerIndex(value, options))).toEqual([1, 1, 1, 2, -1, -1, -1, -1, -1])
  })

  it('scales weighted scores to 0 to 100 and tolerates missing or zero weights', () => {
    expect(weighted(2, [{ weight: 1, scores: [5, 0] }])).toEqual([100, 0])
    expect(weighted(2, [{ weight: 0, scores: [5, 5] }])).toEqual([0, 0])
    expect(weighted(2, [{ weight: 2, scores: [9, 3] }, { weight: -4, scores: [1, 5] }])).toEqual([100, 60])
    expect(weighted(3, [{ weight: 1, scores: [4] }])).toEqual([80, 0, 0])
  })
})
