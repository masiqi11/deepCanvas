/** Non-ASCII object keys and members survive the OpenUI tokenizer once quoted. */
import { describe, expect, it } from 'vitest'
import { isProgram, quoteUnicodeNames } from '../src/client/source.ts'

describe('quoteUnicodeNames', () => {
  it('quotes non-ASCII object keys and turns member access into index access', () => {
    expect(quoteUnicodeNames('rows = @Each(sales, "d", {月: d.m, 销售额: d.v})')).toBe('rows = @Each(sales, "d", {"月": d.m, "销售额": d.v})')
    expect(quoteUnicodeNames('t = row.销售额 + rows[0].月份')).toBe('t = row["销售额"] + rows[0]["月份"]')
    expect(quoteUnicodeNames('o = {\n  名称 : 1 }')).toBe('o = {\n  "名称" : 1 }')
  })

  it('leaves ASCII names, numbers, strings, and ternaries unchanged', () => {
    const code = 'x = {a: 1, b2: 3.5}\ny = ok ? "月: 1, {名: 2}" : \'.销售\'\nz = "say \\"月: x\\"" + d.v'
    expect(quoteUnicodeNames(code)).toBe(code)
    expect(quoteUnicodeNames('w = [1, 月]')).toBe('w = [1, 月]')
  })

  it('keeps a streaming prefix with an open string as it is', () => {
    expect(quoteUnicodeNames('a = {名: "未完')).toBe('a = {"名": "未完')
    expect(quoteUnicodeNames('a = "x\\')).toBe('a = "x\\')
  })

  it('recognizes an OpenUI program by its root statement', () => {
    expect(isProgram('head = Title("x")\nroot = Col([head])')).toBe(true)
    expect(isProgram('for i in range(3):\n  root=1')).toBe(true)
    expect(isProgram('print("root = no")')).toBe(false)
  })
})
