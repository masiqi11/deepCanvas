// Decode one DSH session log into its events.
// A log is <DSH_HOME>/sessions/*/*/session.v4.jsonl.zstd: concatenated zstd frames of JSON lines.
// Event types used by the evaluation: user/message, assistant/message, tool/call, turn/start, turn/end, step/start.
//
// Usage: node deepcanvas/eval/readlog.mjs <session.v4.jsonl.zstd>   prints one event per line
import fs from 'node:fs'
import zlib from 'node:zlib'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/**
 * @param {string} file - path of a session log.
 * @returns {object[]} the events in log order; frames or lines that do not decode are skipped.
 */
export function readLog(file) {
  const bytes = fs.readFileSync(file)
  const starts = []
  for (let at = bytes.indexOf(MAGIC); at !== -1; at = bytes.indexOf(MAGIC, at + 4)) starts.push(at)
  const events = []
  for (const [k, start] of starts.entries()) {
    let text
    try {
      text = zlib.zstdDecompressSync(bytes.subarray(start, starts[k + 1] ?? bytes.length)).toString()
    } catch {
      continue // The magic bytes can also occur inside a frame's payload; such a slice is not a frame.
    }
    for (const line of text.split('\n')) {
      if (line === '') continue
      try {
        events.push(JSON.parse(line))
      } catch {
        // A line cut at a frame boundary is not an event.
      }
    }
  }
  return events
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const event of readLog(process.argv[2])) console.log(JSON.stringify(event))
}
