import { defineComponent } from '@openuidev/react-lang'
import { useState } from 'react'
import { z } from 'zod/v4'
import { cx } from './style.ts'
import { useCopy } from '../copy.ts'
import type { OpenUIKey } from '../locales.ts'
import { Glyph } from '../glyph.tsx'
import { COMPONENT_NOTES } from './notes.ts'

const DAY_KEYS: OpenUIKey[] = ['week.day1', 'week.day2', 'week.day3', 'week.day4', 'week.day5', 'week.day6', 'week.day7']
const DAY_NAMES = [
  ['1', 'mon', '周一', '星期一', '一'], ['2', 'tue', '周二', '星期二', '二'], ['3', 'wed', '周三', '星期三', '三'], ['4', 'thu', '周四', '星期四', '四'],
  ['5', 'fri', '周五', '星期五', '五'], ['6', 'sat', '周六', '星期六', '六'], ['7', 'sun', '周日', '星期日', '周天', '星期天', '日', '0'],
]

/**
 * Read a model-written weekday: 1 (Monday) to 7 (Sunday), or a Chinese or English day name.
 * @param value - weekday as written.
 * @returns the column index 0 to 6, or -1 when it names no weekday.
 */
export function dayIndex(value: unknown): number {
  const text = String(value ?? '').trim().toLowerCase()
  return DAY_NAMES.findIndex(names => names.some(name => text === name || (name.length === 3 && text.startsWith(name))))
}

const item = z.object({
  day: z.union([z.number(), z.string()]),
  title: z.string(),
  time: z.string().optional(),
  note: z.string().optional(),
  deadline: z.boolean().optional(),
  tone: z.enum(['info', 'success', 'warning', 'danger', 'purple']).optional(),
})

export const WeekPlan = defineComponent({
  name: 'WeekPlan',
  props: z.object({ items: z.array(item), title: z.string().optional(), today: z.union([z.number(), z.string()]).optional() }),
  description: COMPONENT_NOTES.WeekPlan,
  component: function WeekPlanView({ props }) {
    const tr = useCopy()
    const items = Array.isArray(props.items) ? props.items.filter(it => it != null && dayIndex(it.day) >= 0) : []
    const [moved, setMoved] = useState<Record<number, number>>({})
    const [done, setDone] = useState<Record<number, boolean>>({})
    const [picked, setPicked] = useState<number | null>(null)
    const today = dayIndex(props.today)
    const dayOf = (i: number) => moved[i] ?? dayIndex(items[i]?.day)
    const deadlines = items.filter(it => it.deadline === true).length
    return (
      <section className="iui-week" aria-label={props.title ?? tr('week.title')}>
        <header className="iui-week-head">
          <strong>{props.title ?? tr('week.title')}</strong>
          <span className="iui-week-chip">{tr('week.count', { n: items.length })}</span>
          {deadlines > 0 && <span className="iui-week-chip is-deadline">{tr('week.deadlines', { n: deadlines })}</span>}
        </header>
        <div className="iui-week-scroll">
          <div className="iui-week-grid">
            {DAY_KEYS.map((key, d) => (
              <div key={key} className={cx('iui-week-day', d === today && 'is-today')}>
                <div className="iui-week-dayname">{tr(key)}{d === today ? ` · ${tr('week.today')}` : ''}</div>
                {items.map((it, i) => dayOf(i) === d && (
                  <div key={i} className={cx('iui-week-item', `is-${it.tone ?? 'info'}`, done[i] && 'is-done', picked === i && 'is-picked')}>
                    <button type="button" className="iui-week-check" aria-pressed={done[i] === true} aria-label={tr('week.done', { title: it.title })} onClick={() => { setDone({ ...done, [i]: !done[i] }) }}>
                      {done[i] ? <Glyph name="check" size={12} /> : null}
                    </button>
                    <button type="button" className="iui-week-body" aria-pressed={picked === i} onClick={() => { setPicked(picked === i ? null : i) }}>
                      {it.time ? <span className="iui-week-time">{it.time}</span> : null}
                      <span className="iui-week-title">{it.title}</span>
                      {it.note ? <span className="iui-week-note">{it.note}</span> : null}
                      {it.deadline === true ? <span className="iui-week-deadline">{tr('week.deadline')}</span> : null}
                    </button>
                  </div>
                ))}
                {picked !== null && dayOf(picked) !== d && (
                  <button type="button" className="iui-week-drop" onClick={() => { setMoved({ ...moved, [picked]: d }); setPicked(null) }}>{tr('week.moveHere')}</button>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="iui-week-hint">{tr('week.hint')}</p>
      </section>
    )
  },
})
