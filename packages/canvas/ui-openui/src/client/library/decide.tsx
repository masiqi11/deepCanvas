import { defineComponent } from '@openuidev/react-lang'
import { useState } from 'react'
import { z } from 'zod/v4'
import { cx } from './style.ts'
import { useCopy } from '../copy.ts'
import { COMPONENT_NOTES } from './notes.ts'

const criterion = z.object({ name: z.string(), weight: z.number(), scores: z.array(z.number()) })

/**
 * Weighted score of each option, scaled to 0 to 100.
 * @param count - number of options.
 * @param criteria - weights and per-option scores from 1 to 5.
 * @returns one score per option; all zero when every weight is zero.
 */
export function weighted(count: number, criteria: { weight: number; scores: number[] }[]): number[] {
  const weightOf = (c: { weight: number }) => Math.max(0, Number(c.weight) || 0)
  const scoreOf = (c: { scores: number[] }, option: number) => Math.min(5, Math.max(0, Number(c.scores[option]) || 0))
  const sum = criteria.reduce((n, c) => n + weightOf(c), 0)
  return Array.from({ length: count }, (_, o) => (sum === 0 ? 0
    : Math.round(criteria.reduce((n, c) => n + weightOf(c) * scoreOf(c, o), 0) / (sum * 5) * 100)))
}

export const Decision = defineComponent({
  name: 'Decision',
  props: z.object({ options: z.array(z.string()), criteria: z.array(criterion), title: z.string().optional() }),
  description: COMPONENT_NOTES.Decision,
  component: function DecisionView({ props }) {
    const tr = useCopy()
    const options = Array.isArray(props.options) ? props.options : []
    const criteria = (Array.isArray(props.criteria) ? props.criteria : []).filter(c => c != null && Array.isArray(c.scores))
    const [weights, setWeights] = useState<Record<number, number>>({})
    const live = criteria.map((c, i) => ({ ...c, weight: weights[i] ?? (Number(c.weight) || 0) }))
    const totals = weighted(options.length, live)
    const best = totals.indexOf(Math.max(...totals))
    return (
      <section className="iui-scene" aria-label={props.title ?? tr('decide.title')}>
        <header className="iui-scene-head">
          <strong>{props.title ?? tr('decide.title')}</strong>
          {options[best] !== undefined ? <span className="iui-chip is-success">{tr('decide.best', { name: options[best] })}</span> : null}
        </header>
        <div className="iui-decide-rank">
          {options.map((option, o) => (
            <div key={o} className={cx('iui-decide-option', o === best && 'is-best')}>
              <span className="iui-decide-name">{option}</span>
              <span className="iui-decide-bar"><span style={{ width: `${totals[o] ?? 0}%` }} /></span>
              <span className="iui-decide-score">{totals[o] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="iui-decide-table" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) minmax(110px, 1fr) repeat(${options.length}, minmax(48px, .6fr))` }}>
          <span className="iui-decide-th" /><span className="iui-decide-th">{tr('decide.weight')}</span>
          {options.map((option, o) => <span key={o} className="iui-decide-th">{option}</span>)}
          {live.map((c, i) => [
            <span key={`n${i}`} className="iui-decide-crit">{c.name}</span>,
            <input key={`w${i}`} type="range" min={0} max={5} step={1} value={c.weight} aria-label={`${c.name} ${tr('decide.weight')}`} className="iui-decide-range"
              onChange={(event) => { setWeights({ ...weights, [i]: Number(event.target.value) }) }} />,
            ...options.map((_, o) => <span key={`s${i}.${o}`} className={cx('iui-decide-cell', o === best && 'is-best')}>{c.scores[o] ?? '–'}</span>),
          ])}
        </div>
        <p className="iui-scene-hint">{tr('decide.hint')}</p>
      </section>
    )
  },
})
