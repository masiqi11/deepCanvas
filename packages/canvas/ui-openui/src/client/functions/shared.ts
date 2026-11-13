import { z } from 'zod/v4'

/** Shared argument schemas and helpers for the library functions. */

/**
 * Schema of a list argument of any items.
 * @returns a fresh schema.
 */
export const list = (): z.ZodArray<z.ZodAny> => z.array(z.any())
/**
 * Schema of a list of numbers.
 * @returns a fresh schema.
 */
export const numbers = (): z.ZodArray<z.ZodNumber> => z.array(z.number())
/**
 * Schema of a date: a `YYYY-MM-DD` string, an ISO date-time, or a timestamp.
 * @returns a fresh schema.
 */
export const date = (): z.ZodUnion<[z.ZodString, z.ZodNumber]> => z.union([z.string(), z.number()])
/**
 * Schema of an aggregation name.
 * @returns a fresh schema.
 */
export const agg = (): z.ZodEnum<{ sum: 'sum'; avg: 'avg'; count: 'count'; min: 'min'; max: 'max' }> =>
  z.enum(['sum', 'avg', 'count', 'min', 'max'])

/**
 * Read `field` from a row, with dot paths; "" is the item itself, like @Filter.
 * @param item - row or value.
 * @param field - field name or dot path.
 * @returns the field value, or undefined when a step is missing.
 */
export function read(item: unknown, field: string): unknown {
  if (!field) return item
  let cur: unknown = item
  for (const key of field.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

/**
 * Equality by value: lists and objects compare item by item, and a number
 * matches its string form (ids from inputs are often strings).
 * @param a - first value.
 * @param b - second value.
 * @returns whether the values are equal.
 */
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  const mixed = (typeof a === 'number' && typeof b === 'string') || (typeof a === 'string' && typeof b === 'number')
  if (mixed) return String(a) === String(b)
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => same(x, (b as unknown[])[i]))
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && same(left[k], right[k]))
}

/**
 * A finite number or a thrown error, which the runtime turns into null.
 * @param value - computed number.
 * @returns the number when finite.
 * @throws when the number is not finite.
 */
export function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error('result is not a finite number')
  return value
}

/**
 * Read a number from a number or numeric string.
 * @param value - cell value.
 * @returns the finite number, or null.
 */
export function toNum(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Aggregation applied to the numbers read from rows. */
export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max'

/**
 * Aggregate the numbers read from rows; count counts rows.
 * @param rows - rows to read.
 * @param field - field to aggregate; ignored by count.
 * @param how - aggregation.
 * @returns the aggregate, or 0 when no row has a number.
 */
export function aggregate(rows: unknown[], field: string | undefined, how: Agg): number {
  if (how === 'count') return rows.length
  const values = rows.map(r => toNum(read(r, field ?? ''))).filter((v): v is number => v !== null)
  if (!values.length) return 0
  switch (how) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
  }
}

/**
 * Group items by a key in first-seen order.
 * @param rows - items to group.
 * @param key - field holding the group key.
 * @returns groups keyed by value; a missing key groups under "Unknown".
 */
export function groups(rows: unknown[], key: string): Map<string | number, unknown[]> {
  const out = new Map<string | number, unknown[]>()
  for (const row of rows) {
    const raw = read(row, key)
    const k = typeof raw === 'number' ? raw : raw == null || raw === '' ? 'Unknown' : String(raw)
    const bucket = out.get(k)
    if (bucket) bucket.push(row)
    else out.set(k, [row])
  }
  return out
}

/** Largest list a function produces, so a page cannot build an unbounded list. */
export const MAX_ITEMS = 10000
