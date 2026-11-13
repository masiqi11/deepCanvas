import { defineComponent } from '@openuidev/react-lang'
import { useState } from 'react'
import { z } from 'zod/v4'
import { inline } from './markdown.tsx'
import { cx } from './style.ts'
import { useCopy } from '../copy.ts'
import { Glyph } from '../glyph.tsx'
import { COMPONENT_NOTES } from './notes.ts'
import { itemKeys, useAsk, useSceneState } from './scene-state.ts'
import { label, textOf } from './scene-values.ts'

const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value.filter(v => v != null) : [])
/** Inline Markdown of a model-written value that may still be streaming in. */
const rich = (value: unknown) => inline(value == null ? '' : String(value))


// ConceptMap
const concept = z.object({
  name: label, text: z.string(), analogy: z.string().optional(), read: z.string().optional(), known: z.boolean().optional(),
})

export const ConceptMap = defineComponent({
  name: 'ConceptMap',
  props: z.object({
    layers: z.array(z.object({ name: z.string(), concepts: z.array(concept) })),
    title: z.string().optional(),
    focus: z.string().optional(),
  }),
  description: COMPONENT_NOTES.ConceptMap,
  component: function ConceptMapView({ props }) {
    const tr = useCopy()
    const ask = useAsk()
    const layers = list(props.layers)
      .map(layer => ({ ...layer, concepts: list(layer.concepts).map(c => ({ ...c, name: textOf(c.name) })).filter(c => c.name !== '') }))
    const all = layers.flatMap(layer => layer.concepts)
    const [picked, setPicked] = useState<string | null>(props.focus ?? null)
    const title = props.title ?? tr('map.title')
    const [known, setKnown] = useSceneState<Record<string, boolean>>(`ConceptMap·${title}`, {})
    const isKnown = (c: { name: string; known?: boolean | undefined }) => known[c.name] ?? c.known === true
    const current = all.find(c => c.name === picked)
    const mastered = all.filter(isKnown).length
    return (
      <section className="iui-scene" data-scene="ConceptMap" aria-label={title}>
        <header className="iui-scene-head">
          <strong>{title}</strong>
          <span className="iui-chip">{tr('map.progress', { done: mastered, total: all.length })}</span>
        </header>
        {all.length === 0 ? <p className="iui-scene-hint">{tr('scene.empty')}</p> : null}
        <div className="iui-map" style={{ gridTemplateColumns: `repeat(${Math.max(1, layers.length)}, minmax(0, 1fr))` }}>
          {layers.map((layer, l) => (
            <div key={l} className="iui-map-layer">
              <div className="iui-map-layername"><span>{layer.name}</span>{l < layers.length - 1 ? <Glyph name="arrow-right" size={12} /> : null}</div>
              {layer.concepts.map(c => (
                <button key={c.name} type="button" className={cx('iui-map-node', picked === c.name && 'is-picked', isKnown(c) && 'is-known')} aria-pressed={picked === c.name}
                  onClick={() => { setPicked(picked === c.name ? null : c.name) }}>
                  <span>{c.name}</span>
                  {isKnown(c) ? <Glyph name="check" size={12} /> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
        {current === undefined ? <p className="iui-scene-hint">{tr('map.pick')}</p> : (
          <div className="iui-map-detail">
            <strong>{current.name}</strong>
            <p>{rich(current.text)}</p>
            {current.analogy ? <p className="iui-map-aside"><b>{tr('map.analogy')}</b>{rich(current.analogy)}</p> : null}
            {current.read ? <p className="iui-map-aside"><b>{tr('map.read')}</b>{rich(current.read)}</p> : null}
            <div className="iui-map-actions">
              <button type="button" className="iui-button iui-button-outline iui-button-sm" onClick={() => { ask(tr('map.askSimpler', { name: current.name })) }}>{tr('map.simpler')}</button>
              <button type="button" className="iui-button iui-button-outline iui-button-sm" onClick={() => { ask(tr('map.askExample', { name: current.name })) }}>{tr('map.example')}</button>
              <button type="button" className="iui-button iui-button-outline iui-button-sm" onClick={() => { ask(tr('map.askQuiz', { name: current.name })) }}>{tr('map.quiz')}</button>
              <button type="button" className="iui-button iui-button-solid iui-button-sm" onClick={() => { setKnown({ ...known, [current.name]: !isKnown(current) }) }}>
                {isKnown(current) ? tr('map.unmark') : tr('map.mark')}
              </button>
            </div>
          </div>
        )}
      </section>
    )
  },
})

// PaperBrief
export const PaperBrief = defineComponent({
  name: 'PaperBrief',
  props: z.object({
    title: z.string(), oneLine: z.string(), problem: z.string().optional(), method: z.string().optional(), result: z.string().optional(),
    limit: z.string().optional(),
    meta: z.string().optional(), verdict: z.string().optional(), why: z.string().optional(),
  }),
  description: COMPONENT_NOTES.PaperBrief,
  component: function PaperBriefView({ props }) {
    const tr = useCopy()
    const cells = ([['problem', props.problem], ['method', props.method], ['result', props.result], ['limit', props.limit]] as const)
      .filter(([, text]) => typeof text === 'string' && text.trim() !== '')
    return (
      <section data-scene="PaperBrief" className="iui-scene" aria-label={props.title}>
        <header className="iui-paper-head">
          <div><strong>{props.title}</strong>{props.meta ? <span>{props.meta}</span> : null}</div>
          {props.verdict ? <div className="iui-paper-verdict"><span>{tr('paper.verdict')}</span><strong>{props.verdict}</strong></div> : null}
        </header>
        <p className="iui-paper-line">{rich(props.oneLine)}</p>
        <div className="iui-paper-grid">
          {cells.map(([key, text]) => (
            <div key={key} className={`iui-paper-cell is-${key}`}><b>{tr(`paper.${key}`)}</b><p>{rich(text)}</p></div>
          ))}
        </div>
        {props.why ? <p className="iui-scene-hint">{rich(props.why)}</p> : null}
      </section>
    )
  },
})

// FollowUps
const answer = z.object({ q: z.string(), a: z.string() })

export const FollowUps = defineComponent({
  name: 'FollowUps',
  props: z.object({
    items: z.array(z.object({ q: z.string(), a: z.string(), more: z.array(answer).optional() })),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.FollowUps,
  component: function FollowUpsView({ props }) {
    const tr = useCopy()
    const ask = useAsk()
    const [open, setOpen] = useState<Record<string, boolean>>({ 0: true })
    const [draft, setDraft] = useState('')
    const toggle = (key: string) => { setOpen({ ...open, [key]: !open[key] }) }
    const send = () => {
      if (draft.trim() === '') return
      ask(draft.trim())
      setDraft('')
    }
    return (
      <section className="iui-scene" data-scene="FollowUps" aria-label={props.title ?? tr('ask.title')}>
        <header className="iui-scene-head"><strong>{props.title ?? tr('ask.title')}</strong></header>
        <div className="iui-ask">
          {list(props.items).map((it, i) => (
            <div key={i} className={cx('iui-ask-item', open[i] && 'is-open')}>
              <button type="button" className="iui-ask-q" aria-expanded={open[i] === true} onClick={() => { toggle(String(i)) }}>
                <span>{it.q}</span><Glyph name="chevron-down" size={14} />
              </button>
              {open[i] ? (
                <div className="iui-ask-a">
                  <p>{rich(it.a)}</p>
                  {list(it.more).map((sub, s) => (
                    <div key={s} className={cx('iui-ask-item is-sub', open[`${i}.${s}`] && 'is-open')}>
                      <button type="button" className="iui-ask-q" aria-expanded={open[`${i}.${s}`] === true} onClick={() => { toggle(`${i}.${s}`) }}>
                        <span>{sub.q}</span><Glyph name="chevron-down" size={14} />
                      </button>
                      {open[`${i}.${s}`] ? <div className="iui-ask-a"><p>{rich(sub.a)}</p></div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <form className="iui-ask-own" onSubmit={(event) => { event.preventDefault(); send() }}>
            <input className="iui-input" value={draft} placeholder={tr('ask.placeholder')} aria-label={tr('ask.placeholder')} onChange={(event) => { setDraft(event.target.value) }} />
            <button type="submit" className="iui-button iui-button-solid iui-button-sm" disabled={draft.trim() === ''}>{tr('ask.send')}</button>
          </form>
        </div>
      </section>
    )
  },
})

// Quiz
const question = z.object({
  q: z.string(), options: z.array(label), answer: z.union([z.number(), z.string()]), why: z.string().optional(),
})

/**
 * Read which option is correct: a 0-based index, an option's text, or a letter such as "B".
 * @param value - answer as written.
 * @param options - the question's options.
 * @returns the option index, or -1 when the answer matches none.
 */
export function answerIndex(value: unknown, options: string[]): number {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value < options.length ? value : -1
  const text = String(value ?? '').trim()
  const exact = options.indexOf(text)
  if (exact >= 0) return exact
  const letter = /^[A-Za-z]$/.test(text) ? text.toUpperCase().charCodeAt(0) - 65 : -1
  return letter >= 0 && letter < options.length ? letter : -1
}

export const Quiz = defineComponent({
  name: 'Quiz',
  props: z.object({ questions: z.array(question), title: z.string().optional() }),
  description: COMPONENT_NOTES.Quiz,
  component: function QuizView({ props }) {
    const tr = useCopy()
    const questions = list(props.questions).map(q => ({ ...q, options: list(q.options).map(textOf) })).filter(q => q.options.length > 1)
    const title = props.title ?? tr('quiz.title')
    const keys = itemKeys(questions.map(q => textOf(q.q)))
    const [answers, setAnswers] = useSceneState<Record<string, string>>(`Quiz·${title}`, {})
    const picks: Record<number, number> = {}
    questions.forEach((q, i) => {
      const chosen = answers[keys[i] ?? '']
      const index = chosen === undefined ? -1 : q.options.indexOf(chosen)
      if (index >= 0) picks[i] = index
    })
    // Until the user moves on, the quiz stands at the first question without an answer, so a remount resumes there.
    const open = questions.findIndex((_, i) => picks[i] === undefined)
    const [cursor, setAt] = useState<number | null>(null)
    const at = cursor ?? (open < 0 ? questions.length : open)
    const choose = (i: number, o: number) => {
      setAt(i) // Stay on the answered question to show its feedback.
      setAnswers({ ...answers, [keys[i] ?? '']: questions[i]?.options[o] ?? '' })
    }
    const total = questions.length
    // A question whose answer matches no option is shown but not scored.
    const scored = questions.filter(q => answerIndex(q.answer, q.options) >= 0).length
    const score = questions.filter((q, i) => picks[i] === answerIndex(q.answer, q.options)).length
    const current = questions[at]
    const restart = () => { setAt(0); setAnswers({}) }
    return (
      <section className="iui-scene" data-scene="Quiz" aria-label={title}>
        <header className="iui-scene-head">
          <strong>{title}</strong>
          <span className="iui-chip">{current === undefined ? tr('quiz.score', { n: score, total: scored }) : tr('quiz.progress', { n: at + 1, total })}</span>
        </header>
        <span className="iui-progress" role="img" aria-label={`${Object.keys(picks).length} / ${total}`}><span style={{ width: `${total === 0 ? 0 : (Object.keys(picks).length / total) * 100}%` }} /></span>
        {current === undefined ? (
          <div className="iui-quiz-end">
            <strong>{tr('quiz.score', { n: score, total: scored })}</strong>
            <button type="button" className="iui-button iui-button-outline iui-button-sm" onClick={restart}>{tr('quiz.again')}</button>
          </div>
        ) : (
          <div className="iui-quiz">
            <p className="iui-quiz-q">{rich(current.q)}</p>
            {current.options.map((option, o) => {
              const right = answerIndex(current.answer, current.options)
              // Unscored questions mark neither option: there is no right answer to compare with.
              const answered = picks[at] !== undefined && right >= 0
              return (
                <button key={o} type="button" disabled={picks[at] !== undefined} aria-pressed={picks[at] === o}
                  className={cx('iui-quiz-option', answered && o === right && 'is-right', answered && picks[at] === o && o !== right && 'is-wrong')}
                  onClick={() => { choose(at, o) }}>
                  <span className="iui-quiz-letter">{String.fromCharCode(65 + o)}</span><span>{rich(option)}</span>
                </button>
              )
            })}
            {picks[at] !== undefined ? (
              <div className="iui-quiz-foot">
                <p>{answerIndex(current.answer, current.options) < 0 ? tr('quiz.unscored') : current.why ? rich(current.why) : null}</p>
                <button type="button" className="iui-button iui-button-solid iui-button-sm" onClick={() => { setAt(at + 1) }}>{at + 1 < total ? tr('quiz.next') : tr('quiz.finish')}</button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    )
  },
})
