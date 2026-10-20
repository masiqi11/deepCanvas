/**
 * Canvas plugin, browser half: renders `show_ui` calls inline in the reply,
 * shows a building card for `canvas_board` calls and a board card once
 * published, and opens published boards in a right-Sidebar workspace tab that
 * reads every version from Session history.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { boardAddress, boardResourceProvider, parseBoardAddress } from './board-resource.ts'
import { BoardTab, BoardTitle, type BoardTabInjected } from './BoardView.tsx'
import { en, NS, zh, type CanvasKey } from './locales.ts'
import { BoardCardView, InlineCanvasView, type CanvasViewInjected } from './ToolViews.tsx'
import { canvasDefinition } from './canvas-definition.ts'
import { CanvasVisualNode } from './VisualNode.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Inline canvas, board card, and board workspace copy. */
    canvas: CanvasKey
  }
}

/** Stable registration identity of the workspace tab type. */
const TAB_ID = '@deepseek-ai/dsh-client-ui-canvas'

/** Required services for tool views, the workspace tab, and composer actions. */
export const inject = ['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiConversation', 'resources', 'sidebarRight', 'sidebarRightTabs']

/**
 * Register the dictionaries, both tool views, the reply-flow node, the board resource, and the workspace tab.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-canvas: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.resources.register(boardResourceProvider(ctx.remote.session)), 'ui-canvas: board resource')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID, kind: 'canvas-board', patterns: ['dsh-resource://canvas-board/**'], priority: 'builtin',
    canOpen: address => parseBoardAddress(address) !== undefined,
    title: () => t('board.title'),
  }), 'ui-canvas: board tab type')

  let labels: { revision: string; value: MarkdownLabels } | undefined
  const markdownLabels = (): MarkdownLabels => {
    const revision = t('code.title')
    if (labels?.revision !== revision) {
      labels = {
        revision,
        value: {
          code: { copyLabel: t('copy'), copiedLabel: t('copied'), toolbarLabels: { codeLabel: t('code.title'), wrapLabel: t('code.wrap'), unwrapLabel: t('code.unwrap') } },
          footnotes: t('footnotes'),
        },
      }
    }
    return labels.value
  }
  const composer = (sessionId: string) => {
    const binding = ctx.sessions.binding(sessionId as SessionId)
    return binding?.ctx.get('conversation')?.input.for(binding.ctx)
  }
  const sendPrompt = (sessionId: string, prompt: string): void => {
    const input = composer(sessionId)
    if (input === undefined) return
    input.setDraft(prompt)
    input.submit()
  }
  const draftPrompt = (sessionId: string, prompt: string): void => {
    const input = composer(sessionId)
    if (input === undefined) return
    input.setDraft(prompt)
    input.focus()
  }
  const viewInject = (sessionId: SessionId): CanvasViewInjected => ({
    sendPrompt: (prompt) => { sendPrompt(sessionId, prompt) },
    draftPrompt: (prompt) => { draftPrompt(sessionId, prompt) },
    openBoard: (boardId, callId) => { ctx.sidebarRight.openResource(boardAddress({ sessionId, boardId }), { params: { callId } }) },
    markdownLabels: markdownLabels(),
  })
  ctx.slots.inject('tool.call.toolview', function* () {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'show_ui', locale: NS, inject: viewInject }, InlineCanvasView)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'canvas_board', locale: NS, inject: viewInject }, BoardCardView)
  })
  ctx.effect(() => ctx.uiConversation.events.register(canvasDefinition), 'ui-canvas: conversation definition')
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node', key: 'canvas-visual', locale: NS, inject: viewInject,
  }, CanvasVisualNode))
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS,
    inject: (): BoardTabInjected => ({ sendPrompt, draftPrompt, markdownLabels: markdownLabels() }),
  }, BoardTab))
  ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title', key: TAB_ID,
  }, BoardTitle))
}
