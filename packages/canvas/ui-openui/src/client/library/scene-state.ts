/**
 * State a user changes inside a scene component. It is kept as a named field
 * of the fence's page state, so it survives a remount of the fence and is sent
 * with any message the page sends to the assistant. Field names and item keys
 * are therefore written to be read by the model.
 */
import { useFormName, useStateField, useTriggerAction, type StateField } from '@openuidev/react-lang'

// The library infers a field's type from a binding; a scene field has none, so its type is the scene's own state type.
const useField = useStateField as <V>(name: string, value: V | undefined) => StateField<V | undefined>

/**
 * Read and write one scene's state field.
 * @param name - field name, unique within the fence, such as `WeekPlan·本周计划`.
 * @param initial - the value before the user changes anything.
 * @returns the current value and its setter.
 */
export function useSceneState<T>(name: string, initial: T): [T, (next: T) => void] {
  const field = useField<T>(name, undefined)
  return [field.value ?? initial, (next: T) => { field.setValue(next) }]
}

/**
 * Give list items readable, unique keys: the label itself, and `label #2`, `label #3` for repeats.
 * @param labels - item labels in list order.
 * @returns one key per label.
 */
export function itemKeys(labels: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return labels.map((label) => {
    const count = (seen.get(label) ?? 0) + 1
    seen.set(label, count)
    return count === 1 ? label : `${label} #${count}`
  })
}

/**
 * Send a message to the assistant as the user's next turn; the page state goes with it.
 * @returns the sender.
 */
export function useAsk(): (message: string) => void {
  const trigger = useTriggerAction()
  const form = useFormName()
  return (message: string) => { void trigger(message, form) }
}
