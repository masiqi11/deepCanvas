---
description: "Model-facing DeepCanvas tools: show_ui for inline visual components and canvas_board for versioned workspace boards, for users and maintainers composing agent presets."
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-canvas

English | [中文](README.zh.md)

## Summary

`show_ui` displays validated components in the conversation, and `canvas_board` publishes a complete board to the workspace as a new immutable version. Invalid arguments return every problem with its path and publish nothing. A prompt section tells the model when to answer in text, components, or a board (components carry structured content and text only connects it), and how to cite evidence.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Add the plugin to an agent preset with explicit limits:

```yaml
- id: tool-canvas
  name: '@deepseek-ai/dsh-tool-canvas'
  config:
    showUi: true
    limits: { blocks: 60, sections: 24, items: 200, series: 12, depth: 3, text: 20000, html: 200000 }
```

Set `showUi: false` when inline answers use the reply's own interface format, such as [`openui` fences](../openui-prompt/README.md); the guidance then points inline answers there and only `canvas_board` is registered.

Compose [the Web surfaces](../ui-canvas/README.md) so users see the results. Omitting `board_id` creates a board; passing an id from an earlier result publishes the next version.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`src/index.ts`](src/index.ts) registers both tools, the host-only `canvasBoards` projection, and the `canvas:presentation` prompt section. A successful `canvas_board` result appends `canvas/board` with the board id, version, call id, and title; the content stays in the logged call arguments. Versions are reserved per Session so concurrent revisions receive distinct numbers.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[Component vocabulary](../canvas-spec/README.md) · [Web surfaces](../ui-canvas/README.md)

-----

<a id="model-experience"></a>
## Model Experience

### show_ui

#### What the model sees

The schema asks for `blocks` (each with a `type` from the component list) and optional `sources`. The description points to the "Presenting results" prompt section and its component reference. A success reads `Displayed N component(s) to the user.`; a failure lists each problem with its JSON path.

#### Token effect

One schema plus the shared guidance section; one short result line per call.

#### KV Cache effect

The schema and section are static per preset.

### canvas_board

#### What the model sees

The schema asks for `title`, `layout` (`report` or `slides`), `sections`, and optional `board_id`, `subtitle`, `summary`, and `sources`. A success reads `Published board "<title>" (board_id <id>, version <n>). The user can open it from the conversation.`

#### Token effect

The complete board travels in the call arguments of each version.

#### KV Cache effect

The schema is static; each version appends its arguments to history.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Each board version carries the complete board; there is no partial update.
- HTML blocks are not executed or checked on the host; the client reports runtime errors from the frame.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

None.

</details>
