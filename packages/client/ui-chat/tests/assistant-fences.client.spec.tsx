// @vitest-environment jsdom
/** Assistant fences dispatch by language; fences without one go through the unlabeled chain. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { AssistantMarkdown, type AssistantMarkdownProps } from '../src/client/chat/AssistantMarkdown.tsx'
import { useDetailedPresentation } from './presentation-fixture.client.ts'
import { unusedImageLoader } from './reasoning-component-fixture.tsx'
import { useDisclosure } from '../src/client/chat/use-disclosure.ts'
import { useSearchableHidden } from '../src/client/chat/searchable-hidden.ts'
import { zh } from '../src/client/locale.ts'

const t: AssistantMarkdownProps['t'] = makeTranslate(zh, commonZh)

afterEach(cleanup)

describe('assistant fences', () => {
  it('offers labelled fences by language and unlabeled fences to the chain, with their position', () => {
    const renderSlot = vi.fn((_key: string, _owner: unknown, opts?: { fallback?: unknown }) => opts?.fallback ?? null)
    const renderSlotChain = vi.fn((_key: string, _owner: unknown, opts?: { fallback?: unknown }) => opts?.fallback ?? null)
    render(
      <AssistantMarkdown renderSlot={renderSlot as never} renderSlotChain={renderSlotChain as never}
        useDisclosure={useDisclosure} useGroupAction={useSearchableHidden} usePresentation={useDetailedPresentation} t={t}
        blocks={[{ kind: 'text', text: 'a\n\n```openui\nroot = Col([])\n```\n\n```\nroot = Col([])\n```\n' }]}
        streaming={false} loadImage={unusedImageLoader} turn={2} step={1}
      />,
    )
    expect(renderSlot).toHaveBeenCalledWith('conversation.chat.markdown.fence',
      { code: 'root = Col([])', streaming: false, turn: 2, step: 1, block: 0 }, expect.objectContaining({ entryKey: 'openui' }))
    const [key, owner, opts] = renderSlotChain.mock.calls[0] ?? []
    expect(key).toBe('conversation.chat.markdown.fence.unlabeled')
    expect(owner).toEqual({ code: 'root = Col([])', streaming: false, turn: 2, step: 1, block: 0 })
    expect(opts?.fallback).toBeTruthy()
  })

  it('keeps the code block for an unlabeled fence when no chain is offered', () => {
    const view = render(
      <AssistantMarkdown renderSlot={() => null}
        useDisclosure={useDisclosure} useGroupAction={useSearchableHidden} usePresentation={useDetailedPresentation} t={t}
        blocks={[{ kind: 'text', text: '```\nplain words\n```\n' }]} streaming={false} loadImage={unusedImageLoader}
      />,
    )
    expect(view.container.querySelector('pre')?.textContent).toContain('plain words')
  })
})
