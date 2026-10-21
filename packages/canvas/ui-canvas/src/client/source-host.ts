/** Short labels for sources without a publisher. */

/**
 * Read the host of a source URL without a leading `www.`.
 * @param url - source URL.
 * @returns the host, or the URL itself when it does not parse.
 */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch (_error) {
    return url /* Validation accepts any string URL; the raw text is the only label left. */
  }
}
