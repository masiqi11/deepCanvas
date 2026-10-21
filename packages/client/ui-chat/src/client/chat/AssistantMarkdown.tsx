import { Fragment, memo, useMemo } from 'react'
import { fileMediaUrl } from '@deepseek-ai/dsh-util-workspace-path'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ReactNode } from 'react'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownFences, MarkdownFileMentions, MarkdownPathImages } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNodeOwnerProps, ChatViewSlotProps, UseDisclosure, UsePresentation, UseGroupAction } from '../contract/slots.ts'
import type { AssistantBlock } from '../contract/snapshot.ts'
import { markdownLabels } from '../markdown-labels.ts'
import { ReasoningRow } from './ReasoningRow.tsx'
import css from './AssistantMarkdown.module.css'

/**
 * Standalone fallback for image destinations (query/fragment suffixes are ignored).
 * Chat fileImages resolves decoded file references against cwd; pathImages also
 * serves this component outside that provider and accepts legacy image URL suffixes.
 * Resolve an authored absolute image path against the document's file API.
 * @param base - canonical `document.baseURI` at render time.
 * @param value - authored Markdown destination; URL escapes are decoded once.
 * @returns an absolute Web or Desktop file-API URL, or undefined for unsupported
 * protocols and non-local paths.
 */
export function localPathMediaUrl(base: string, value: string): string | undefined {
  let path: string
  try { path = decodeURIComponent(value.split(/[?#]/u)[0] ?? '') }
  catch { return undefined } // Malformed URL escapes cannot identify a file.
  return fileMediaUrl(base, path)
}

export interface AssistantMarkdownProps extends
  Pick<PropsRenderSlots<'conversation.chat.reasoning.body' | 'conversation.chat.message.images' | 'conversation.chat.markdown.fence'>, 'renderSlot'>,
  Pick<ChatNodeOwnerProps, 'loadImage'> {
  /** Render only the requested business portion, preserving original block indexes. */
  groupPart?: string | undefined
  /** Stable Hook forwarded to each independently expandable reasoning block. */
  useDisclosure: UseDisclosure
  blocks: readonly AssistantBlock[]
  streaming: boolean
  /** Frozen partial of an aborted turn: rendered with a stopped marker. */
  interrupted?: boolean | undefined
  /** Hide reasoning that belongs to the Turn-level process disclosure. */
  reasoningHidden?: boolean | undefined
  /** Process hiding bound by the node slot to its current viewport. */
  useGroupAction: UseGroupAction
  /** Live display policy for reasoning summaries. */
  usePresentation: UsePresentation
  /** Reveal the disclosure that hides this reasoning. */
  revealProcess?: (() => void) | undefined
  /** Resolved prose file mentions for this Assistant's closing turn. */
  mentions?: MarkdownFileMentions | undefined
  /** The owning view's locale seat, passed down as a plain prop. */
  t: ChatViewSlotProps['t']
  /** Turn of this Assistant step, offered to fence renderers. */
  turn?: number | undefined
  /** Step within the Turn, offered to fence renderers. */
  step?: number | undefined
  /** Chain renderer for fences without a language; without it they keep the code block. */
  renderSlotChain?: PropsRenderSlots<'conversation.chat.markdown.fence.unlabeled'>['renderSlotChain'] | undefined
}

/** Renders non-blank reasoning blocks as independent disclosures alongside the response. */
export const AssistantMarkdown = memo(function AssistantMarkdown({
  blocks, streaming, interrupted, loadImage, groupPart, useDisclosure,
  reasoningHidden = false, usePresentation, revealProcess, mentions, renderSlot, renderSlotChain, useGroupAction, t, turn = 0, step = 0,
}: AssistantMarkdownProps) {
  // Stable per locale revision (t identity changes on switch): a fresh object
  // per render would rebuild MarkdownText's component table every chunk.
  const labels = useMemo(() => markdownLabels(t), [t])
  // MarkdownText memoizes its vocabulary; keep its identity stable across renders.
  const pathImages = useMemo<MarkdownPathImages>(() => {
    return { resolve: value => localPathMediaUrl(document.baseURI, value) }
  }, [])
  // One renderer per block index, stable across chunks so MarkdownText keeps its streaming cache.
  const count = blocks.length
  const fences = useMemo(() => Array.from({ length: count }, (_, block): MarkdownFences => ({
    render: (fence, fallback) => {
      const owner = { code: fence.code, streaming: fence.streaming, turn, step, block }
      if (fence.language !== undefined) return renderSlot('conversation.chat.markdown.fence', owner, { entryKey: fence.language, fallback })
      // Without the chain (standalone hosts), an unlabeled fence keeps its code block.
      return renderSlotChain === undefined ? fallback : renderSlotChain('conversation.chat.markdown.fence.unlabeled', owner, { fallback })
    },
  })), [count, renderSlot, renderSlotChain, turn, step])
  const last = blocks.length - 1
  // Tool-call heads render as tool rows in the chat view's grouping pass, so
  // a node that is only those heads (or empty) would paint an empty root
  // between tool groups — skip the shell unless something visible remains.
  const hasVisible = streaming
    || interrupted === true
    || blocks.some(block => block.kind !== 'tool-call')
  if (!hasVisible) return null
  const rendered: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block === undefined) continue
    if (groupPart === 'reasoning' && block.kind !== 'reasoning') continue
    if (groupPart === 'response' && block.kind === 'reasoning') continue
    switch (block.kind) {
      case 'text':
        rendered.push(
          <MarkdownText
            key={i}
            text={block.text}
            streaming={streaming}
            labels={labels}
            fileMentions={mentions}
            pathImages={pathImages}
            fences={fences[i]}
          />,
        )
        break
      case 'reasoning':
        if (block.text.trim() === '') break
        rendered.push(
          <ProcessReasoning
            key={i}
            hidden={reasoningHidden}
            reveal={revealProcess}
            useGroupAction={useGroupAction}
          >
            <ReasoningRow text={block.text} running={streaming && i === last} usePresentation={usePresentation}
              useDisclosure={useDisclosure} renderSlot={renderSlot} t={t} />
          </ProcessReasoning>,
        )
        break
      case 'image': {
        // Consecutive image blocks share one gallery so several images tile
        // into rows instead of each opening a one-image group of its own.
        // Keyed by the group's FIRST block index: a streaming append that
        // extends the group then only grows `images` instead of remounting
        // the gallery under a shifted key.
        const start = i
        const group = [block]
        while (i + 1 < blocks.length) {
          const next = blocks[i + 1]
          if (next === undefined || next.kind !== 'image') break
          group.push(next)
          i += 1
        }
        rendered.push(
          <Fragment key={start}>
            {renderSlot('conversation.chat.message.images', {
              images: group.map(({ attachment }) => ({ attachment })), loadImage, align: 'start',
            })}
          </Fragment>,
        )
        break
      }
      // Grouped into tool rows by ChatView; hasVisible above skips an empty shell.
      case 'tool-call':
        break
      default:
        rendered.push(
          <JsonBlock
            key={i}
            label={t('message.unknownBlock')}
            payload={block.block}
            truncatedLabel={total => t('json.truncated', { total })}
          />,
        )
    }
  }
  return (
    <div className={css.root} data-streaming={streaming || undefined}>
      <div className={css.body}>
        {rendered}
        {interrupted && (groupPart === undefined || groupPart === 'response'
          || !blocks.some(block => block.kind !== 'reasoning' && block.kind !== 'tool-call'))
          && <span className={css.stopped}>{t('message.stopped')}</span>}
      </div>
    </div>
  )
})

function ProcessReasoning({ hidden, reveal, useGroupAction, children }: {
  hidden: boolean
  reveal?: (() => void) | undefined
  useGroupAction: UseGroupAction
  children: ReactNode
}) {
  const ref = useGroupAction(hidden, reveal ?? NOOP)
  return <div ref={ref} data-turn-process-inline={hidden || undefined}>{children}</div>
}

const NOOP = (): void => {}
