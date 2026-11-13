/**
 * Model-facing guidance for interactive answers: the OpenUI Lang reference and
 * the rules for writing `openui` fences in a reply. The reference is generated
 * from the client component library, so the model is taught exactly the
 * components the client renders.
 * @module @deepseek-ai/dsh-openui-prompt
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { OPENUI_REFERENCE } from './reference.ts'

export { OPENUI_REFERENCE } from './reference.ts'

/** Stable Loader identity. */
export const name = 'openui-prompt'

/** Services used to contribute the prompt section. */
export const inject = ['systemPrompt']

/** System prompt section name. */
export const SECTION = 'openui:reference'

/**
 * Contribute the interactive-answer section to the system prompt.
 * @param ctx - agent-scoped services.
 */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: SECTION,
    order: ctx.systemPrompt.getSectionOrder('TOOL_REPORT'),
    text: OPENUI_REFERENCE,
  })
}
