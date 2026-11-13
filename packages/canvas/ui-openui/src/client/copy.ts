/** Localized copy for library components, supplied by the fence renderer. */
import { createContext, useContext } from 'react'
import type { OpenUIKey } from './locales.ts'

/** Translate one key of this plugin's dictionary. */
export type Translate = (key: OpenUIKey, params?: Record<string, string | number>) => string

/** Copy context; components render inside the fence renderer's provider. */
export const CopyContext = createContext<Translate | null>(null)

/**
 * Read the enclosing copy.
 * @returns the translate function.
 * @throws when a component renders outside the fence renderer.
 */
export function useCopy(): Translate {
  const t = useContext(CopyContext)
  if (t === null) throw new Error('ui-openui: component rendered outside the fence renderer')
  return t
}
