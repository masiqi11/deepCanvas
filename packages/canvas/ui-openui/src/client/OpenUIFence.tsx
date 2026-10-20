/** Chat renderer of an `openui` fence: the live interface, its state, actions, and repair. */
import { useCallback, useMemo, useState } from 'react'
import { BuiltinActionType, Renderer, type ActionEvent, type OpenUIError } from '@openuidev/react-lang'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { runLibraryAction } from './actions.ts'
import { library } from './library.ts'
import { CopyContext, type Translate } from './copy.ts'
import { webUrl } from './library/style.ts'
import type { NS } from './locales.ts'
import { actionMessage, fenceKey, problemList } from './message.ts'

/** Page state retained per fence while the page is open. */
export type FenceStates = Map<string, Record<string, unknown>>

/** Session-bound actions and the page-state store. */
export interface FenceInjected {
  /** Send text as the user's next message. */
  sendPrompt: (prompt: string) => void
  /** Session that owns the reply, for state keys. */
  sessionId: string
  /** Shared page-state store of this plugin. */
  states: FenceStates
}

type FenceProps = PropsRuntime<'conversation.chat.markdown.fence'> & InjectFace<FenceInjected> & PropsLocale<typeof NS>

/** Errors that stop a program from rendering; warnings still render. */
function blocking(errors: readonly OpenUIError[]): OpenUIError[] {
  return errors.filter(error => error.severity !== 'warning')
}

/**
 * Render one `openui` fence of an Assistant reply.
 * @param props - fence content, streaming state, copy, and Session actions.
 * @returns the interactive view, with a repair card when the program has errors.
 */
export function OpenUIFence(props: FenceProps) {
  const { code, streaming, turn, step, block, t, sendPrompt, sessionId, states } = props
  const translate: Translate = t
  const key = fenceKey(sessionId, { turn, step, block, code })
  // Read once per fence: later edits flow through onStateUpdate, not back into initialState.
  const [initialState] = useState(() => states.get(key))
  const [errors, setErrors] = useState<OpenUIError[]>([])
  const onStateUpdate = useCallback((state: Record<string, unknown>) => { states.set(key, state) }, [states, key])
  const onAction = useCallback((event: ActionEvent) => {
    if (event.type === BuiltinActionType.ContinueConversation) {
      const message = actionMessage(event, t('action.values'))
      if (message !== undefined) sendPrompt(message)
      return
    }
    if (event.type === BuiltinActionType.OpenUrl) {
      const url = webUrl(event.params.url)
      if (url !== null) window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    void runLibraryAction(event)
  }, [sendPrompt, t])
  const problems = useMemo(() => streaming ? [] : blocking(errors), [errors, streaming])
  const empty = code.trim() === ''
  return (
    <CopyContext.Provider value={translate}>
      <div className="iui-root" data-streaming={streaming || undefined}>
        {empty ? <div className="iui-fence-status">{t('fence.preparing')}</div> : (
          <Renderer
            response={code}
            library={library}
            isStreaming={streaming}
            onAction={onAction}
            onError={setErrors}
            onStateUpdate={onStateUpdate}
            {...initialState === undefined ? {} : { initialState }}
          />
        )}
        {problems.length > 0 && (
          <div className="iui-fence-problem" role="alert">
            <strong>{t('fence.failed')}</strong>
            <ul>{problems.map((problem, index) => <li key={index}>{problem.message}</li>)}</ul>
            <div className="iui-fence-actions">
              <button type="button" className="iui-button iui-button-outline iui-button-sm"
                onClick={() => { sendPrompt(t('fence.fixPrompt', { problems: problemList(problems.map(problem => problem.message)) })) }}>
                {t('fence.fix')}
              </button>
            </div>
            <details>
              <summary>{t('fence.source')}</summary>
              <pre>{code}</pre>
            </details>
          </div>
        )}
      </div>
    </CopyContext.Provider>
  )
}
