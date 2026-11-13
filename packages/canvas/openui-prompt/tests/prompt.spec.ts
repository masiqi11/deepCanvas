/** The plugin contributes the generated OpenUI reference as one system prompt section. */
import { describe, expect, it, vi } from 'vitest'
import { apply, inject, name, OPENUI_REFERENCE, SECTION } from '../src/index.ts'

describe('openui prompt', () => {
  it('registers the reference at the tool-report position', () => {
    const section = vi.fn()
    const ctx = { systemPrompt: { section, getSectionOrder: vi.fn(() => 42) } }
    apply(ctx as never)
    expect(name).toBe('openui-prompt')
    expect(inject).toEqual(['systemPrompt'])
    expect(ctx.systemPrompt.getSectionOrder).toHaveBeenCalledWith('TOOL_REPORT')
    expect(section).toHaveBeenCalledWith({ name: SECTION, order: 42, text: OPENUI_REFERENCE })
    expect(OPENUI_REFERENCE).toMatch(/^Replies are Markdown\./)
    expect(OPENUI_REFERENCE).toContain('fenced block whose info string is openui')
  })
})
