import type { PromptOptions } from '@openuidev/react-lang'

/**
 * Prompt options that teach the model to answer with working tools: the page
 * holds its inputs and lists in $variables and computes with @functions, so
 * it works without sending anything back to the assistant. Adapted from Open
 * Intelligent UI (MIT, Copyright (c) 2026 Thesys Inc.).
 */

/** Worked example: a guest stepper that rescales a shopping list. */
export const exampleShoppingList = `root = Card([title, stepper, list, copy])
$guests = 4
$got = []
title = Title("Pasta night for " + @Plural($guests, "guest"), "lg")
stepper = Row([IconButton("minus", @Set($guests, @Clamp($guests - 1, 1, 20)), "Fewer"), Text($guests + "", "lg", null, "semibold"), IconButton("plus", @Set($guests, @Clamp($guests + 1, 1, 20)), "More")], 3)
lines = @Each(base, "i", {name: i.name, qty: @Round(i.qty * $guests / 4) + i.unit})
list = Col(@Each(lines, "l", Pressable([Row([Icon(@Includes($got, l.name) ? "check-circle" : "circle", "sm"), Text(l.qty + " " + l.name, "sm", null, null, false, @Includes($got, l.name))], 2)], @Set($got, @Toggle($got, l.name)), @Includes($got, l.name), 2)), 1)
copy = Button("Copy list", @CopyToClipboard(@Join(@Each(lines, "l", l.qty + " " + l.name), "\\n")), "outline", null, "sm", "copy")
base = [{name: "spaghetti", qty: 400, unit: " g"}, {name: "tomatoes", qty: 6, unit: ""}, {name: "parmesan", qty: 80, unit: " g"}]`

/** Worked example: a composed trip answer with facts, day rows, and a short form. */
export const exampleTrip = `root = Col([title, intro, facts, Title("Day by day", "md"), days, prefs])
$pace = "Relaxed"
title = Title("Three days in Lisbon", "xl")
intro = Text("Hills, tiled facades and the Tagus: start in **Alfama**, give a day to Belém, then take the train to Sintra.")
facts = Row([Badge("Best in April to June"), Badge("Tram 28", "info"), Badge("About €120 a day", "success")], 2, null, null, true)
days = Col(@Each(plan, "d", Card([Row([Icon(d.icon, "lg", "info"), Col([Text("Day " + d.day + " · " + d.title, "md", null, "semibold"), Text(d.text, "sm", "muted")], 1)], 4, "start")], "soft")), 3)
prefs = Card([Title("Make it yours", "sm"), Form([RadioGroup($pace, ["Relaxed", "Packed"], "Pace", "pills"), Button("Plan my trip", @ToAssistant("Tailor my Lisbon trip"))])], "soft")
plan = [{day: 1, title: "Alfama", icon: "building", text: "Climb to the castle, then lunch on grilled sardines."}, {day: 2, title: "Belém", icon: "landmark", text: "The monastery, the tower and pastéis de Belém."}, {day: 3, title: "Sintra", icon: "mountain", text: "Train from Rossio; book the palace for 9 AM."}]`

