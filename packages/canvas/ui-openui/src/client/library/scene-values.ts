/** Schemas and conversions for values the model writes into scene components. */
import { z } from 'zod/v4'

/** Text the model may write as a number, such as a year or a count. */
export const label = z.union([z.string(), z.number()])

/** A number the model may write as a string, such as "3". */
export const amount = z.union([z.number(), z.string()])

/**
 * Display text of a model-written label.
 * @param value - a string, a number, or nothing while the value streams in.
 * @returns the text; empty for nothing.
 */
export const textOf = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '')

/**
 * Read a model-written amount.
 * @param value - a number, or a string holding one such as "3" or " 4.5 ".
 * @returns the number, or null when the value holds no finite number.
 */
export function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}
