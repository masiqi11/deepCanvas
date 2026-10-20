/** Isolated frame for html blocks: the host side of the canvas bridge. */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HtmlBlock } from '@deepseek-ai/dsh-canvas-spec'
import { openExternal, useCanvas } from './context.tsx'
import { frameDocument, MAX_HEIGHT, MIN_HEIGHT, parseBridgeMessage } from './bridge.ts'
import css from './Canvas.module.css'

/**
 * Render an html block in its isolated frame.
 * @param props - the validated block.
 * @returns the framed page with its error notice.
 */
export function HtmlFrame({ block }: { block: HtmlBlock }) {
  const { t, sources, sendPrompt, draftPrompt } = useCanvas()
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(() => Math.min(Math.max(block.height ?? 360, MIN_HEIGHT), MAX_HEIGHT))
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const srcDoc = useMemo(() => frameDocument(block.html), [block.html])
  const allowed = useMemo(() => new Set([...sources.values()].map(source => source.url)), [sources])
  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (frame.current === null || event.source !== frame.current.contentWindow) return
      const message = parseBridgeMessage(event.data)
      if (message === undefined) return
      switch (message.type) {
        case 'resize': setHeight(Math.min(Math.max(message.height, MIN_HEIGHT), MAX_HEIGHT)); return
        case 'error': setError(message.message); return
        case 'prompt': draftPrompt?.(message.text); return
        case 'open-source':
          if (allowed.has(message.url)) openExternal(message.url)
          else setNotice(t('html.blockedLink'))
          return
      }
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [allowed, draftPrompt, t])
  return (
    <figure className={css.htmlBlock}>
      {block.title !== undefined && <figcaption className={css.chartTitle}>{block.title}</figcaption>}
      <iframe ref={frame} className={css.frame} title={block.title ?? t('html.title')} sandbox="allow-scripts"
        referrerPolicy="no-referrer" srcDoc={srcDoc} style={{ height }} />
      {error !== null && (
        <div className={`${css.callout} ${css.tone_danger}`} role="alert">
          <span>{t('html.error', { message: error })}</span>
          {sendPrompt !== undefined && (
            <button type="button" className={css.action} onClick={() => { sendPrompt(t('html.fixPrompt', { message: error })) }}>{t('html.fix')}</button>
          )}
        </div>
      )}
      {notice !== null && <p className={css.muted} role="status">{notice}</p>}
    </figure>
  )
}
