---
description: "DeepCanvas Web surfaces: inline visual components, building and published board cards, and the versioned board workspace, for users and maintainers."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-canvas

English | [中文](README.zh.md)

## Summary

While `show_ui` arguments stream, complete components appear one by one; after the call succeeds the final components stay under the reply. A `canvas_board` call shows a card that reports the section being built and opens the board when it is published. The right Sidebar board tab reads every version from Session history, updates when a new version arrives, pages slides, presents full screen, and exports one offline HTML file.

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

Compose the row in a Web profile next to [the canvas tools](../tool-canvas/README.md):

```yaml
- id: ui-canvas
  name: '@deepseek-ai/dsh-client-ui-canvas'
```

In a board, change the version in the toolbar, choose **Present** for full screen, and **Export HTML** to save the current version. Follow-up buttons send their prompt as your next message.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`src/client/index.ts`](src/client/index.ts) registers the `show_ui` and `canvas_board` tool views, a hidden `canvas-visual` Chat node folded from `tool/call` and `canvas/board` events for the Turn tail, the `canvas-board` resource, and the workspace tab. [`board-resource.ts`](src/client/board-resource.ts) pages history once, then follows new events. Components render in [`Blocks.tsx`](src/client/Blocks.tsx) and [`Chart.tsx`](src/client/Chart.tsx). [`HtmlFrame.tsx`](src/client/HtmlFrame.tsx) runs html blocks in `sandbox="allow-scripts"` frames with a network-blocking policy and accepts `deepcanvas.bridge/1` messages only from its own frame window.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[Component vocabulary](../canvas-spec/README.md) · [Canvas tools](../tool-canvas/README.md)

-----

<a id="model-experience"></a>
## Model Experience

None, as the package renders recorded calls and adds no model-visible input.

#### KV Cache effect

None.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Export copies the page style rules and shows every tab and slide; interactive tables and calculators keep their default state offline.
- A frame request to ask the agent fills the composer and waits for the user to send it.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

Board content is read from logged `canvas_board` arguments; the projection on the host only numbers versions.

</details>
