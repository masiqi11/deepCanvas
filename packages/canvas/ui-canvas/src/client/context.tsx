/** Render-time services shared by every canvas component. */
import { createContext, useContext, type ReactNode } from 'react'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { CanvasSource } from '@deepseek-ai/dsh-canvas-spec'
import type { CanvasKey } from './locales.ts'

/** Translate one key of this plugin's dictionary. */
export type Translate = (key: CanvasKey, params?: Record<string, string | number>) => string

/** Services a canvas tree reads while rendering. */
export interface CanvasEnvironment {
  readonly t: Translate
  /** Registered sources by id, for citations and source links. */
  readonly sources: ReadonlyMap<string, CanvasSource>
  /** Send a follow-up prompt to the agent; absent where no agent is reachable. */
  readonly sendPrompt?: ((prompt: string) => void) | undefined
  /** Put text into the composer without sending it, for requests from untrusted frames. */
  readonly draftPrompt?: ((prompt: string) => void) | undefined
  /** Labels the Markdown primitive needs; reference-stable per locale. */
  readonly markdownLabels: MarkdownLabels
  /** Whether entrance animations may play. */
  readonly animate: boolean
}

const CanvasContext = createContext<CanvasEnvironment | null>(null)

/**
 * Provide canvas services to a component tree.
 * @param props - environment and children.
 * @returns the provider element.
 */
export function CanvasProvider({ value, children }: { value: CanvasEnvironment; children: ReactNode }) {
  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
}

/**
 * Read the canvas services of the enclosing tree.
 * @returns the environment.
 * @throws when rendered outside a CanvasProvider.
 */
export function useCanvas(): CanvasEnvironment {
  const value = useContext(CanvasContext)
  if (value === null) throw new Error('ui-canvas: component rendered outside CanvasProvider')
  return value
}

/**
 * Index sources by id; later duplicates do not replace earlier entries.
 * @param lists - source lists in priority order.
 * @returns the id map.
 */
export function sourceMap(...lists: ReadonlyArray<readonly CanvasSource[] | undefined>): Map<string, CanvasSource> {
  const map = new Map<string, CanvasSource>()
  for (const list of lists) for (const source of list ?? []) if (!map.has(source.id)) map.set(source.id, source)
  return map
}

/**
 * Look up a CSS module class by a computed name.
 * @param classes - the CSS module class map.
 * @param name - local class name.
 * @returns the hashed class, or an empty string for a name the module does not define.
 */
export function moduleClass(classes: Readonly<Record<string, string>>, name: string): string {
  return classes[name] ?? ''
}

/**
 * Format a number for display, compacting large magnitudes.
 * @param value - number to format.
 * @param locale - BCP 47 locale.
 * @param decimals - fixed fraction digits, when given.
 * @returns the formatted number; an em dash for non-finite values.
 */
export function formatNumber(value: number, locale: string, decimals?: number): string {
  if (!Number.isFinite(value)) return '—'
  if (decimals !== undefined) {
    const digits = Math.min(Math.max(Math.trunc(decimals), 0), 10)
    return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
  }
  const compact = Math.abs(value) >= 100_000
  return new Intl.NumberFormat(locale, compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 2 }).format(value)
}

/**
 * Open an http(s) URL in a new browsing context without granting it the opener.
 * @param url - destination; other schemes are ignored.
 */
export function openExternal(url: string): void {
  if (!/^https?:\/\//i.test(url)) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
