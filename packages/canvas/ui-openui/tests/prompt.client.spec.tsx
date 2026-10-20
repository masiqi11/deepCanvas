// @vitest-environment jsdom
/** The host prompt teaches exactly the library the client renders. */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OPENUI_REFERENCE } from '@deepseek-ai/dsh-openui-prompt'
import { library } from '../src/client/library.ts'
import { promptOptions } from '../src/client/prompt-options.ts'

// Specs run from the repository root.
const REFERENCE_FILE = resolve(process.cwd(), 'packages/canvas/openui-prompt/src/reference.ts')

function moduleText(reference: string): string {
  const literal = reference.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  return `/** Generated OpenUI Lang reference; \`DSH_WRITE_OPENUI_PROMPT=1\` on the ui-openui prompt spec rewrites it. */\nexport const OPENUI_REFERENCE = \`${literal}\`\n`
}

describe('OpenUI prompt reference', () => {
  it('matches the reference generated from the component library', () => {
    const generated = library.prompt(promptOptions)
    if (process.env.DSH_WRITE_OPENUI_PROMPT === '1') writeFileSync(REFERENCE_FILE, moduleText(generated))
    expect(OPENUI_REFERENCE).toBe(generated)
  })
})
