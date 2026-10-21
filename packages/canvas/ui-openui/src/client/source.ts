/**
 * Source fixes applied to an `openui` program before it reaches the parser.
 *
 * The OpenUI Lang tokenizer accepts only ASCII identifiers and drops any other
 * letter without an error, so `{月份: 1}` loses its key and `row.销售额` its
 * member. Models writing Chinese answers produce both. Quoting such keys keeps
 * the program's meaning: object keys become string keys and member access
 * becomes index access, which the language already supports.
 */

const NAME = /[\p{L}\p{N}_$]+/uy
const KEY_COLON = /\s*:/uy
const NON_ASCII = /[^\u0000-\u007f]/u
const SPACE = /\s/u

/**
 * Quote object keys and member names that contain non-ASCII letters.
 * Text inside string literals is left unchanged; an unterminated string at the
 * end of a streaming prefix stays unterminated.
 * @param code - program text, possibly a streaming prefix.
 * @returns the program with `{名: v}` as `{"名": v}` and `a.名` as `a["名"]`.
 */
export function quoteUnicodeNames(code: string): string {
  let out = ''
  let quote: string | undefined
  let last = ''
  for (let i = 0; i < code.length; i++) {
    const c = code.charAt(i)
    if (quote !== undefined) {
      out += c
      if (c === '\\') {
        out += code.charAt(i + 1)
        i++
      } else if (c === quote) quote = undefined
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      out += c
      last = c
      continue
    }
    const member = c === '.'
    if (member || last === '{' || last === ',') {
      const name = match(NAME, code, member ? i + 1 : i)
      if (name !== undefined && NON_ASCII.test(name)) {
        if (member) {
          out += `[${JSON.stringify(name)}]`
          i += name.length
          last = ']'
          continue
        }
        if (match(KEY_COLON, code, i + name.length) !== undefined) {
          out += JSON.stringify(name)
          i += name.length - 1
          last = '"'
          continue
        }
      }
    }
    out += c
    if (!SPACE.test(c)) last = c
  }
  return out
}

function match(pattern: RegExp, code: string, at: number): string | undefined {
  pattern.lastIndex = at
  return pattern.exec(code)?.[0]
}

const ROOT_STATEMENT = /^\s*root\s*=/mu

/**
 * Whether fence content is an OpenUI program: it assigns the `root` statement.
 * @param code - fence content, possibly a streaming prefix.
 * @returns true once a line starts with `root =`.
 */
export function isProgram(code: string): boolean {
  return ROOT_STATEMENT.test(code)
}
