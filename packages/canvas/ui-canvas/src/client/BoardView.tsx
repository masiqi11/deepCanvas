/** The board workspace tab: report and slides layouts, version switching, presentation, and export. */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CanvasBoard } from '@deepseek-ai/dsh-canvas-spec'
import { BlockList, Markdown, SourceList } from './Blocks.tsx'
import { CanvasProvider, sourceMap, type CanvasEnvironment, type Translate } from './context.tsx'
import { downloadBoard } from './export.ts'
import { parseBoardAddress } from './board-resource.ts'
import type { NS } from './locales.ts'
import css from './Canvas.module.css'

/** Session actions the workspace tab receives. */
export interface BoardTabInjected {
  sendPrompt: (sessionId: string, prompt: string) => void
  draftPrompt: (sessionId: string, prompt: string) => void
  markdownLabels: CanvasEnvironment['markdownLabels']
}

type BoardTabProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<typeof NS> & BoardTabInjected

/** Every source a board registers: the top-level list, then sources blocks. */
function boardSources(board: CanvasBoard) {
  const fromBlocks = board.sections.flatMap(section => section.blocks.flatMap(block => block.type === 'sources' ? block.items : []))
  return sourceMap(board.sources, fromBlocks)
}

/**
 * Render the selected version of a board.
 * @param props - tab identity, resource reader, copy, and session actions.
 * @returns the board or a loading or failure state.
 */
export function BoardTab(props: BoardTabProps) {
  const { useTabInfo, useResource, t } = props
  const tab = useTabInfo()
  const resource = useResource<'canvas-board'>(tab.tab.navigation.address)
  const history = resource.value
  const params = tab.tab.navigation.params
  const requested = params !== undefined && 'callId' in params ? params.callId : undefined
  const [chosen, setChosen] = useState<{ callId: string; for: string | undefined } | null>(null)
  // A newly requested version (another card opened) replaces a choice made in the selector.
  const callId = chosen !== null && chosen.for === requested ? chosen.callId : requested
  const current = history?.versions.find(version => version.callId === callId) ?? history?.versions[history.versions.length - 1]
  const sessionId = parseBoardAddress(tab.tab.navigation.address)?.sessionId
  const translate: Translate = t
  const environment = useMemo<CanvasEnvironment | undefined>(() => current === undefined || sessionId === undefined ? undefined : {
    t: translate,
    sources: boardSources(current.board),
    sendPrompt: (prompt) => { props.sendPrompt(sessionId, prompt) },
    draftPrompt: (prompt) => { props.draftPrompt(sessionId, prompt) },
    markdownLabels: props.markdownLabels,
    animate: true,
  }, [current, sessionId, translate, props])
  if (history === undefined || current === undefined || environment === undefined) {
    return (
      <div className={css.boardMessage} role="status">
        {resource.status === 'failed' ? (resource.failure?.code === 'canvas-board/not-found' ? t('board.notFound') : t('board.failed')) : t('board.loading')}
      </div>
    )
  }
  const latest = history.versions[history.versions.length - 1]
  return (
    <CanvasProvider value={environment}>
      <BoardDocument key={current.callId} board={current.board} t={translate}
        versions={history.versions.map(version => ({
          callId: version.callId,
          label: version.callId === latest?.callId ? t('board.versionLatest', { version: version.version }) : t('board.version', { version: version.version }),
        }))}
        selected={current.callId} onSelect={(value) => { setChosen({ callId: value, for: requested }) }} />
    </CanvasProvider>
  )
}

interface BoardDocumentProps {
  readonly board: CanvasBoard
  readonly t: Translate
  readonly versions: ReadonlyArray<{ callId: string; label: string }>
  readonly selected: string
  readonly onSelect: (callId: string) => void
}

/**
 * The board document with its toolbar.
 * @param props - board, copy, and version choices.
 * @returns the board element.
 */
