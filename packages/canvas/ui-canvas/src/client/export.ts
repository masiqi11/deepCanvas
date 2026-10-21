/**
 * Offline HTML export of a rendered board. The export copies the rendered
 * document and the page's style rules into one file: every section and tab
 * panel is shown, workspace controls are removed, and agent actions are
 * disabled because no agent is reachable offline.
 */

/**
 * Serialize every readable style rule of the given style sheets.
 * @param sheets - the page's style sheets.
 * @returns concatenated CSS text.
 */
export function pageStyles(sheets: ArrayLike<Pick<CSSStyleSheet, 'cssRules'>>): string {
  const parts: string[] = []
  for (const sheet of Array.from(sheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch (_error) {
      // Cross-origin sheets refuse rule access; their rules are not part of the board styles.
      continue
    }
    for (const rule of Array.from(rules)) parts.push(rule.cssText)
  }
  return parts.join('\n')
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] as string)
}

/**
 * Build the standalone export document for a rendered board.
 * @param root - rendered board element.
 * @param title - document title.
 * @param offlineLabel - tooltip for actions that need the agent.
 * @returns the complete HTML text.
 */
export function exportDocument(root: HTMLElement, title: string, offlineLabel: string): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.setAttribute('data-export', '')
  clone.removeAttribute('data-presenting')
  for (const element of Array.from(clone.querySelectorAll('[data-cv-toolbar]'))) element.remove()
  for (const element of Array.from(clone.querySelectorAll('[hidden]'))) element.removeAttribute('hidden')
  for (const element of Array.from(clone.querySelectorAll('[data-section]'))) element.setAttribute('data-active', '')
  for (const element of Array.from(clone.querySelectorAll('[data-animate]'))) element.removeAttribute('data-animate')
  for (const button of Array.from(clone.querySelectorAll<HTMLButtonElement>('[data-cv-action]'))) {
    button.disabled = true
    button.setAttribute('disabled', '')
    button.title = offlineLabel
  }
  const doc = root.ownerDocument
  const dark = doc.body.hasAttribute('data-ds-dark-theme') ? ' data-ds-dark-theme=""' : ''
  return `<!doctype html>
<html lang="${escapeHtml(doc.documentElement.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${pageStyles(doc.styleSheets).replace(/<\/style/gi, '<\\/style')}</style>
<style>body{margin:0;background:var(--dsw-alias-bg-base,#fff);}[data-export]{max-width:960px;margin:0 auto;}</style>
</head>
<body${dark}>
${clone.outerHTML}
</body>
</html>
`
}

/**
 * Download the rendered board as one HTML file.
 * @param root - rendered board element.
 * @param title - board title, used for the file name.
 * @param offlineLabel - tooltip for actions that need the agent.
 */
export function downloadBoard(root: HTMLElement, title: string, offlineLabel: string): void {
  const blob = new Blob([exportDocument(root, title, offlineLabel)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = root.ownerDocument.createElement('a')
  link.href = url
  link.download = `${title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'board'}.html`
  link.style.display = 'none'
  root.ownerDocument.body.append(link)
  link.click()
  link.remove()
  // The download reads the blob asynchronously; keep the URL alive briefly.
  setTimeout(() => { URL.revokeObjectURL(url) }, 30_000)
}
