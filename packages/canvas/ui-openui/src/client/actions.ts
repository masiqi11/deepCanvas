import { defineAction, type ActionEvent } from '@openuidev/react-lang'
import { z } from 'zod/v4'

/** Library actions beyond the built-in steps. */

/** `@CopyToClipboard(text)`: copy page text, such as a shopping list built with @Join. */
export const CopyToClipboard = defineAction({
  name: 'CopyToClipboard',
  description: 'Copy text to the clipboard, e.g. a shopping list built with @Join',
  params: z.object({ text: z.string() }),
})

/** Custom actions of the library. */
export const actions = [CopyToClipboard]

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (_error) {
    return false /* The Clipboard API refused (no focus or permission); the action reports failure. */
  }
}

/**
 * Run one of this library's custom actions.
 * @param event - the Renderer action event.
 * @returns a promise of whether it worked, or null when the event is not a custom action of this library.
 */
export function runLibraryAction(event: ActionEvent): Promise<boolean> | null {
  if (String(event.type) === CopyToClipboard.name) {
    const text = (event.params as { text?: unknown }).text
    return typeof text === 'string' ? copy(text) : Promise.resolve(false)
  }
  return null
}
