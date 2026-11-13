import { defineComponent } from '@openuidev/react-lang'
import { z } from 'zod/v4'
import { inline } from './markdown.tsx'
import { cx, webUrl } from './style.ts'
import { useCopy } from '../copy.ts'
import { Glyph } from '../glyph.tsx'
import { daysBetween, readDate, startOfDay } from './dates.ts'
import { COMPONENT_NOTES } from './notes.ts'
import { itemKeys, useSceneState } from './scene-state.ts'
import { label, textOf } from './scene-values.ts'

const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value.filter(v => v != null) : [])
/** Inline Markdown of a model-written value that may still be streaming in. */
const rich = (value: unknown) => inline(value == null ? '' : String(value))

function Check({ on, label, toggle }: { on: boolean; label: string; toggle: () => void }) {
  return (
    <button type="button" className="iui-tick" aria-pressed={on} aria-label={label} onClick={toggle}>
      {on ? <Glyph name="check" size={12} /> : null}
    </button>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  return <span className="iui-progress" role="img" aria-label={`${done} / ${total}`}><span style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }} /></span>
}

// Roadmap
export const Roadmap = defineComponent({
  name: 'Roadmap',
  props: z.object({
    phases: z.array(z.object({
      name: label, span: z.string().optional(), goal: z.string().optional(), tasks: z.array(label).optional(),
    })),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.Roadmap,
  component: function RoadmapView({ props }) {
    const tr = useCopy()
    const phases = list(props.phases).map(phase => ({ ...phase, name: textOf(phase.name), tasks: list(phase.tasks).map(textOf) }))
    const title = props.title ?? tr('road.title')
    const keys = itemKeys(phases.flatMap(phase => phase.tasks.map(task => `${phase.name}/${task}`)))
    const keyOf = (p: number, t: number) => keys[phases.slice(0, p).reduce((n, phase) => n + phase.tasks.length, 0) + t] ?? ''
    const [done, setDone] = useSceneState<string[]>(`Roadmap·${title}`, [])
    const isDone = (p: number, t: number) => done.includes(keyOf(p, t))
    const toggle = (p: number, t: number) => { setDone(isDone(p, t) ? done.filter(k => k !== keyOf(p, t)) : [...done, keyOf(p, t)]) }
    const total = keys.length
    const finished = keys.filter(key => done.includes(key)).length
    return (
      <section className="iui-scene" data-scene="Roadmap" aria-label={title}>
        <header className="iui-scene-head">
          <strong>{title}</strong>
          <span className="iui-chip">{tr('road.progress', { done: finished, total })}</span>
        </header>
        <Progress done={finished} total={total} />
        {phases.length === 0 ? <p className="iui-scene-hint">{tr('scene.empty')}</p> : null}
        <ol className="iui-road">
          {phases.map((phase, p) => {
            const tasks = phase.tasks
            const phaseDone = tasks.length > 0 && tasks.every((_, t) => isDone(p, t))
            return (
              <li key={p} className={cx('iui-road-phase', phaseDone && 'is-done')}>
                <span className="iui-road-dot">{phaseDone ? <Glyph name="check" size={12} /> : p + 1}</span>
                <div className="iui-road-body">
                  <div className="iui-road-name"><strong>{phase.name}</strong>{phase.span ? <span className="iui-chip">{phase.span}</span> : null}</div>
                  {phase.goal ? <p className="iui-road-goal">{rich(phase.goal)}</p> : null}
                  {tasks.map((task, t) => (
                    <div key={t} className={cx('iui-road-task', isDone(p, t) && 'is-done')}>
                      <Check on={isDone(p, t)} label={task} toggle={() => { toggle(p, t) }} />
                      <span>{rich(task)}</span>
                    </div>
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    )
  },
})

// Countdown
export const Countdown = defineComponent({
  name: 'Countdown',
  props: z.object({
    items: z.array(z.object({ title: label, date: z.string(), note: z.string().optional() })),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.Countdown,
  component: function CountdownView({ props }) {
    const tr = useCopy()
    const now = startOfDay(new Date())
    const rows = list(props.items)
      .map(it => ({ ...it, left: (date => (date === null ? null : daysBetween(now, date)))(readDate(it.date, now)) }))
      .sort((a, b) => (a.left ?? 9999) - (b.left ?? 9999))
    const span = Math.max(14, ...rows.map(r => r.left ?? 0))
    return (
      <section className="iui-scene" data-scene="Countdown" aria-label={props.title ?? tr('count.title')}>
        <header className="iui-scene-head"><strong>{props.title ?? tr('count.title')}</strong></header>
        {rows.length === 0 ? <p className="iui-scene-hint">{tr('scene.empty')}</p> : null}
        <div className="iui-count">
          {rows.map((row, i) => {
            const left = row.left
            const tone = left === null ? 'calm' : left <= 2 ? 'danger' : left <= 7 ? 'warning' : 'calm'
            const text = left === null ? row.date : left < 0 ? tr('count.over', { n: -left }) : left === 0 ? tr('count.today') : tr('count.left', { n: left })
            return (
              <div key={i} className={cx('iui-count-row', `is-${tone}`)}>
                <div className="iui-count-title"><strong>{row.title}</strong>{row.note ? <span>{row.note}</span> : null}</div>
                <span className="iui-count-bar"><span style={{ width: `${left === null ? 0 : Math.max(4, 100 - (Math.max(0, left) / span) * 100)}%` }} /></span>
                <span className="iui-count-left">{text}</span>
              </div>
            )
          })}
        </div>
      </section>
    )
  },
})

// Timeline
export const Timeline = defineComponent({
  name: 'Timeline',
  props: z.object({
    events: z.array(z.object({ when: label, title: label, text: z.string().optional(), highlight: z.boolean().optional() })),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.Timeline,
  component: function TimelineView({ props }) {
    const tr = useCopy()
    const events = list(props.events)
    return (
      <section className="iui-scene" data-scene="Timeline" aria-label={props.title ?? tr('time.title')}>
        <header className="iui-scene-head"><strong>{props.title ?? tr('time.title')}</strong></header>
        {events.length === 0 ? <p className="iui-scene-hint">{tr('scene.empty')}</p> : null}
        <ol className="iui-time">
          {events.map((event, i) => (
            <li key={i} className={cx('iui-time-event', event.highlight === true && 'is-key')}>
              <span className="iui-time-when">{event.when}</span>
              <span className="iui-time-dot" />
              <div className="iui-time-body"><strong>{rich(event.title)}</strong>{event.text ? <p>{rich(event.text)}</p> : null}</div>
            </li>
          ))}
        </ol>
      </section>
    )
  },
})

// ReadingList
export const ReadingList = defineComponent({
  name: 'ReadingList',
  props: z.object({
    items: z.array(z.object({
      title: label, meta: z.string().optional(), tag: z.string().optional(), url: z.string().optional(), why: z.string().optional(),
    })),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.ReadingList,
  component: function ReadingListView({ props }) {
    const tr = useCopy()
    const items = list(props.items).map(it => ({ ...it, title: textOf(it.title) }))
    const title = props.title ?? tr('read.title')
    const keys = itemKeys(items.map(it => it.title))
    const [read, setRead] = useSceneState<string[]>(`ReadingList·${title}`, [])
    const isRead = (i: number) => read.includes(keys[i] ?? '')
    const toggle = (i: number) => { setRead(isRead(i) ? read.filter(k => k !== keys[i]) : [...read, keys[i] ?? '']) }
    const finished = keys.filter(key => read.includes(key)).length
    return (
      <section className="iui-scene" data-scene="ReadingList" aria-label={title}>
        <header className="iui-scene-head">
          <strong>{title}</strong>
          <span className="iui-chip">{tr('read.progress', { done: finished, total: items.length })}</span>
        </header>
        <Progress done={finished} total={items.length} />
        {items.length === 0 ? <p className="iui-scene-hint">{tr('scene.empty')}</p> : null}
        <ol className="iui-read">
          {items.map((it, i) => {
            const url = webUrl(it.url)
            return (
              <li key={i} className={cx('iui-read-item', isRead(i) && 'is-done')}>
                <Check on={isRead(i)} label={it.title} toggle={() => { toggle(i) }} />
                <div className="iui-read-body">
                  <span className="iui-read-title">{i + 1}. {it.title}</span>
                  {it.meta ? <span className="iui-read-meta">{it.meta}</span> : null}
                  {it.why ? <span className="iui-read-why">{rich(it.why)}</span> : null}
                </div>
                {it.tag ? <span className="iui-chip">{it.tag}</span> : null}
                {url !== null ? <a className="iui-read-link" href={url} target="_blank" rel="noopener noreferrer">{tr('read.open')}</a> : null}
              </li>
            )
          })}
        </ol>
      </section>
    )
  },
})
