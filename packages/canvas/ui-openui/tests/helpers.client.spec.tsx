// @vitest-environment jsdom
/** Message composition, state keys, icons, copy context, clipboard action, and plugin registration. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { actionMessage, fenceKey, problemList } from '../src/client/message.ts'
import { Glyph, iconFor } from '../src/client/glyph.tsx'
import { useCopy } from '../src/client/copy.ts'
import { CopyToClipboard, runLibraryAction } from '../src/client/actions.ts'
import { apply, FENCE_LANGUAGES, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { OpenUIFence } from '../src/client/OpenUIFence.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('action messages', () => {
  it('appends bindings, form fields, and context to the message', () => {
    const event = {
      humanFriendlyMessage: ' Plan my trip ',
      params: { context: { id: 7 } },
      formState: { $pace: 'Relaxed', single: { value: 2, componentType: 'Slider' }, prefs: { days: { value: 3, componentType: 'Input' }, raw: 'x' } },
    }
    expect(actionMessage(event, 'Values: ')).toBe('Plan my trip\n\nValues: {"pace":"Relaxed","single":2,"days":3,"raw":"x","context":{"id":7}}')
  })

  it('sends only the text without values and nothing for an empty message', () => {
    expect(actionMessage({ humanFriendlyMessage: 'Go', params: {} }, 'V: ')).toBe('Go')
    expect(actionMessage({ humanFriendlyMessage: '  ', params: {} }, 'V: ')).toBeUndefined()
  })

  it('keys a fence by session, position, and first statement', () => {
    expect(fenceKey('s', { turn: 1, step: 2, block: 3, code: '\n root = Col([])\nx = 1' })).toBe('["s",1,2,3,"root = Col([])"]')
    expect(fenceKey('s', { turn: 0, step: 0, block: 0, code: '' })).toBe('["s",0,0,0,""]')
  })

  it('lists problems one per line', () => {
    expect(problemList(['a', 'b'])).toBe('- a\n- b')
  })
})

describe('icons', () => {
  it('normalizes names and ignores unknown ones', () => {
    expect(iconFor('MapPin')).toBe(iconFor('map-pin'))
    expect(iconFor('map_pin')).toBe(iconFor('map pin'))
    expect(iconFor('map-pin')).toBeDefined()
    expect(iconFor('no-such-icon')).toBeUndefined()
    expect(iconFor(3)).toBeUndefined()
    const view = render(<span><Glyph name="clock" /><Glyph name="unknown" size={10} className="x" /></span>)
    expect(view.container.querySelectorAll('svg')).toHaveLength(1)
  })
})

describe('copy context', () => {
  it('refuses components rendered outside the fence renderer', () => {
    const Probe = () => { useCopy(); return null }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('outside the fence renderer')
  })
})

describe('clipboard action', () => {
  it('copies text, reports refusals, and ignores other actions', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await expect(runLibraryAction({ type: CopyToClipboard.name, params: { text: 'a' }, humanFriendlyMessage: '' })).resolves.toBe(true)
    writeText.mockImplementationOnce(() => Promise.reject(new Error('denied')))
    await expect(runLibraryAction({ type: CopyToClipboard.name, params: { text: 'a' }, humanFriendlyMessage: '' })).resolves.toBe(false)
    await expect(runLibraryAction({ type: CopyToClipboard.name, params: { text: 1 }, humanFriendlyMessage: '' })).resolves.toBe(false)
    expect(runLibraryAction({ type: 'Other', params: {}, humanFriendlyMessage: '' })).toBeNull()
  })
})

describe('plugin registration', () => {
  it('keeps the host entry inert and declares its services', () => {
    expect(hostApply).not.toThrow()
    expect(inject).toEqual(['slots', 'locale', 'sessions'])
  })

  it('registers the fence renderer for both languages and submits through the composer', () => {
    type Injected = { sendPrompt: (p: string) => void; states: Map<string, unknown> }
    const registrations: Array<{ name: string; key: string; inject: (sessionId: string) => Injected }> = []
    const components: unknown[] = []
    const effects: Array<() => unknown> = []
    const input = { setDraft: vi.fn(), submit: vi.fn() }
    const ctx = {
      effect: (fn: () => unknown) => { effects.push(fn) },
      locale: { register: vi.fn() },
      sessions: {
        binding: vi.fn((id: string) => id === 'gone' ? undefined : { ctx: { get: () => ({ input: { for: () => input } }) } }),
      },
      slots: {
        inject: (_name: string, body: () => unknown) => {
          const result = body()
          if (result !== null && typeof result === 'object' && Symbol.iterator in result) for (const _ of result as Iterable<unknown>) { /* drain the registration generator */ }
        },
        register: (options: (typeof registrations)[number], component: unknown) => {
          registrations.push(options)
          components.push(component)
          return () => {}
        },
      },
    }
    apply(ctx as never)
    const disposers = effects.map(effect => effect())
    expect(ctx.locale.register).toHaveBeenCalled()
    expect(registrations.map(entry => entry.key)).toEqual([...FENCE_LANGUAGES])
    expect(components).toEqual([OpenUIFence, OpenUIFence])
    const live = registrations[0]?.inject('s1')
    live?.sendPrompt('hello')
    expect(input.setDraft).toHaveBeenCalledWith('hello')
    expect(input.submit).toHaveBeenCalled()
    live?.states.set('k', {})
    registrations[1]?.inject('gone').sendPrompt('x')
    expect(input.setDraft).toHaveBeenCalledTimes(1)
    for (const dispose of disposers) if (typeof dispose === 'function') (dispose as () => void)()
    expect(live?.states.size).toBe(0)
  })
})
