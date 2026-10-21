/**
 * OpenUI plugin, browser half: renders `openui` fences in Assistant replies as
 * live interfaces written in OpenUI Lang. Inputs change the page locally;
 * only an explicit submit sends a message, through the Session composer.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { en, NS, zh, type OpenUIKey } from './locales.ts'
import { OpenUIFence, type FenceInjected, type FenceStates } from './OpenUIFence.tsx'
import { isProgram } from './source.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Interactive answer copy. */
    openui: OpenUIKey
  }
}


/** Fence languages this plugin claims: the prompt teaches `openui`; `openui-lang` is the language's own name. */
export const FENCE_LANGUAGES = ['openui', 'openui-lang'] as const

/** Required services for the fence renderer and composer submission. */
export const inject = ['slots', 'locale', 'sessions']

/**
 * Register the dictionaries and the `openui` fence renderer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-openui: dictionaries')
  // Page state lives as long as this plugin instance; disposal drops it.
  const states: FenceStates = new Map()
  ctx.effect(() => () => { states.clear() }, 'ui-openui: page state')
  const sendPrompt = (sessionId: SessionId, prompt: string): void => {
    const binding = ctx.sessions.binding(sessionId)
    const input = binding?.ctx.get('conversation')?.input.for(binding.ctx)
    if (input === undefined) return
    input.setDraft(prompt)
    input.submit()
  }
  const fenceInject = (sessionId: SessionId): FenceInjected => ({
    sendPrompt: (prompt) => { sendPrompt(sessionId, prompt) },
    sessionId,
    states,
  })
  ctx.slots.inject('conversation.chat.markdown.fence', function* () {
    for (const key of FENCE_LANGUAGES) {
      yield ctx.slots.register({ name: 'conversation.chat.markdown.fence', key, locale: NS, inject: fenceInject }, OpenUIFence)
    }
  })
  // Models sometimes open the fence without its label; claim it when the content is an OpenUI program.
  ctx.slots.inject('conversation.chat.markdown.fence.unlabeled', () => ctx.slots.register({
    name: 'conversation.chat.markdown.fence.unlabeled', locale: NS, inject: fenceInject,
    select: owner => isProgram(owner.code) ? owner : null,
  }, OpenUIFence))
}
