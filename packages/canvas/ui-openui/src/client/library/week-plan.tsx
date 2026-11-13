import { defineComponent } from '@openuidev/react-lang'
import { useState } from 'react'
import { z } from 'zod/v4'
import { cx } from './style.ts'
import { useCopy } from '../copy.ts'
import type { OpenUIKey } from '../locales.ts'
import { Glyph } from '../glyph.tsx'
import { addDays, daysBetween, mondayIndex, readDate, startOfDay, weekdayIndex } from './dates.ts'
import { COMPONENT_NOTES } from './notes.ts'
import { itemKeys, useAsk, useSceneState } from './scene-state.ts'
import { label, textOf } from './scene-values.ts'

const DAY_KEYS: OpenUIKey[] = ['week.day1', 'week.day2', 'week.day3', 'week.day4', 'week.day5', 'week.day6', 'week.day7']
const TONES = new Set(['info', 'success', 'warning', 'danger', 'purple'])

const item = z.object({
  day: z.union([z.number(), z.string()]),
  title: label,
  time: z.string().optional(),
  note: z.string().optional(),
  deadline: z.boolean().optional(),
  tone: z.string().optional(),
})

/**
 * Place a model-written day in a seven-day window.
 * @param day - weekday (1 to 7 or a name) or a date.
 * @param start - first day of a rolling window, or null for Monday to Sunday.
 * @param now - supplies the year for dates written without one.
 * @returns the row 0 to 6, or -1 when the day falls outside the window.
 */
export function rowOf(day: unknown, start: Date | null, now: Date): number {
  const date = readDate(day, start ?? now)
  if (date !== null) {
    if (start === null) return mondayIndex(date)
    const offset = daysBetween(start, date)
    return offset >= 0 && offset < 7 ? offset : -1
  }
  const weekday = weekdayIndex(day)
  if (weekday < 0 || start === null) return weekday
  return (weekday - mondayIndex(start) + 7) % 7
}

/** What the user changed in a week plan: item keys ticked off, and the day each moved item now sits on. */
type WeekState = { done: string[]; moved: Record<string, string> }

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const WeekPlan = defineComponent({
  name: 'WeekPlan',
  props: z.object({ items: z.array(item), title: z.string().optional(), start: z.string().optional() }),
  description: COMPONENT_NOTES.WeekPlan,
  component: function WeekPlanView({ props }) {
    const tr = useCopy()
    const now = startOfDay(new Date())
    const start = readDate(props.start, now)
    const written = (Array.isArray(props.items) ? props.items : []).filter(it => it != null).map(it => ({ ...it, title: textOf(it.title) }))
    const items = written.filter(it => rowOf(it.day, start, now) >= 0)
    const outside = written.length - items.length
    const title = props.title ?? tr('week.title')
    const keys = itemKeys(items.map(it => `${it.title}·${textOf(it.day)}`))
    const [state, setState] = useSceneState<WeekState>(`WeekPlan·${title}`, { done: [], moved: {} })
    const [picked, setPicked] = useState<number | null>(null)
    const ask = useAsk()
    const rowAt = (i: number) => {
      const target = state.moved[keys[i] ?? '']
      const row = target === undefined ? -1 : rowOf(target, start, now)
      return row >= 0 ? row : rowOf(items[i]?.day, start, now)
    }
    const isDone = (i: number) => state.done.includes(keys[i] ?? '')
    const toggle = (i: number) => {
      const key = keys[i] ?? ''
      setState({ ...state, done: isDone(i) ? state.done.filter(k => k !== key) : [...state.done, key] })
    }
    // A moved item records the day it moved to as the user would say it: a date, or a weekday name without a start date.
    const dayText = (row: number) => (start === null ? tr(DAY_KEYS[row] ?? 'week.day1') : isoDay(addDays(start, row)))
    const move = (i: number, row: number) => { setState({ ...state, moved: { ...state.moved, [keys[i] ?? '']: dayText(row) } }) }
    const changed = state.done.length > 0 || Object.keys(state.moved).length > 0
    const todayRow = start === null ? mondayIndex(now) : daysBetween(start, now)
    const deadlines = items.filter(it => it.deadline === true).length
    const label = (row: number) => {
      if (start === null) return { name: tr(DAY_KEYS[row] ?? 'week.day1'), date: '' }
      const date = addDays(start, row)
      return { name: tr(DAY_KEYS[mondayIndex(date)] ?? 'week.day1'), date: `${date.getMonth() + 1}/${date.getDate()}` }
    }
    return (
      <section data-scene="WeekPlan" className="iui-scene iui-week" aria-label={title}>
        <header className="iui-scene-head">
          <strong>{title}</strong>
          <span className="iui-chip">{tr('week.count', { n: items.length })}</span>
          {deadlines > 0 && <span className="iui-chip is-danger">{tr('week.deadlines', { n: deadlines })}</span>}
        </header>
        <div className="iui-week-rows">
          {DAY_KEYS.map((key, row) => {
            const here = items.map((it, i) => ({ it, i })).filter(({ i }) => rowAt(i) === row)
            const { name, date } = label(row)
            return (
              <div key={key} className={cx('iui-week-row', row === todayRow && 'is-today', here.length === 0 && 'is-empty')}>
                <div className="iui-week-day">
                  <span className="iui-week-dayname">{name}</span>
                  <span className="iui-week-date">{row === todayRow ? tr('week.today') : date}</span>
                </div>
                <div className="iui-week-items">
                  {here.map(({ it, i }) => (
                    <div key={i} className={cx('iui-week-item', `is-${TONES.has(it.tone ?? '') ? it.tone : 'info'}`, isDone(i) && 'is-done', picked === i && 'is-picked')}>
                      <button type="button" className="iui-tick" aria-pressed={isDone(i)} aria-label={tr('week.done', { title: it.title })} onClick={() => { toggle(i) }}>
                        {isDone(i) ? <Glyph name="check" size={12} /> : null}
                      </button>
                      <button type="button" className="iui-week-body" aria-pressed={picked === i} onClick={() => { setPicked(picked === i ? null : i) }}>
                        <span className="iui-week-title">{it.time ? <span className="iui-week-time">{it.time}</span> : null}{it.title}</span>
                        {it.note ? <span className="iui-week-note">{it.note}</span> : null}
                      </button>
                      {it.deadline === true ? <span className="iui-week-deadline">{tr('week.deadline')}</span> : null}
                    </div>
                  ))}
                  {picked !== null && rowAt(picked) !== row && (
                    <button type="button" className="iui-week-drop" onClick={() => { move(picked, row); setPicked(null) }}>{tr('week.moveHere')}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {outside > 0 ? <p className="iui-scene-hint">{tr('week.outside', { n: outside })}</p> : null}
        <p className="iui-scene-hint">{items.length === 0 ? tr('week.empty') : tr('week.hint')}</p>
        {changed ? (
          <button type="button" className="iui-button iui-button-outline iui-button-sm" onClick={() => { ask(tr('week.replanAsk')) }}>{tr('week.replan')}</button>
        ) : null}
      </section>
    )
  },
})
