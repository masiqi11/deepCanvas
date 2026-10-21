import { defineComponent, useIsStreaming } from '@openuidev/react-lang'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod/v4'
import { useColorScheme } from './scheme.ts'
import { useCopy } from '../copy.ts'
import { COMPONENT_NOTES } from './notes.ts'

// The page runs in a sandboxed iframe: scripts only, an opaque origin (no
// allow-same-origin, so no access to this app, its cookies or storage), no
// forms, popups or navigation of the app. Its CSP allows inline code and
// inline media only, so the page reaches no network.
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'font-src data:',
  'img-src data: blob:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ')

const MIN_HEIGHT = 80
const MAX_HEIGHT = 2400
const AUTO_START = 360

// Reports the content height to the parent, so the view fits the page. The
// parent can ask again ("iui-html-view-measure"): a server-rendered frame may
// report before the app is listening.
const REPORTER = '<script>(function(){var last=0;function send(){var h=Math.ceil(document.documentElement.getBoundingClientRect().height);if(Math.abs(h-last)>1){last=h;parent.postMessage({type:"iui-html-view-height",height:h},"*")}}addEventListener("message",function(e){if(e.source===parent&&e.data==="iui-html-view-measure"){last=0;send()}});addEventListener("load",send);new ResizeObserver(send).observe(document.documentElement);send()})()</script>'

function documentFor(html: string, scheme: 'light' | 'dark') {
  // The policy comes first, so it covers everything in the model's markup.
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:${scheme}}html,body{margin:0}body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}</style>${REPORTER}${html}`
}

export const HtmlView = defineComponent({
  name: 'HtmlView',
  props: z.object({
    html: z.string(),
    height: z.number().optional(),
    title: z.string().optional(),
  }),
  description: COMPONENT_NOTES.HtmlView,
  component: function HtmlViewView({ props }) {
    const tr = useCopy()
    const streaming = useIsStreaming()
    const frame = useRef<HTMLIFrameElement>(null)
    const box = useRef<HTMLDivElement>(null)
    const scheme = useColorScheme(box)
    const fixed = typeof props.height === 'number' && props.height > 0 ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, props.height)) : null
    const [measured, setMeasured] = useState<number | null>(null)
    const html = typeof props.html === 'string' ? props.html : ''
    const srcDoc = useMemo(() => documentFor(html, scheme), [html, scheme])

    useEffect(() => {
      if (fixed) return
      const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.current?.contentWindow) return
        const data = event.data as { type?: unknown; height?: unknown }
        if (data?.type === 'iui-html-view-height' && typeof data.height === 'number' && Number.isFinite(data.height)) {
          setMeasured(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, data.height)))
        }
      }
      window.addEventListener('message', onMessage)
      frame.current?.contentWindow?.postMessage('iui-html-view-measure', '*')
      return () =>{  window.removeEventListener('message', onMessage) }
    }, [fixed])

    // A page that is still streaming would reload on every chunk; it runs once complete.
    const height = fixed ?? measured ?? AUTO_START
    return (
      <div ref={box} className="iui-html-view" style={{ height }}>
        {streaming ? (
          <div className="iui-html-view-wait">{tr('html.preparing')}</div>
        ) : (
          <iframe ref={frame} title={props.title || tr('html.title')} sandbox="allow-scripts" srcDoc={srcDoc} referrerPolicy="no-referrer" loading="lazy" />
        )}
      </div>
    )
  },
})
