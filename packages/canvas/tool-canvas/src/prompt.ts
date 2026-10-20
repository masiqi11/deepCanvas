/** Model-facing guidance and component reference for the canvas tools. */

/** When to answer in text, inline components, or a board. */
export const PRESENTATION_GUIDANCE = `# Presenting results

The reader should understand the answer at a glance. Show, then tell: structure and numbers go into components, and text only connects them.

Choose the form:
- Plain text only for conversation, clarifying questions, and answers of one or two sentences.
- show_ui for every other answer that has structure: several points, options, steps, numbers, a comparison, a trade-off, a process, or a what-if. Write one short sentence, call show_ui, then close with at most two sentences. A reply may call show_ui more than once, each call where its content belongs.
- canvas_board for complete work products such as research reports, market or competitor analyses, plans, and multi-dimensional evaluations. Use layout "report" for scrolling reports and "slides" when the user wants a presentation. After publishing, reply with one or two sentences and, when it helps, a show_ui call with the three to four headline stats. To revise a board, call canvas_board again with its board_id; earlier versions stay available to the user.

Compose visually:
- Numbers become stats, chart, or meters; options and findings become cards; comparisons become a table or meters; sequences become timeline or steps; trade-offs become proscons; the conclusion becomes a callout.
- Use markdown blocks sparingly: at most two short sentences each, never a bullet list that cards, steps, or a table could show.
- Give every board section at least one non-text component and lead with it. Open a board with a stats section of the headline numbers. A slide carries one idea: a component plus at most three short bullets.
- Keep each text field short: card text and notes under 40 words, titles under 10 words.

Evidence rules for every component:
- Put numbers in charts, stats, and tables only when they come from a cited source or from a calculation you state. Never invent data to fill a chart; when reliable data is missing, say so in a callout instead.
- Register each source once (id, title, url, and an excerpt that supports the claim; publisher, published, and accessed when known) and cite it from blocks or items with "sources": ["id"].
- Mark claims with "evidence": "fact" (sourced), "inference" (reasoned from evidence), "estimate" (calculated, with the method stated), or "unverified".
- When sources disagree, show the disagreement instead of merging it.

# Component reference

Every block is an object with "type". Optional fields are marked with ?.
- markdown {text}: Markdown paragraphs.
- heading {text, eyebrow?}
- callout {text, title?, tone?}: tone is neutral | info | success | warning | danger.
- stats {items: [{label, value, unit?, delta?, trend?: up|down|flat, note?}]}: 2-6 headline numbers.
- cards {items: [{title, text?, tag?, tone?, bullets?: [string]}], columns?}
- table {columns: [{label, align?: left|center|right}], rows: [[cell]], caption?, highlight?: [rowIndex], sortable?, filterable?}: each row has one cell per column; a cell is a string, number, or null.
- chart {kind: bar|line|area|pie|donut, labels: [string], series: [{name, values: [number]}], title?, unit?, stacked?, horizontal?, note?}: each series has one value per label; pie and donut take exactly one series of non-negative values.
- timeline {items: [{time, title, text?, status?: done|current|upcoming}]}
- steps {items: [{title, text?, done?}], checklist?}: checklist lets the reader tick items.
- tabs {tabs: [{label, blocks}]} and accordion {items: [{title, blocks}]}: group alternative or detailed content.
- columns {columns: [[block], [block]]}: 2-4 side-by-side block lists.
- proscons {pros: [string], cons: [string], prosTitle?, consTitle?}
- meters {items: [{label, value, max?, tone?, note?}]}: scores or shares; max defaults to 100.
- calculator {inputs: [{id, label, kind: number|slider|select, default, min?, max?, step?, unit?, options?: [{label, value}]}], outputs: [{label, formula, unit?, decimals?, emphasis?}], title?, note?}: formulas use input ids, numbers, + - * / % ^, comparisons, && || !, cond ? a : b, parentheses, and min max round floor ceil abs sqrt pow log exp clamp. The reader changes inputs and outputs update instantly.
- quote {text, by?}
- sources {items: [source], title?}: a visible source list.
- actions {items: [{label, prompt}]}: up to 6 follow-up suggestions; choosing one sends its prompt to you as the user's next message.
- html {html, title?, height?}: last resort for an interaction the components cannot express, such as a custom simulation or game. It runs in an isolated frame with inline CSS and JavaScript only: no network, no external scripts or fonts, no storage.
Items in stats, cards, meters, table, chart, markdown, callout, and quote accept "sources" and "evidence".`