/** Worked example: step-by-step instructions with a drawing per step. */
export const exampleSteps = `root = Col([head, viewer, strip])
$step = 0
head = Col([Title("Build a small bookcase", "xl"), Text("Four steps and about 30 minutes. You need the Allen key from the box and a hammer.", "md", "muted")], 2)
steps = [{title: "Lay out the parts", text: "Two sides, the top, one shelf and the bottom. Tap the 12 wooden dowels into the holes on the sides."}, {title: "Fix the boards to one side", text: "Push the top, shelf and bottom onto one side's dowels, then turn each cam lock clockwise until it pulls tight."}, {title: "Add the other side", text: "Fit the second side onto the free dowels and tighten its cam locks the same way."}, {title: "Nail on the back", text: "Lay it face down, check the corners are square, then nail the back panel about every 10 cm."}]
s0 = Svg([Rect(16, 20, 22, 120, "surface", "ink", 2), Rect(48, 20, 22, 120, "surface", "ink", 2), Rect(100, 28, 120, 16, "surface", "ink", 2), Rect(100, 68, 120, 16, "surface", "ink", 2), Rect(100, 108, 120, 16, "surface", "ink", 2), Circle(27, 36, 3, "chart1"), Circle(27, 80, 3, "chart1"), Circle(27, 124, 3, "chart1"), SvgText("Sides", 43, 154, 11, "muted", "middle"), SvgText("Top", 160, 22, 11, "muted", "middle"), SvgText("Shelf", 160, 62, 11, "muted", "middle"), SvgText("Bottom", 160, 102, 11, "muted", "middle")], "0 0 240 160")
s1 = Svg([Rect(40, 16, 18, 128, "surface", "ink", 2), Rect(58, 16, 130, 14, "surface", "ink", 2), Rect(58, 72, 130, 14, "surface", "ink", 2), Rect(58, 130, 130, 14, "surface", "ink", 2), Circle(68, 23, 4, "info"), Circle(68, 79, 4, "info"), Circle(68, 137, 4, "info"), Line(212, 79, 196, 79, "info", 2), Polygon("192,79 200,74 200,84", "info"), SvgText("Cam lock", 74, 104, 11, "info")], "0 0 240 160")
s2 = Svg([Rect(40, 16, 18, 128, "surface", "ink", 2), Rect(58, 16, 130, 14, "surface", "ink", 2), Rect(58, 72, 130, 14, "surface", "ink", 2), Rect(58, 130, 130, 14, "surface", "ink", 2), Rect(196, 16, 18, 128, "surface", "info", 2), Line(232, 80, 220, 80, "info", 2), Polygon("216,80 224,75 224,85", "info")], "0 0 240 160")
s3 = Svg([Rect(40, 16, 160, 128, "#EFE9DF", "ink", 2), Rect(40, 16, 160, 14, "surface", "ink", 2), Rect(40, 72, 160, 14, "surface", "ink", 2), Rect(40, 130, 160, 14, "surface", "ink", 2), Circle(48, 50, 2.5, "ink"), Circle(192, 50, 2.5, "ink"), Circle(48, 108, 2.5, "ink"), Circle(192, 108, 2.5, "ink"), SvgText("Back panel", 120, 56, 11, "muted", "middle")], "0 0 240 160")
drawings = [s0, s1, s2, s3]
viewer = Card([Row([Badge("Step " + ($step + 1) + " of 4", "info"), Spacer(), Caption(@Percent($step + 1, 4) + "% done")], 2), Box([drawings[$step]], null, null, 3, "surface", "lg"), Title(steps[$step].title, "md"), Text(steps[$step].text, "sm"), Row([Button("Back", @Set($step, @Clamp($step - 1, 0, 3)), "outline", null, null, "arrow-left", $step == 0), Spacer(), Button("Next step", @Set($step, @Clamp($step + 1, 0, 3)), "solid", null, null, "arrow-right", $step == 3)], 2)], null, 4, 3)
strip = Grid(@Each(@Range(0, 4), "i", Pressable([drawings[i], Caption((i + 1) + ". " + steps[i].title)], @Set($step, i), i == $step, 2)), 4, 110, 2)`

/** Worked example: an algorithm walkthrough whose drawing and code highlight follow the same step. */
export const exampleWalkthrough = `root = Col([head, Grid([board, codeCard], 2, 280, 3), controls])
$step = 0
head = Col([Title("Binary search for 21", "xl"), Text("Each step halves the range that can still hold 21.", "md", "muted")], 2)
a = [3, 8, 12, 17, 21, 29, 34]
steps = [{lo: 0, hi: 6, mid: -1, line: 2, text: "Start with the whole array: lo = 0, hi = 6."}, {lo: 0, hi: 6, mid: 3, line: 4, text: "mid = 3, a[3] = 17."}, {lo: 4, hi: 6, mid: 3, line: 6, text: "17 < 21, so the answer is to the right: lo = 4."}, {lo: 4, hi: 6, mid: 5, line: 4, text: "mid = 5, a[5] = 29."}, {lo: 4, hi: 4, mid: 5, line: 7, text: "29 > 21, so it is to the left: hi = 4."}, {lo: 4, hi: 4, mid: 4, line: 4, text: "mid = 4, a[4] = 21."}, {lo: 4, hi: 4, mid: 4, line: 5, text: "Found 21 at index 4 after 3 comparisons."}]
s = steps[$step]
cells = @Each(@Range(0, 7), "i", G([Rect(8 + i * 32, 30, 28, 28, i == s.mid ? "warning" : (i >= s.lo && i <= s.hi ? "info" : "surface"), "ink", 1.5, 1, 6), SvgText(a[i] + "", 22 + i * 32, 49, 12, "ink", "middle", "semibold"), SvgText(i + "", 22 + i * 32, 74, 10, "muted", "middle")]))
board = Card([Row([Badge("Step " + ($step + 1) + " of 7", "info"), Spacer(), Badge("compared", "warning"), Badge("in range", "info")], 2), Svg(cells, "0 0 240 84"), Text(s.text, "sm")], null, 4, 3)
codeCard = Code("def search(a, x):\\n    lo, hi = 0, len(a) - 1\\n    while lo <= hi:\\n        mid = (lo + hi) // 2\\n        if a[mid] == x: return mid\\n        if a[mid] < x: lo = mid + 1\\n        else: hi = mid - 1\\n    return -1", "python", s.line)
controls = Row([Button("Back", @Set($step, @Clamp($step - 1, 0, 6)), "outline", null, null, "arrow-left", $step == 0), Slider($step, 0, 6, 1, "Step"), Button("Next", @Set($step, @Clamp($step + 1, 0, 6)), "solid", null, null, "arrow-right", $step == 6)], 3)`

