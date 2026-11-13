/**
 * The canvas bridge protocol and the isolated document wrapped around html blocks.
 *
 * The frame runs with `sandbox="allow-scripts"` and no same-origin grant, so
 * it has an opaque origin: it cannot read the host page, cookies, storage, or
 * credentials. A Content-Security-Policy blocks every network request. The
 * page talks to the host only through `deepcanvas.bridge/1` messages, which
 * the host accepts from this frame's window alone.
 */

/** Protocol tag carried by every bridge message. */
export const BRIDGE_PROTOCOL = 'deepcanvas.bridge/1'

/** Frame height bounds in CSS pixels. */
export const MIN_HEIGHT = 80
/** Frame height bounds in CSS pixels. */
export const MAX_HEIGHT = 1600

/** Messages the frame may send to the host. */
export type BridgeMessage =
  | { readonly protocol: typeof BRIDGE_PROTOCOL; readonly type: 'resize'; readonly height: number }
  | { readonly protocol: typeof BRIDGE_PROTOCOL; readonly type: 'error'; readonly message: string }
  | { readonly protocol: typeof BRIDGE_PROTOCOL; readonly type: 'prompt'; readonly text: string }
  | { readonly protocol: typeof BRIDGE_PROTOCOL; readonly type: 'open-source'; readonly url: string }

/**
 * Parse an untrusted message posted by a frame.
 * @param data - `MessageEvent.data` from the frame.
 * @returns the bridge message, or undefined when the data is not a well-formed bridge message.
 */
export function parseBridgeMessage(data: unknown): BridgeMessage | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const message = data as Record<string, unknown>
  if (message.protocol !== BRIDGE_PROTOCOL) return undefined
  switch (message.type) {
    case 'resize':
      return typeof message.height === 'number' && Number.isFinite(message.height)
        ? { protocol: BRIDGE_PROTOCOL, type: 'resize', height: message.height } : undefined
    case 'error':
      return typeof message.message === 'string' ? { protocol: BRIDGE_PROTOCOL, type: 'error', message: message.message.slice(0, 500) } : undefined
    case 'prompt':
      return typeof message.text === 'string' && message.text.trim() !== '' ? { protocol: BRIDGE_PROTOCOL, type: 'prompt', text: message.text.slice(0, 2000) } : undefined
    case 'open-source':
      return typeof message.url === 'string' ? { protocol: BRIDGE_PROTOCOL, type: 'open-source', url: message.url } : undefined
    default:
      return undefined
  }
}

/** Script injected ahead of the model page: reports size and errors, and exposes the bridge API. */
const BRIDGE_SCRIPT = `(() => {
  const P = '${BRIDGE_PROTOCOL}';
  const post = message => parent.postMessage(Object.assign({ protocol: P }, message), '*');
  window.deepcanvas = {
    ask: text => post({ type: 'prompt', text: String(text) }),
    openSource: url => post({ type: 'open-source', url: String(url) }),
  };
  addEventListener('error', event => post({ type: 'error', message: String(event.message || event.error || 'error') }));
  addEventListener('unhandledrejection', event => post({ type: 'error', message: String(event.reason && event.reason.message || event.reason) }));
  const size = () => post({ type: 'resize', height: Math.ceil(document.documentElement.scrollHeight) });
  addEventListener('load', size);
  new ResizeObserver(size).observe(document.documentElement);
})();`

const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:"

/**
 * Wrap model HTML into the isolated document the frame loads.
 * @param html - model-authored page or fragment.
 * @returns the complete `srcdoc` text with the policy and bridge first in `<head>`.
 */
export function frameDocument(html: string): string {
  const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1"><script>${BRIDGE_SCRIPT}</script>`
    + '<style>html,body{margin:0;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}</style>'
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, match => `${match}${head}`)
    : `<!doctype html><html><head>${head}</head><body>${html}</body></html>`
}