export function BoardDocument({ board, t, versions, selected, onSelect }: BoardDocumentProps) {
  const root = useRef<HTMLDivElement>(null)
  const [slide, setSlide] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const slides = board.layout === 'slides'
  const total = board.sections.length
  const go = useCallback((delta: number) => { setSlide(current => Math.min(Math.max(current + delta, 0), total - 1)) }, [total])
  useEffect(() => {
    const onChange = (): void => { setPresenting(document.fullscreenElement === root.current && root.current !== null) }
    document.addEventListener('fullscreenchange', onChange)
    return () => { document.removeEventListener('fullscreenchange', onChange) }
  }, [])
  const togglePresent = (): void => {
    if (document.fullscreenElement !== null) { void document.exitFullscreen(); return }
    void root.current?.requestFullscreen().catch(() => { setPresenting(value => !value) })
  }
  const sources = board.sources ?? []
  return (
    <div ref={root} className={css.board} data-layout={board.layout} data-presenting={presenting ? '' : undefined} tabIndex={-1}
      onKeyDown={(event) => {
        if (!slides) return
        if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') { event.preventDefault(); go(1) }
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); go(-1) }
      }}>
      <div className={css.boardToolbar} data-cv-toolbar="">
        {versions.length > 1 ? (
          <select className={css.versionSelect} value={selected} aria-label={t('board.version', { version: '' })}
            onChange={(event) => { onSelect(event.target.value) }}>
            {versions.map(version => <option key={version.callId} value={version.callId}>{version.label}</option>)}
          </select>
        ) : <span className={css.muted}>{versions[0]?.label}</span>}
        <span className={css.toolbarSpacer} />
        <button type="button" className={css.toolButton} onClick={togglePresent}>{presenting ? t('board.exitPresent') : t('board.present')}</button>
        <button type="button" className={css.toolButton} onClick={() => { downloadBoard(root.current as HTMLDivElement, board.title, t('actions.offline')) }}>{t('board.export')}</button>
      </div>
      <header className={css.boardHeader}>
        <h1 className={css.boardTitle}>{board.title}</h1>
        {board.subtitle !== undefined && <p className={css.boardSubtitle}>{board.subtitle}</p>}
        {board.summary !== undefined && <div className={css.boardSummary}><Markdown text={board.summary} /></div>}
        {!slides && total > 1 && (
          <nav className={css.contents} aria-label={t('board.contents')} data-cv-toolbar="">
            {board.sections.map((section, index) => (
              <button key={index} type="button" className={css.contentsItem}
                onClick={() => { root.current?.querySelector(`[data-section="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                <span className={css.contentsIndex}>{String(index + 1).padStart(2, '0')}</span>{section.title}
              </button>
            ))}
          </nav>
        )}
      </header>
      <div className={css.sections}>
        {board.sections.map((section, index) => (
          <section key={index} className={css.section} data-section={index} data-active={!slides || index === slide ? '' : undefined}
            style={{ '--cv-index': index } as CSSProperties}>
            <div className={css.sectionHead}>
              <span className={css.eyebrow}>{section.eyebrow ?? String(index + 1).padStart(2, '0')}</span>
              <h2>{section.title}</h2>
            </div>
            <BlockList blocks={section.blocks} />
          </section>
        ))}
      </div>
      {slides && total > 1 && (
        <div className={css.slideNav} data-cv-toolbar="">
          <button type="button" className={css.toolButton} disabled={slide === 0} onClick={() => { go(-1) }}>{t('board.previous')}</button>
          <span className={css.slideDots}>
            {board.sections.map((section, index) => (
              <button key={index} type="button" className={css.slideDot} data-active={index === slide ? '' : undefined}
                aria-label={section.title} onClick={() => { setSlide(index) }} />
            ))}
          </span>
          <span className={css.muted}>{t('board.slideCounter', { current: slide + 1, total })}</span>
          <button type="button" className={css.toolButton} disabled={slide === total - 1} onClick={() => { go(1) }}>{t('board.next')}</button>
        </div>
      )}
      {sources.length > 0 && <footer className={css.boardSources}><SourceList title={t('board.sources')} items={sources} /></footer>}
    </div>
  )
}

/**
 * Tab title: the board title once loaded.
 * @param props - tab identity and resource reader.
 * @returns the title text.
 */
export function BoardTitle({ useTabInfo, useResource }: PropsRuntime<'sidebar.right.pane.tab.title'>) {
  const tab = useTabInfo()
  const resource = useResource<'canvas-board'>(tab.tab.navigation.address)
  const history = resource.value
  const current = history?.versions[history.versions.length - 1]
  return <>{current?.board.title ?? tab.tab.title}</>
}
