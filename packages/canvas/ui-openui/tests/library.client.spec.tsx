// @vitest-environment jsdom
/** Every gallery program renders through the fence renderer without throwing. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { OpenUIFence } from '../src/client/OpenUIFence.tsx'
import { zh } from '../src/client/locales.ts'
import { exampleShoppingList, exampleSteps, exampleTrip } from '../src/client/prompt-options.ts'
import { compositionPrograms } from './fixtures/composition-programs.client.ts'
import { programs } from './fixtures/programs.client.ts'
import { toolPrograms } from './fixtures/tool-programs.client.ts'

afterEach(cleanup)

const t = makeTranslate(zh)

/** Components DeepCanvas leaves out because they need the network. */
const REMOVED = /\b(?:SearchImage|Map|MapMarker|YouTube|Query)\(/

const all = [
  { id: 'example-list', code: exampleShoppingList },
  { id: 'example-trip', code: exampleTrip },
  { id: 'example-steps', code: exampleSteps },
  ...toolPrograms,
  ...programs,
  ...compositionPrograms,
]

describe.each(all)('$id', ({ code }) => {
  it('renders settled and streaming without throwing', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const props = { code, streaming: false, turn: 0, step: 0, block: 0, t, sendPrompt: vi.fn(), sessionId: 's', states: new Map() }
    const view = render(createElement(OpenUIFence, props as never))
    expect(view.container.querySelector('.iui-root')).not.toBeNull()
    if (!REMOVED.test(code)) expect(view.container.querySelector('.iui-root')?.innerHTML).not.toBe('')
    view.rerender(createElement(OpenUIFence, { ...props, code: code.slice(0, Math.floor(code.length / 2)), streaming: true } as never))
    expect(view.container.querySelector('.iui-root')).not.toBeNull()
    const crashes = errors.mock.calls.map(call => String(call[0]).slice(0, 200)).filter(line => /RangeError|Maximum call stack/.test(line))
    expect(crashes).toEqual([])
  })
})
