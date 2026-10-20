/**
 * Best-effort parse of a JSON text prefix that may still be streaming.
 * @module @deepseek-ai/dsh-util-values/src/json-prefix
 */
import type { JsonValue } from './index.ts'

/** Container frame: which token the scanner expects next inside it. */
type Frame =
  | { readonly kind: 'object'; expect: 'key' | 'colon' | 'value' | 'comma' }
  | { readonly kind: 'array'; expect: 'value' | 'comma' }

/** A position where the prefix can be cut and closed into valid JSON. */
interface Cut {
  readonly at: number
  readonly suffix: string
}

function closers(stack: readonly Frame[]): string {
  let out = ''
  for (let i = stack.length - 1; i >= 0; i--) out += (stack[i] as Frame).kind === 'object' ? '}' : ']'
  return out
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\n' || c === '\r' || c === '\t'
}

/** Mark the innermost frame as having received one complete value. */
function valueDone(stack: Frame[]): void {
  const top = stack[stack.length - 1]
  if (top !== undefined) top.expect = 'comma'
}

/**
 * Parse the longest prefix of `text` that closes into valid JSON. Completed
 * members are kept, an open string value keeps its received characters, and
 * an incomplete key, number, or literal is dropped.
 * @param text - JSON text, complete or a streaming prefix.
 * @returns the parsed value of the longest closable prefix; undefined when no value has begun or the text is malformed.
 */
export function parseJsonPrefix(text: string): JsonValue | undefined {
  const stack: Frame[] = []
  let cut: Cut | undefined
  let i = 0
  const n = text.length
  const mark = (at: number, extra = ''): void => { cut = { at, suffix: extra + closers(stack) } }
  while (i < n) {
    const c = text[i] as string
    if (isWhitespace(c)) { i++; continue }
    const top = stack[stack.length - 1]
    if (top === undefined && cut !== undefined) break
    const expectsValue = top === undefined || top.expect === 'value'
    if (c === '"') {
      const isKey = top?.kind === 'object' && top.expect === 'key'
      if (!isKey && !expectsValue) return undefined
      let j = i + 1
      let lastSafe = j
      let closed = false
      while (j < n) {
        const d = text[j] as string
        if (d === '\\') {
          const kind = text[j + 1]
          const width = kind === 'u' ? 6 : 2
          if (j + width > n) break
          j += width
          lastSafe = j
          continue
        }
        if (d === '"') { closed = true; break }
        j++
        lastSafe = j
      }
      if (!closed) {
        if (!isKey) mark(lastSafe, '"')
        break
      }
      i = j + 1
      if (isKey) {
        top.expect = 'colon'
      } else {
        valueDone(stack)
        mark(i)
      }
      continue
    }
    if (c === '{' || c === '[') {
      if (!expectsValue) return undefined
      stack.push(c === '{' ? { kind: 'object', expect: 'key' } : { kind: 'array', expect: 'value' })
      i++
      mark(i)
      continue
    }
    if (c === '}' || c === ']') {
      const kind = c === '}' ? 'object' : 'array'
      if (top?.kind !== kind) return undefined
      if (top.expect === 'colon' || (top.expect === 'value' && kind === 'object')) return undefined
      stack.pop()
      valueDone(stack)
      i++
      mark(i)
      continue
    }
    if (c === ':') {
      if (top?.kind !== 'object' || top.expect !== 'colon') return undefined
      top.expect = 'value'
      i++
      continue
    }
    if (c === ',') {
      if (top === undefined || top.expect !== 'comma') return undefined
      top.expect = top.kind === 'object' ? 'key' : 'value'
      i++
      continue
    }
    if (!expectsValue) return undefined
    let j = i
    while (j < n && !isWhitespace(text[j] as string) && !',]}:'.includes(text[j] as string)) j++
    if (j === n) break
    const literal = text.slice(i, j)
    try {
      JSON.parse(literal)
    } catch (_error) {
      // A complete but malformed scalar makes the whole prefix malformed.
      return undefined
    }
    valueDone(stack)
    i = j
    mark(i)
  }
  if (cut === undefined) return undefined
  try {
    return JSON.parse(text.slice(0, cut.at) + cut.suffix) as JsonValue
  } catch (_error) {
    /* v8 ignore next -- cuts land on token boundaries the scanner validated, so the closed text always parses. */
    return undefined
  }
}
