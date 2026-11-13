/**
 * Arithmetic formulas for calculator outputs. A formula is parsed into a
 * tree once and evaluated against named numbers; no host code runs.
 *
 * Grammar: numbers, input ids, `+ - * / % ^`, comparisons `< <= > >= == !=`,
 * `&& || !`, `cond ? a : b`, parentheses, and the functions
 * `min max round floor ceil abs sqrt pow log exp clamp`.
 * @module @deepseek-ai/dsh-canvas-spec/formula
 */

/** Parsed formula tree. */
export type FormulaNode =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'unary'; readonly op: '-' | '+' | '!'; readonly arg: FormulaNode }
  | { readonly kind: 'binary'; readonly op: string; readonly left: FormulaNode; readonly right: FormulaNode }
  | { readonly kind: 'ternary'; readonly test: FormulaNode; readonly yes: FormulaNode; readonly no: FormulaNode }
  | { readonly kind: 'call'; readonly fn: string; readonly args: readonly FormulaNode[] }

/** Function name to arity range and implementation. */
const FUNCTIONS: Readonly<Record<string, { readonly min: number; readonly max: number; readonly run: (args: number[]) => number }>> = {
  min: { min: 1, max: 32, run: args => Math.min(...args) },
  max: { min: 1, max: 32, run: args => Math.max(...args) },
  round: {
    min: 1, max: 2, run: ([x = 0, digits = 0]) => {
      const scale = 10 ** Math.trunc(digits)
      return Math.round(x * scale) / scale
    },
  },
  floor: { min: 1, max: 1, run: ([x = 0]) => Math.floor(x) },
  ceil: { min: 1, max: 1, run: ([x = 0]) => Math.ceil(x) },
  abs: { min: 1, max: 1, run: ([x = 0]) => Math.abs(x) },
  sqrt: { min: 1, max: 1, run: ([x = 0]) => Math.sqrt(x) },
  pow: { min: 2, max: 2, run: ([x = 0, y = 0]) => x ** y },
  log: { min: 1, max: 1, run: ([x = 0]) => Math.log(x) },
  exp: { min: 1, max: 1, run: ([x = 0]) => Math.exp(x) },
  clamp: { min: 3, max: 3, run: ([x = 0, lo = 0, hi = 0]) => Math.min(Math.max(x, lo), hi) },
}

/** Binary operator precedence; higher binds tighter. `^` is right-associative. */
const PRECEDENCE: Readonly<Record<string, number>> = {
  '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '^': 8,
}

const MAX_FORMULA_LENGTH = 400

type Token =
  | { readonly kind: 'number'; readonly value: number; readonly at: number }
  | { readonly kind: 'name'; readonly name: string; readonly at: number }
  | { readonly kind: 'op'; readonly op: string; readonly at: number }

/** A formula that does not parse, with the character position of the problem. */
export class FormulaError extends Error {
  /**
   * @param message - problem description.
   * @param at - zero-based character index in the formula.
   */
  constructor(message: string, readonly at: number) {
    super(message)
    this.name = 'FormulaError'
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const c = source[i] as string
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i))
    if (number !== null) {
      tokens.push({ kind: 'number', value: Number(number[0]), at: i })
      i += number[0].length
      continue
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))
    if (name !== null) {
      tokens.push({ kind: 'name', name: name[0], at: i })
      i += name[0].length
      continue
    }
    const two = source.slice(i, i + 2)
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ kind: 'op', op: two, at: i })
      i += 2
      continue
    }
    if ('+-*/%^()<>!?:,'.includes(c)) {
      tokens.push({ kind: 'op', op: c, at: i })
      i++
      continue
    }
    throw new FormulaError(`unexpected character "${c}"`, i)
  }
  return tokens
}

/**
 * Parse a formula.
 * @param source - formula text.
 * @returns the parsed tree.
 * @throws FormulaError when the text is not a valid formula.
 */
