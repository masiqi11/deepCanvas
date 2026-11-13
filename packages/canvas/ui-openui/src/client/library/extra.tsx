import { defineComponent, useIsStreaming } from '@openuidev/react-lang'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.mjs'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.mjs'
import Copy from 'lucide-react/dist/esm/icons/copy.mjs'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod/v4'
import { inline } from './markdown.tsx'
import { children, cx } from './style.ts'
import { useCopy } from '../copy.ts'
import { Glyph } from '../glyph.tsx'
import { COMPONENT_NOTES } from './notes.ts'

const str = (value: unknown) => (value == null ? '' : String(value))
/** A slot that takes a component, a list of them, or plain text. */
const slot = z.union([z.string(), children])
type Render = (value: unknown) => ReactNode
const renderSlot = (value: unknown, renderNode: Render) =>
  typeof value === 'string' || typeof value === 'number' ? inline(String(value)) : renderNode(Array.isArray(value) ? value.flat() : value)

// Carousel
export const Carousel = defineComponent({
  name: 'Carousel',
  props: z.object({ children, itemWidth: z.number().optional(), gap: z.number().optional() }),
  description: COMPONENT_NOTES.Carousel,
  component: function CarouselView({ props, renderNode }) {
    const ref = useRef<HTMLDivElement>(null)
    const [edges, setEdges] = useState({ start: true, end: true })
    const items = (Array.isArray(props.children) ? props.children.flat() : []).filter(c => c != null)
    const width = Math.min(640, Math.max(80, props.itemWidth ?? 240))
    useLayoutEffect(() => {
      const el = ref.current
      if (!el) return
      const read = () =>{  setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 }) }
      read()
      el.addEventListener('scroll', read, { passive: true })
      const observer = new ResizeObserver(read)
      observer.observe(el)
      return () => {
        el.removeEventListener('scroll', read)
        observer.disconnect()
      }
    }, [items.length])
    const tr = useCopy()
    const page = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' })
    return (
      <div className="iui-carousel">
        <div ref={ref} className="iui-carousel-track" style={{ gap: props.gap != null ? Math.max(0, props.gap) * 4 : undefined }}>
          {items.map((item, i) => (
            <div key={i} className="iui-carousel-item" style={{ width }}>
              {renderNode(item)}
            </div>
          ))}
        </div>
        {!edges.start && (
          <button type="button" className="iui-carousel-nav is-prev" aria-label={tr('carousel.previous')} onClick={() => page(-1)}>
            <ChevronLeft size={18} />
          </button>
        )}
        {!edges.end && (
          <button type="button" className="iui-carousel-nav is-next" aria-label={tr('carousel.next')} onClick={() => page(1)}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    )
  },
})

// Popover
export const Popover = defineComponent({
  name: 'Popover',
  props: z.object({ trigger: slot, content: slot }),
  description: COMPONENT_NOTES.Popover,
  component: function PopoverView({ props, renderNode }) {
    const [open, setOpen] = useState(false)
    const [at, setAt] = useState<{ left: number; top: number; up: boolean } | null>(null)
    const button = useRef<HTMLButtonElement>(null)
    const panel = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
      if (!open || !button.current) return
      const r = button.current.getBoundingClientRect()
      const up = r.bottom + 220 > window.innerHeight && r.top > 240
      setAt({ left: Math.min(Math.max(12, r.left), window.innerWidth - 292), top: up ? r.top - 8 : r.bottom + 8, up })
    }, [open])
    useEffect(() => {
      if (!open) return
      const close = (event: Event) => {
        const target = event.target as Node
        if (event.type === 'keydown' ? (event as KeyboardEvent).key === 'Escape' : !panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
      }
      const onScroll = () =>{  setOpen(false) }
      document.addEventListener('pointerdown', close)
      document.addEventListener('keydown', close)
      window.addEventListener('scroll', onScroll, true)
      return () => {
        document.removeEventListener('pointerdown', close)
        document.removeEventListener('keydown', close)
        window.removeEventListener('scroll', onScroll, true)
      }
    }, [open])
    return (
      <>
        <button ref={button} type="button" className="iui-popover-trigger" aria-expanded={open} onClick={() =>{  setOpen(!open) }}>
          {renderSlot(props.trigger, renderNode)}
        </button>
        {open &&
          at &&
          createPortal(
            <div
              ref={panel}
              role="dialog"
              className="iui-popover"
              style={{ left: at.left, top: at.top, transform: at.up ? 'translateY(-100%)' : undefined }}
              data-theme={button.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined}
            >
              {renderSlot(props.content, renderNode)}
            </div>,
            document.body,
          )}
      </>
    )
  },
})

