import { describe, expect, it } from 'vitest'
import { evaluateFormula, FormulaError, formulaNames, parseFormula } from '../src/index.ts'

const run = (source: string, values: Record<string, number> = {}): number => evaluateFormula(parseFormula(source), values)

describe('calculator formulas', () => {
  it('follows arithmetic precedence and associativity', () => {
    expect(run('1 + 2 * 3')).toBe(7)
    expect(run('(1 + 2) * 3')).toBe(9)
    expect(run('2 ^ 3 ^ 2')).toBe(512)
    expect(run('-2 ^ 2')).toBe(-4)
    expect(run('+4 - 10 % 4 / 2')).toBe(3)
    expect(run('1.5e2 + .5')).toBe(150.5)
  })

  it('reads input values and lists the names a formula uses', () => {
    expect(run('users * price * 12', { users: 100, price: 9.9 })).toBeCloseTo(11880)
    expect(formulaNames(parseFormula('max(a, b) + a * c ? d : -e'))).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(run('missing + 1')).toBeNaN()
  })

  it('evaluates comparisons, logic, and conditionals as numbers', () => {
    expect(run('3 > 2 && 2 >= 2 && 1 < 2 && 2 <= 2 && 1 == 1 && 1 != 2')).toBe(1)
    expect(run('0 || 0')).toBe(0)
    expect([run('2 > 3'), run('3 < 2'), run('3 <= 2'), run('2 >= 3'), run('1 == 2'), run('1 != 1')]).toEqual([0, 0, 0, 0, 0, 0])
    expect(formulaNames(parseFormula('2 * 3'))).toEqual([])
    expect(run('0 || 5')).toBe(1)
    expect(run('2 || 0')).toBe(1)
    expect(run('0 && 1')).toBe(0)
    expect(run('1 && 0')).toBe(0)
    expect(run('!0 + !3')).toBe(1)
    expect(run('x > 10 ? 1 : x > 5 ? 2 : 3', { x: 7 })).toBe(2)
    expect(run('x ? 1 : 0', { x: Number.NaN })).toBe(0)
  })

  it('implements every function', () => {
    expect(run('min(3, 1, 2) + max(1, 4)')).toBe(5)
    expect(run('round(3.14159, 2)')).toBe(3.14)
    expect(run('round(2.5)')).toBe(3)
    expect(run('floor(2.7) + ceil(2.1) + abs(-1)')).toBe(6)
    expect(run('sqrt(16) + pow(2, 3)')).toBe(12)
    expect(run('log(exp(2))')).toBeCloseTo(2)
    expect(run('clamp(15, 0, 10) + clamp(-1, 0, 10)')).toBe(10)
  })

  it('reports the position of malformed formulas', () => {
    const failure = (source: string): FormulaError => {
      try { parseFormula(source) } catch (error) { return error as FormulaError }
      throw new Error(`parsed ${source}`)
    }
    expect(failure('1 +').message).toBe('unexpected end of formula')
    expect(failure('1 $ 2')).toMatchObject({ message: 'unexpected character "$"', at: 2 })
    expect(failure('(1 + 2')).toMatchObject({ message: 'expected ")"', at: 6 })
    expect(failure('nope(1)').message).toBe('unknown function "nope"')
    expect(failure('pow(1)').message).toBe('"pow" takes 2 argument(s)')
    expect(failure('round()').message).toBe('"round" takes 1 to 2 argument(s)')
    expect(failure('1 2').message).toBe('unexpected text after the formula')
    expect(failure('* 2').message).toBe('unexpected "*"')
    expect(failure('1 ? 2').message).toBe('expected ":"')
    expect(failure('x'.repeat(401)).message).toBe('formula exceeds 400 characters')
    expect(failure('1 +')).toBeInstanceOf(FormulaError)
    expect(failure('1 +').name).toBe('FormulaError')
  })
})
