import { Fragment, type ReactNode } from 'react'
import { webUrl } from './style.ts'

// A small Markdown renderer that builds React elements and never injects HTML.
// Inline: **bold**, *italic*, ~~strike~~, `code`, [text](https://...).
// Blocks: paragraphs, # headings, - and 1. lists, > quotes, ``` code, ---, | tables |.

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(~~[^~\n]+?~~)|(\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_)|(\[[^\]\n]+\]\([^)\s]+\))/

export function inline(text: string, key = 'i'): ReactNode {
  const out: ReactNode[] = []
  let rest = text
  let n = 0
  while (rest) {
    const m = INLINE.exec(rest)
    if (!m) {
      out.push(rest)
      break
    }
    if (m.index) out.push(rest.slice(0, m.index))
    const token = m[0]
    const k = `${key}-${n++}`
    if (m[1]) out.push(<code key={k} className="iui-code">{token.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{inline(token.slice(2, -2), k)}</strong>)
    else if (m[3]) out.push(<s key={k}>{inline(token.slice(2, -2), k)}</s>)
    else if (m[4]) out.push(<em key={k}>{inline(token.slice(1, -1), k)}</em>)
    else {
      const close = token.indexOf('](')
      const label = token.slice(1, close)
      const href = webUrl(token.slice(close + 2, -1))
      out.push(
        href ? (
          <a key={k} className="iui-link" href={href} target="_blank" rel="noopener noreferrer">
            {inline(label, k)}
          </a>
        ) : (
          <Fragment key={k}>{inline(label, k)}</Fragment>
        ),
      )
    }
    rest = rest.slice(m.index + token.length)
  }
  return out.length === 1 ? out[0] : out
}

type Block =
  | { kind: 'p' | 'quote'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; head: string[]; rows: string[][] }

const LIST_ITEM = /^\s{0,3}([-*+]|(\d+)[.)])\s+(.*)$/
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

function blocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const at = (index: number): string => lines[index] ?? ''
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = at(i)
    if (!line.trim()) {
      i++
      continue
    }
    if (/^\s*```/.test(line)) {
      const body: string[] = []
      for (i++; i < lines.length && !/^\s*```/.test(at(i)); i++) body.push(at(i))
      out.push({ kind: 'code', text: body.join('\n') })
      i++
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      out.push({ kind: 'h', level: (heading[1] ?? '').length, text: heading[2] ?? '' })
      i++
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push({ kind: 'hr' })
      i++
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(at(i + 1))) {
      const head = cells(line)
      const rows: string[][] = []
      for (i += 2; i < lines.length && at(i).includes('|') && at(i).trim(); i++) rows.push(cells(at(i)))
      out.push({ kind: 'table', head, rows })
      continue
    }
    if (/^\s*>/.test(line)) {
      const body: string[] = []
      for (; i < lines.length && /^\s*>/.test(at(i)); i++) body.push(at(i).replace(/^\s*>\s?/, ''))
      out.push({ kind: 'quote', text: body.join(' ') })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      const ordered = !!item[2]
      const items: string[] = []
      for (; i < lines.length; i++) {
        const next = LIST_ITEM.exec(at(i))
        if (next && !!next[2] === ordered) items.push(next[3] ?? '')
        else if (at(i).trim() && /^\s{2,}/.test(at(i)) && items.length) items[items.length - 1] = `${items[items.length - 1] ?? ''} ${at(i).trim()}`
        else break
      }
      out.push({ kind: 'list', ordered, start: ordered ? Number(item[2]) : 1, items })
      continue
    }
    const body: string[] = []
    const opensBlock = (line: string) => LIST_ITEM.test(line) || /^(#{1,4})\s|^\s*```|^\s*>/.test(line)
    for (; i < lines.length && at(i).trim() && !opensBlock(at(i)); i++) body.push(at(i).trim())
    out.push({ kind: 'p', text: body.join(' ') })
  }
  return out
}

export function MarkdownBlocks({ text }: { text: string }) {
  return (
    <>
      {blocks(text).map((b, i) => {
        const k = `b${i}`
        switch (b.kind) {
          case 'p':
            return <p key={k}>{inline(b.text, k)}</p>
          case 'quote':
            return <blockquote key={k}>{inline(b.text, k)}</blockquote>
          case 'h':
            return (
              <div key={k} role="heading" aria-level={b.level + 1} className={`iui-md-h iui-md-h${b.level}`}>
                {inline(b.text, k)}
              </div>
            )
          case 'code':
            return (
              <pre key={k} className="iui-code-block">
                <code>{b.text}</code>
              </pre>
            )
          case 'hr':
            return <hr key={k} className="iui-divider" />
          case 'list': {
            const items = b.items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)
            return b.ordered ? (
              <ol key={k} start={b.start}>
                {items}
              </ol>
            ) : (
              <ul key={k}>{items}</ul>
            )
          }
          case 'table':
            return (
              <div key={k} className="iui-table-scroll">
                <table className="iui-table">
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j}>{inline(h, `${k}-h${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, `${k}-${j}-${m}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}
