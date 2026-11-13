/** Prop schemas and safe conversions from model-written values to CSS. */
import { tagSchemaId } from '@openuidev/react-lang'
import type { CSSProperties } from 'react'
import { z } from 'zod/v4'

// Safety
// A model-written style value could otherwise load a resource: `background: url(...)`.
const UNSAFE_CSS = /(url|image|image-set|cross-fade|element|expression|paint|var|attr|env)\s*\(|@import|[\\;{}<>]/i
const isSafeCss = (value: string) => !UNSAFE_CSS.test(value)

function protocolOf(value: string): string | null {
  try {
    return new URL(value.trim()).protocol
  } catch {
    return null
  }
}

/**
 * Accept only absolute http(s) URLs; relative URLs would resolve against this app.
 * @param value - model-written URL.
 * @returns the trimmed URL, or null.
 */
export function webUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const protocol = protocolOf(value)
  return protocol === 'http:' || protocol === 'https:' ? value.trim() : null
}

// Shared prop schemas
/** Children slot: any component, or a list of them (from @Each). Printed as `Node[]`. */
const node = z.any()
tagSchemaId(node, 'Node')
/** Children slot schema: components or lists of them. */
export const children = z.array(node)

/** A token or a CSS color. Printed once as `Color` and explained in the prompt notes. */
export const color = z.string()
tagSchemaId(color, 'Color')

/** A px number or a CSS length such as "50%". Printed as `Length`. */
export const length = z.union([z.number(), z.string()])
tagSchemaId(length, 'Length')

/** Radius schema: a named radius or px. */
export const radiusSchema = z.union([z.enum(['sm', 'md', 'lg', 'xl', 'full']), z.number()])
tagSchemaId(radiusSchema, 'Radius')

/** Option schema: a string or a value/label pair. */
export const option = z.union([z.string(), z.object({ value: z.string(), label: z.string() })])
/** One option of a choice control. */
export type Option = z.infer<typeof option>
/**
 * Normalize an option to a value/label pair.
 * @param o - option.
 * @returns the pair.
 */
export const toOption = (o: Option): { value: string; label: string } => (typeof o === 'string' ? { value: o, label: o } : o)

// Values to CSS
const STATUS = ['info', 'success', 'warning', 'danger', 'purple', 'pink'] as const
const FOREGROUND: Record<string, string> = {
  ink: 'var(--iui-ink)',
  muted: 'var(--iui-muted)',
  faint: 'var(--iui-faint)',
  canvas: 'var(--iui-canvas)',
  surface: 'var(--iui-surface)',
  ...Object.fromEntries(STATUS.map(s => [s, `var(--iui-${s})`])),
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`chart${i + 1}`, `var(--iui-chart-${i + 1})`])),
}
const BACKGROUND: Record<string, string> = {
  ...FOREGROUND,
  surface: 'var(--iui-surface)',
  'surface-strong': 'var(--iui-surface-strong)',
  border: 'var(--iui-border)',
  ...Object.fromEntries(STATUS.map(s => [s, `var(--iui-${s}-soft)`])),
}

const cssValue = (value: unknown) => (typeof value === 'string' && value.trim() && isSafeCss(value) ? value.trim() : undefined)

/**
 * Text, icon and stroke colors: a token or a CSS color.
 * @param value - model-written color.
 * @returns the CSS color, or undefined for an unsafe or missing value.
 */
export const fg = (value: unknown): string | undefined => (typeof value === 'string' ? (FOREGROUND[value] ?? cssValue(value)) : undefined)
/**
 * Backgrounds: status tokens become their soft tints.
 * @param value - model-written color.
 * @returns the CSS background, or undefined for an unsafe or missing value.
 */
export const bg = (value: unknown): string | undefined => (typeof value === 'string' ? (BACKGROUND[value] ?? cssValue(value)) : undefined)

/**
 * Text color for a model-chosen CSS color background (hex or rgb). Raw colors
 * do not follow the theme, so text on them is set dark or light to stay legible.
 */
function contrastOn(background: unknown): string | undefined {
  if (typeof background !== 'string' || background in BACKGROUND) return undefined
  let rgb: number[] | null = null
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(background.trim())?.[1]
  if (hex !== undefined) {
    const h = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex
    rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  } else {
    const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(background.trim())
    if (m) rgb = [m[1], m[2], m[3]].map(Number)
  }
  if (!rgb) return undefined
  const [r = 0, g = 0, b = 0] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.36 ? '#0d0d0d' : '#ffffff'
}

/**
 * Style for content on a raw-color background: text tokens switch to the readable color.
 * @param background - model-written background color.
 * @returns text-token overrides for that background.
 */
export function onColor(background: unknown): CSSProperties {
  const ink = contrastOn(background)
  if (!ink) return {}
  return {
    color: ink,
    '--iui-ink': ink,
    '--iui-muted': `color-mix(in srgb, ${ink} 72%, transparent)`,
    '--iui-faint': `color-mix(in srgb, ${ink} 55%, transparent)`,
  } as CSSProperties
}

/**
 * Spacing in 4px steps.
 * @param value - step count.
 * @returns the CSS length, or undefined.
 */
export const space = (value: unknown): string | undefined => (typeof value === 'number' && Number.isFinite(value) ? `${Math.max(0, value) * 4}px` : undefined)

/**
 * A px number or a safe CSS length.
 * @param value - model-written length.
 * @returns the CSS length, or undefined.
 */
export function size(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return `${Math.max(0, value)}px`
  if (typeof value !== 'string') return undefined
  if (/^\d+(\.\d+)?$/.test(value.trim())) return `${value.trim()}px`
  return /^\d+(\.\d+)?(px|%|em|rem|vh|vw|fr)$|^auto$/.test(value.trim()) ? value.trim() : undefined
}

const RADIUS: Record<string, string> = {
  sm: 'var(--iui-radius-sm)',
  md: 'var(--iui-radius-md)',
  lg: 'var(--iui-radius-lg)',
  xl: 'var(--iui-radius-xl)',
  full: '999px',
}
/**
 * A named radius or a length.
 * @param value - model-written radius.
 * @returns the CSS radius, or undefined.
 */
export const radius = (value: unknown): string | undefined => (typeof value === 'string' ? RADIUS[value] : size(value))

/**
 * Join class names, skipping empty ones.
 * @param names - candidate class names.
 * @returns the class attribute, or undefined when none remain.
 */
export const cx = (...names: (string | false | null | undefined)[]): string | undefined => names.filter(Boolean).join(' ') || undefined

/**
 * A short plain-text name for an element, from its rendered text, for action messages.
 * @param element - rendered element.
 * @returns at most 120 characters of its text.
 */
export const textOf = (element: HTMLElement | null): string => (element?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