export function parseFormula(source: string): FormulaNode {
  if (source.length > MAX_FORMULA_LENGTH) throw new FormulaError(`formula exceeds ${MAX_FORMULA_LENGTH} characters`, MAX_FORMULA_LENGTH)
  const tokens = tokenize(source)
  let pos = 0
  const peek = (): Token | undefined => tokens[pos]
  const isOp = (token: Token | undefined, op: string): boolean => token?.kind === 'op' && token.op === op
  const expectOp = (op: string): void => {
    const token = peek()
    if (!isOp(token, op)) throw new FormulaError(`expected "${op}"`, token?.at ?? source.length)
    pos++
  }
  const primary = (): FormulaNode => {
    const token = peek()
    if (token === undefined) throw new FormulaError('unexpected end of formula', source.length)
    pos++
    if (token.kind === 'number') return { kind: 'number', value: token.value }
    if (token.kind === 'name') {
      if (!isOp(peek(), '(')) return { kind: 'name', name: token.name }
      const fn = FUNCTIONS[token.name]
      if (fn === undefined) throw new FormulaError(`unknown function "${token.name}"`, token.at)
      pos++
      const args: FormulaNode[] = []
      if (!isOp(peek(), ')')) {
        args.push(expression())
        while (isOp(peek(), ',')) { pos++; args.push(expression()) }
      }
      expectOp(')')
      if (args.length < fn.min || args.length > fn.max) throw new FormulaError(`"${token.name}" takes ${fn.min === fn.max ? fn.min : `${fn.min} to ${fn.max}`} argument(s)`, token.at)
      return { kind: 'call', fn: token.name, args }
    }
    if (token.op === '(') {
      const inner = expression()
      expectOp(')')
      return inner
    }
    if (token.op === '-' || token.op === '+' || token.op === '!') return { kind: 'unary', op: token.op, arg: binary(7) }
    throw new FormulaError(`unexpected "${token.op}"`, token.at)
  }
  const binary = (minPrecedence: number): FormulaNode => {
    let left = primary()
    while (true) {
      const token = peek()
      if (token?.kind !== 'op') break
      const precedence = PRECEDENCE[token.op]
      if (precedence === undefined || precedence < minPrecedence) break
      pos++
      const right = binary(token.op === '^' ? precedence : precedence + 1)
      left = { kind: 'binary', op: token.op, left, right }
    }
    return left
  }
  const expression = (): FormulaNode => {
    const test = binary(1)
    if (!isOp(peek(), '?')) return test
    pos++
    const yes = expression()
    expectOp(':')
    return { kind: 'ternary', test, yes, no: expression() }
  }
  const tree = expression()
  const rest = peek()
  if (rest !== undefined) throw new FormulaError('unexpected text after the formula', rest.at)
  return tree
}

/**
 * List the variable names a formula reads.
 * @param node - parsed formula.
 * @returns names in first-use order without duplicates.
 */
export function formulaNames(node: FormulaNode): string[] {
  const names: string[] = []
  const visit = (current: FormulaNode): void => {
    switch (current.kind) {
      case 'number': return
      case 'name': if (!names.includes(current.name)) names.push(current.name); return
      case 'unary': visit(current.arg); return
      case 'binary': visit(current.left); visit(current.right); return
      case 'ternary': visit(current.test); visit(current.yes); visit(current.no); return
      case 'call': current.args.forEach(visit); return
    }
  }
  visit(node)
  return names
}

function truth(value: number): boolean {
  return value !== 0 && !Number.isNaN(value)
}

/**
 * Evaluate a parsed formula. Unknown names read as NaN.
 * @param node - parsed formula.
 * @param values - variable values by name.
 * @returns the numeric result; NaN or Infinity when the arithmetic produces them.
 */
export function evaluateFormula(node: FormulaNode, values: Readonly<Record<string, number>>): number {
  switch (node.kind) {
    case 'number': return node.value
    case 'name': return Object.hasOwn(values, node.name) ? values[node.name] as number : Number.NaN
    case 'unary': {
      const arg = evaluateFormula(node.arg, values)
      return node.op === '-' ? -arg : node.op === '+' ? arg : truth(arg) ? 0 : 1
    }
    case 'ternary':
      return truth(evaluateFormula(node.test, values)) ? evaluateFormula(node.yes, values) : evaluateFormula(node.no, values)
    case 'call':
      return (FUNCTIONS[node.fn] as (typeof FUNCTIONS)[string]).run(node.args.map(arg => evaluateFormula(arg, values)))
    case 'binary': {
      const left = evaluateFormula(node.left, values)
      if (node.op === '&&') return truth(left) ? (truth(evaluateFormula(node.right, values)) ? 1 : 0) : 0
      if (node.op === '||') return truth(left) ? 1 : (truth(evaluateFormula(node.right, values)) ? 1 : 0)
      const right = evaluateFormula(node.right, values)
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return left / right
        case '%': return left % right
        case '^': return left ** right
        case '<': return left < right ? 1 : 0
        case '<=': return left <= right ? 1 : 0
        case '>': return left > right ? 1 : 0
        case '>=': return left >= right ? 1 : 0
        case '==': return left === right ? 1 : 0
        default: return left !== right ? 1 : 0
      }
    }
  }
}
