import { defineComponent } from '@openuidev/react-lang'
import ImageIcon from 'lucide-react/dist/esm/icons/image.mjs'
import { useState } from 'react'
import { z } from 'zod/v4'
import { Glyph } from '../glyph.tsx'
import { color, cx, fg, radius, radiusSchema, webUrl } from './style.ts'
import { COMPONENT_NOTES } from './notes.ts'

const ICON_SIZE = { sm: 14, md: 18, lg: 24, xl: 32 } as const

export const Icon = defineComponent({
  name: 'Icon',
  props: z.object({
    name: z.string(),
    size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
    color: color.optional(),
  }),
  description: COMPONENT_NOTES.Icon,
  component: ({ props }) => (
    <span className="iui-icon" style={{ color: fg(props.color) }}>
      <Glyph name={props.name} size={ICON_SIZE[props.size ?? 'md']} />
    </span>
  ),
})

type PhotoProps = { alt: string; src: string; aspectRatio?: number | undefined; radius?: unknown; fit?: string | undefined }

/** A photo from an http(s) URL; a failed or unsafe URL shows a neutral placeholder. */
function Photo(props: PhotoProps) {
  const alt = typeof props.alt === 'string' ? props.alt.trim() : ''
  const src = webUrl(props.src)
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const current = src !== null && src !== failed ? src : null
  const ratio = typeof props.aspectRatio === 'number' && props.aspectRatio > 0.2 && props.aspectRatio < 5 ? props.aspectRatio : 1.5
  return (
    <div
      className={cx('iui-image', props.fit === 'contain' && 'is-contain', loaded !== null && loaded === current && 'is-loaded')}
      style={{ aspectRatio: ratio, borderRadius: radius(props.radius ?? 'lg') }}
      role={current ? undefined : 'img'}
      aria-label={current ? undefined : alt}
    >
      {current ? (
        <img
          key={current}
          src={current}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() =>{  setLoaded(current) }}
          onError={() =>{  setFailed(current) }}
        />
      ) : (
        <ImageIcon aria-hidden className="iui-image-empty" strokeWidth={1.5} />
      )}
    </div>
  )
}

const fit = z.enum(['cover', 'contain']).optional()

export const Image = defineComponent({
  name: 'Image',
  props: z.object({ src: z.string(), alt: z.string(), aspectRatio: z.number().optional(), radius: radiusSchema.optional(), fit }),
  description: COMPONENT_NOTES.Image,
  component: ({ props }) => <Photo alt={props.alt} src={props.src} aspectRatio={props.aspectRatio} radius={props.radius} fit={props.fit} />,
})