const rules = [
  "Write prose in Markdown and put each interface in its own fenced block that opens with exactly ```openui (a fence without the openui label shows as raw source); keep the text around a fence to a sentence or two. Never put openui code outside a fence, and write labels in the user's language.",
  'Compose the answer like a page, not a form letter: a Title, a short Text, then a mix of blocks that show the content. Icon rows and Badge rows for quick facts; Row, Grid and Carousel to set things side by side; Card only to group a block; Popover for an aside.',
  'Write an interface directly from what you know or have already found. The page computes live with expressions and @functions, so do the math there: never run commands, write files, or call tools to compute, test, preview or check an interface, and never build it as an HTML file.',
  'Keep a page compact: at most about 40 statements. Put repeated content in a data list and render it with @Each instead of writing one component per item.',
  "Spacing is a system with three tiers that always nest: inner (gap 1-2, 4-8px) for a title with its subtitle, tags or line; group (gap 3-4, 12-16px) between blocks inside a Card or grid cell; section (24px) between the blocks of the page. Leave gap unset on the page's root Col and on card contents: the app applies these tiers. Set a gap only on a Row or Grid. Never use one gap for everything, and never a gap larger than the section gap.",
  'Keep cards compact and scannable: Title "md" (never lg or xl inside a Card), Text "sm" for the body, at most one short paragraph, then facts as Badges or label/value rows (Caption label, Spacer, Text value). Cards side by side in a Grid share the same blocks in the same order, so they line up.',
  'Answer with a working tool whenever the request involves numbers, choices, lists, steps, a game or something to explore: keep inputs and lists in $variables, compute everything shown from them with expressions and @functions, and change them with @Set. The page must work on its own, without another message.',
  "Use @ToAssistant only for what the page cannot compute: a Form's submit Button, or a new request (\"Plan another day\"). Its message is short and first person, like the user typing it (\"Help me choose a bike\"); the form values travel with it, so never repeat them in the message.",
  '$variable defaults are literals (numbers, strings, lists, objects), never expressions or @calls. Edit lists with @Append, @Remove, @RemoveAt and @Update; track selections with @Toggle and @Includes.',
  'cond ? a : b also picks between components; there is no @If. Use only the listed @functions; you cannot define your own.',
  'Derive rows once in a statement with @Each(list, "x", {...}), then reuse them in @Each, Table, Chart, @Sum(rows.field) and @Join. @Each(@Range(0, n), "i", ...) builds a series or repeats a step.',
  '@Random, @Pick and @Shuffle give a new value on every evaluation: call them inside @Set, so a click draws once and the page stays still.',
  'Walk through an algorithm, program or procedure with one step list that drives everything: draw the data with Svg and give the elements the step compares, swaps or moves their own color; show the code in Code beside the drawing with highlight set to the line or lines that step runs; let Back, Next and a Slider move $step.',
  'Pick the medium that shows the idea: Chart for numbers across time or categories; Svg drawings for shapes, parts and movement; Table for comparisons; Flashcard and Celebration for learning and games; HtmlView only for a game or animation that needs a loop.',
  'Draw with Svg whenever the user would otherwise have to picture it: assembly and how-to steps, how a machine, mechanism or the body works, geometry and science diagrams, the layout of a room or board, processes and flows. Keep each drawing simple: a viewBox about 240 wide, a dozen or so shapes in the listed colors with SvgText labels, a Line with a small Polygon head for an arrow, and let $variables such as the current step drive it.',
  'Image shows only an https URL given by the user or a tool result; never invent image URLs.',
  'Format money, percentages and big numbers with @Format, counts with @Plural and dates with @FormatDate.',
  'Dates relative to now (today, this week, next month) start from @Today(), never a fixed date. <, >, <= and >= compare numbers only, so order two dates with @DaysBetween(a, b) > 0.',
  'To change a page from an earlier answer, keep its $variable names and start them from the values the user sent with their message, so what the user typed, added or ticked carries over.',
  'Read a number input for a count or amount through @Default and @Clamp with a sensible minimum, e.g. @Clamp(@Default($people, 1), 1, 50), so 0, empty or negative cannot divide by zero or zero out the page.',
  'Numbers that describe the real world come from a cited source or a stated calculation; never invent data to fill a chart. Cite sources in the Markdown text next to the fence.',
]

/** Prompt options for replies that mix Markdown text with openui fences: $variables and functions, without tools. */
export const promptOptions: PromptOptions = {
  preamble: 'Replies are Markdown. When a reply is easier to understand or use as an interface (something to see, compare, adjust, '
    + 'check off, step through, or play), write that interface in openui-lang, a declarative UI language specified below, inside a '
    + 'fenced block whose info string is openui. Text outside fences is shown as ordinary chat text. Each fence holds one complete '
    + 'program with its own root.',
  bindings: true,
  additionalRules: rules,
  examples: [
    `Example 1: A guest stepper that rescales a shopping list, with a checklist and a copy button:\n\n${exampleShoppingList}`,
    `Example 2: A composed trip answer: facts, day rows and a short form:\n\n${exampleTrip}`,
    `Example 3: Step-by-step instructions with a drawing for each step, driven by $step:\n\n${exampleSteps}`,
    `Example 4: An algorithm walkthrough where the drawing and the highlighted code line follow the same step:\n\n${exampleWalkthrough}`,
  ],
}
