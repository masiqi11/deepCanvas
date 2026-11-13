/** Turn interactive-answer actions and state into conversation text. */
import type { ActionEvent } from '@openuidev/react-lang'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** A form field's value without its `{ value, componentType }` wrapper. */
function unwrap(entry: unknown): unknown {
  return isRecord(entry) && 'value' in entry ? entry.value : entry
}

/** Plain values of a Renderer state map: `$name` bindings, single fields, and named forms' fields. */
function plainValues(state: Record<string, unknown> | undefined): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(state ?? {})) {
    if (isRecord(entry) && !('value' in entry)) {
      for (const [field, inner] of Object.entries(entry)) values[field] = unwrap(inner)
    } else values[key.replace(/^\$/, '')] = unwrap(entry)
  }
  return values
}

/**
 * Compose the user message a @ToAssistant action sends: its text, then the
 * values the page holds, so the next answer can start from them.
 * @param event - the Renderer action event.
 * @param valuesLabel - localized label for the values line.
 * @returns the message text, or undefined when the action carries no text.
 */
export function actionMessage(event: Pick<ActionEvent, 'humanFriendlyMessage' | 'formState' | 'params'>, valuesLabel: string): string | undefined {
  const text = event.humanFriendlyMessage.trim()
  if (text === '') return undefined
  const values = plainValues(event.formState)
  if (event.params.context !== undefined) values.context = event.params.context
  return Object.keys(values).length === 0 ? text : `${text}\n\n${valuesLabel}${JSON.stringify(values)}`
}

/**
 * Identify one fence for its page state: the same fence keeps its state across
 * re-renders, streaming completion, and remounts within the page.
 * @param sessionId - owning Session.
 * @param fence - turn, step, block index, and the fence's first statement.
 * @returns the state key.
 */
export function fenceKey(sessionId: string, fence: { turn: number; step: number; block: number; code: string }): string {
  const head = fence.code.trimStart().split('\n', 1).join('')
  return JSON.stringify([sessionId, fence.turn, fence.step, fence.block, head])
}

/**
 * Format renderer problems for the repair prompt.
 * @param errors - problem messages.
 * @returns one problem per line.
 */
export function problemList(errors: readonly string[]): string {
  return errors.map(error => `- ${error}`).join('\n')
}
