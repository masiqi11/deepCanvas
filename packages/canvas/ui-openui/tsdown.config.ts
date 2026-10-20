import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clientBundle } from '../../client/tsdown.client.ts'

/** Components and functions adapted from Open Intelligent UI keep its MIT notice in the shipped artifact. */
function libraryLicenseBanner(): string {
  const notice = readFileSync(join(import.meta.dirname, 'licenses/OpenIntelligentUI.txt'), 'utf8')
  return ['//! Open Intelligent UI license notice', ...notice.trimEnd().split('\n').map(line => `// ${line}`)].join('\n')
}

export default clientBundle(import.meta.dirname, ['lib/types/index.js'], {
  clientBanner: fileName => fileName.endsWith('client.js') ? libraryLicenseBanner() : undefined,
})