// Code, quote, math
export const Code = defineComponent({
  name: 'Code',
  props: z.object({ code: z.string(), language: z.string().optional(), highlight: z.union([z.number(), z.array(z.number())]).optional() }),
  description: COMPONENT_NOTES.Code,
  component: function CodeView({ props }) {
    const tr = useCopy()
    const [copied, setCopied] = useState(false)
    const code = str(props.code)
    const marked = props.highlight === undefined ? undefined : new Set([props.highlight].flat())
    const copy = () =>
      void navigator.clipboard?.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() =>{  setCopied(false) }, 1500)
      })
    return (
      <div className="iui-codeblock">
        <div className="iui-codeblock-head">
          <span>{str(props.language) || tr('code.language')}</span>
          <button type="button" onClick={copy} aria-label={tr('code.copy')}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? tr('copied') : tr('code.copy')}
          </button>
        </div>
        <pre>
          {marked === undefined ? <code>{code}</code> : (
            <code className="iui-code-lines">
              {code.split('\n').map((line, i) => (
                <span key={i} className="iui-code-line" data-on={marked.has(i + 1) || undefined}>
                  <span className="iui-code-no" aria-hidden="true">{i + 1}</span>
                  {line === '' ? ' ' : line}
                </span>
              ))}
            </code>
          )}
        </pre>
      </div>
    )
  },
})

export const Quote = defineComponent({
  name: 'Quote',
  props: z.object({ text: z.string(), cite: z.string().optional() }),
  description: COMPONENT_NOTES.Quote,
  component: ({ props }) => (
    <blockquote className="iui-quote">
      <p>{inline(str(props.text))}</p>
      {props.cite ? <cite>{inline(str(props.cite))}</cite> : null}
    </blockquote>
  ),
})

const CALLOUT_ICON = { info: 'info', success: 'check-circle', warning: 'triangle-alert', danger: 'circle-alert' } as const

export const Callout = defineComponent({
  name: 'Callout',
  props: z.object({ text: z.string(), tone: z.enum(['info', 'success', 'warning', 'danger']).optional(), title: z.string().optional() }),
  description: COMPONENT_NOTES.Callout,
  component: ({ props }) => {
    const tone = props.tone ?? 'info'
    return (
      <div className={`iui-callout iui-callout-${tone}`} role="note">
        <Glyph name={CALLOUT_ICON[tone]} size={16} className="iui-callout-icon" />
        <div className="iui-callout-body">
          {props.title ? <strong>{inline(str(props.title))}</strong> : null}
          <p>{inline(str(props.text))}</p>
        </div>
      </div>
    )
  },
})

export const MathBlock = defineComponent({
  name: 'Math',
  props: z.object({ tex: z.string(), inline: z.boolean().optional() }),
  description: COMPONENT_NOTES.Math,
  component: ({ props }) => {
    const html = katex.renderToString(str(props.tex), { displayMode: !props.inline, throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml' })
    // KaTeX escapes its input and is configured without \href or \includegraphics.
    return props.inline ? <span className="iui-math" dangerouslySetInnerHTML={{ __html: html }} /> : <div className="iui-math is-block" dangerouslySetInnerHTML={{ __html: html }} />
  },
})


// Play
export const Flashcard = defineComponent({
  name: 'Flashcard',
  props: z.object({ front: slot, back: slot, hint: z.string().optional() }),
  description: COMPONENT_NOTES.Flashcard,
  component: function FlashcardView({ props, renderNode }) {
    const tr = useCopy()
    const [flipped, setFlipped] = useState(false)
    const face = (value: unknown) => (typeof value === 'string' ? <span className="iui-flashcard-word">{inline(value)}</span> : renderSlot(value, renderNode))
    return (
      <button type="button" className={cx('iui-flashcard', flipped && 'is-flipped')} aria-pressed={flipped} onClick={() =>{  setFlipped(!flipped) }}>
        <span className="iui-flashcard-inner">
          <span className="iui-flashcard-face is-front" aria-hidden={flipped}>
            {face(props.front)}
            <span className="iui-flashcard-hint">{str(props.hint) || tr('flashcard.hint')}</span>
          </span>
          <span className="iui-flashcard-face is-back" aria-hidden={!flipped}>
            {face(props.back)}
          </span>
        </span>
      </button>
    )
  },
})

const CONFETTI = ['var(--iui-chart-1)', 'var(--iui-chart-2)', 'var(--iui-chart-3)', 'var(--iui-chart-4)', 'var(--iui-chart-5)', 'var(--iui-chart-6)']

export const Celebration = defineComponent({
  name: 'Celebration',
  props: z.object({ when: z.boolean() }),
  description: COMPONENT_NOTES.Celebration,
  component: function CelebrationView({ props }) {
    const streaming = useIsStreaming()
    const [burst, setBurst] = useState(0)
    const was = useRef<boolean | null>(null)
    useEffect(() => {
      if (streaming) return
      const now =  props.when
      if (was.current === false && now) setBurst(n => n + 1)
      was.current = now
    }, [props.when, streaming])
    useEffect(() => {
      if (!burst) return
      const t = setTimeout(() =>{  setBurst(0) }, 2200)
      return () =>{  clearTimeout(t) }
    }, [burst])
    if (!burst || typeof document === 'undefined') return null
    return createPortal(
      <div className="iui-confetti" aria-hidden key={burst}>
        {Array.from({ length: 70 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 10) * 40}ms`,
              animationDuration: `${1200 + ((i * 53) % 900)}ms`,
              ['--x' as string]: `${((i * 71) % 200) - 100}px`,
              ['--r' as string]: `${(i * 97) % 720}deg`,
            }}
          />
        ))}
      </div>,
      document.body,
    )
  },
})
