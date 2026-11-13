import { describe, expect, it } from 'vitest'
import { PartialArguments, parseJsonPrefix } from '../src/index.ts'

describe('parseJsonPrefix', () => {
  it('parses complete values unchanged', () => {
    expect(parseJsonPrefix('{"a":[1,2,{"b":"c"}],"d":null}')).toEqual({ a: [1, 2, { b: 'c' }], d: null })
    expect(parseJsonPrefix(' 42 ')).toBe(42)
    expect(parseJsonPrefix('"x"')).toBe('x')
    expect(parseJsonPrefix('[true,false]')).toEqual([true, false])
  })

  it('closes open containers after the last complete member', () => {
    expect(parseJsonPrefix('[{"type":"markdown","text":"hi"},{"type":"st')).toEqual([{ type: 'markdown', text: 'hi' }, { type: 'st' }])
    expect(parseJsonPrefix('{"a":1,')).toEqual({ a: 1 })
    expect(parseJsonPrefix('{"a":1,"b"')).toEqual({ a: 1 })
    expect(parseJsonPrefix('{"a":1,"b":')).toEqual({ a: 1 })
    expect(parseJsonPrefix('[1,2')).toEqual([1])
    expect(parseJsonPrefix('{"a":[')).toEqual({ a: [] })
    expect(parseJsonPrefix('[')).toEqual([])
  })

  it('keeps the received characters of an open string value', () => {
    expect(parseJsonPrefix('{"text":"Hello wor')).toEqual({ text: 'Hello wor' })
    expect(parseJsonPrefix('["a\\nb')).toEqual(['a\nb'])
    expect(parseJsonPrefix('["ab\\')).toEqual(['ab'])
    expect(parseJsonPrefix('["ab\\u00')).toEqual(['ab'])
    expect(parseJsonPrefix('["ab\\u0041c')).toEqual(['abAc'])
    expect(parseJsonPrefix('"open')).toBe('open')
  })

  it('answers undefined before a value begins or for malformed text', () => {
    expect(parseJsonPrefix('')).toBeUndefined()
    expect(parseJsonPrefix('  ')).toBeUndefined()
    expect(parseJsonPrefix('{"a"')).toEqual({})
    expect(parseJsonPrefix('tru')).toBeUndefined()
    expect(parseJsonPrefix('{"a":1}}')).toEqual({ a: 1 })
    expect(parseJsonPrefix('[1]x')).toEqual([1])
    expect(parseJsonPrefix('{1}')).toBeUndefined()
    expect(parseJsonPrefix('[1 2]')).toBeUndefined()
    expect(parseJsonPrefix('{"a" "b"}')).toBeUndefined()
    expect(parseJsonPrefix('[}')).toBeUndefined()
    expect(parseJsonPrefix('{"a":}')).toBeUndefined()
    expect(parseJsonPrefix('{"a"}')).toBeUndefined()
    expect(parseJsonPrefix('[:')).toBeUndefined()
    expect(parseJsonPrefix('[,')).toBeUndefined()
    expect(parseJsonPrefix('[1{')).toEqual([])
    expect(parseJsonPrefix('[1"a"')).toEqual([])
    expect(parseJsonPrefix('[nope,')).toBeUndefined()
    expect(parseJsonPrefix('[1,2,')).toEqual([1, 2])
    expect(parseJsonPrefix('{"a":1 {')).toBeUndefined()
    expect(parseJsonPrefix('{"open key')).toEqual({})
  })
})

describe('PartialArguments.partialValue', () => {
  it('reads an open nested value as it streams and reports coarse changes', () => {
    const view = new PartialArguments()
    view.append('{"title":"T","blocks":[{"type":"markdown","text":"Hel')
    expect(view.partialValue('blocks')).toEqual([{ type: 'markdown', text: 'Hel' }])
    expect(view.partialValue('title')).toBeUndefined()
    expect(view.refresh()).toBe(false)
    view.append('lo"},')
    expect(view.refresh()).toBe(true)
    expect(view.partialValue('blocks')).toEqual([{ type: 'markdown', text: 'Hello' }])
    view.append('{"type":"stats"}]}')
    expect(view.refresh()).toBe(true)
    expect(view.partialValue('blocks')).toEqual([{ type: 'markdown', text: 'Hello' }, { type: 'stats' }])
    expect(view.partialValue('missing')).toBeUndefined()
  })

  it('changes only when the received length crosses a step', () => {
    const view = new PartialArguments()
    view.append('{"blocks":[')
    expect(view.partialValue('blocks', 100)).toEqual([])
    view.append('1,')
    expect(view.refresh()).toBe(false)
    view.append('2]}')
    expect(view.refresh()).toBe(true)
  })

  it('answers sealed and parsed views with their complete values', () => {
    expect(PartialArguments.fromText('{"a":[1]}').partialValue('a')).toEqual([1])
    expect(PartialArguments.fromObject({ a: { b: 2 } }).partialValue('a', 0)).toEqual({ b: 2 })
    expect(PartialArguments.fromObject({ a: 's' }).partialValue('a')).toBeUndefined()
  })

  it('tracks a field that is absent and then appears as a string', () => {
    const view = new PartialArguments()
    view.append('{')
    expect(view.partialValue('a')).toBeUndefined()
    view.append('"a":"x"')
    expect(view.refresh()).toBe(true)
    expect(view.partialValue('a')).toBeUndefined()
  })
})
