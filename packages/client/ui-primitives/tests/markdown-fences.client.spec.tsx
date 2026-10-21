// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownText } from './markdown-test-components.tsx'
import type { MarkdownFence, MarkdownFences } from '../src/markdown/MarkdownText.tsx'

afterEach(cleanup)

function recorder(): { fences: MarkdownFences; seen: MarkdownFence[] } {
  const seen: MarkdownFence[] = []
  return {
    seen,
    fences: {
      render: (fence, fallback) => {
        seen.push(fence)
        return fence.language === 'openui' ? <output>{`ui:${fence.code}`}</output> : fallback
      },
    },
  }
}

describe('MarkdownText fence renderers', () => {
  it('replaces a claimed fence in settled renders and keeps others as code blocks', () => {
    const { fences, seen } = recorder()
    const { container } = render(<MarkdownText fences={fences} text={'intro\n\n```openui\nroot = Col([])\n```\n\n```js\nlet a\n```'} />)
    expect(screen.getByText('ui:root = Col([])')).toBeTruthy()
    expect(container.querySelector('pre code')?.textContent).toContain('let a')
    expect(seen.map(fence => [fence.language, fence.streaming])).toEqual([['openui', false], ['js', false]])
  })

  it('renders claimed fences while streaming and after the settled swap', () => {
    const { fences, seen } = recorder()
    const view = render(<MarkdownText fences={fences} streaming text={'```openui\nroot = Col(['} />)
    expect(screen.getByText('ui:root = Col([')).toBeTruthy()
    expect(seen.at(-1)?.streaming).toBe(true)
    view.rerender(<MarkdownText fences={fences} streaming text={'```openui\nroot = Col([])\n```\n\nafter\n\nmore'} />)
    expect(screen.getByText('ui:root = Col([])')).toBeTruthy()
    view.rerender(<MarkdownText fences={fences} text={'```openui\nroot = Col([])\n```\n\nafter\n\nmore'} />)
    expect(seen.at(-1)?.streaming).toBe(false)
  })

  it('rebuilds the streaming cache when the fence renderer changes', () => {
    const first = recorder()
    const second = recorder()
    const view = render(<MarkdownText fences={first.fences} streaming text={'```openui\nx = 1\n```\n\na\n\nb'} />)
    view.rerender(<MarkdownText fences={second.fences} streaming text={'```openui\nx = 1\n```\n\na\n\nb'} />)
    expect(second.seen.length).toBeGreaterThan(0)
  })

  it('offers fences without a language with an undefined language and leaves empty fences to the default renderer', () => {
    const { fences, seen } = recorder()
    const { container } = render(<MarkdownText fences={fences} text={'```\nplain\n```\n\n```openui\n```'} />)
    expect(container.querySelectorAll('pre')).toHaveLength(2)
    expect(seen).toEqual([{ language: undefined, code: 'plain', streaming: false }])
  })
})
