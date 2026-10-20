---
description: "The canvas group map: the DeepCanvas packages that turn answers and work products into visual components and versioned boards, for users and maintainers navigating the group."
kind: "package-group"
---

# packages/canvas

English | [中文](README.zh.md)

## Summary

The canvas family delivers results as visuals instead of long text. The model writes component descriptions through two tools; the Web client renders them inline in the conversation or as a versioned board in the workspace. The family also contains the DeepCanvas product layer and brand. Compose it through the `deepcanvas` profile.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

| Package | Role | ctx key |
|---|---|---|
| [`canvas-spec`](canvas-spec/README.md) | Component vocabulary, validation, and calculator formulas | library, no ctx key |
| [`tool-canvas`](tool-canvas/README.md) | `show_ui` and `canvas_board` tools and the presentation guidance | registers on `ctx.tools`, `ctx.sessionProjections`, `ctx.systemPrompt` |
| [`ui-canvas`](ui-canvas/README.md) | Inline components, board cards, and the board workspace tab | registers slots, a resource, and a Sidebar tab type |
| [`ui-brand-deepcanvas`](ui-brand-deepcanvas/README.md) | DeepCanvas mark and name in the brand slots | registers slots |
| [`deepcanvas-bundle`](deepcanvas-bundle/README.md) | The DeepCanvas profile layer | bundle, no ctx key |

-----

<a id="related-documentation"></a>
## Related documentation

- [DeepCanvas design notes](../../deepcanvas/DESIGN.md) — product scope, the presentation model, and the record of upstream changes.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
