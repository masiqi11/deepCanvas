---
description: "Canvas component vocabulary for DeepCanvas: block and board types, validation with path-specific problems, and calculator formulas, for tool and client authors."
kind: "package-reference"
---

# @deepseek-ai/dsh-canvas-spec

English | [中文](README.zh.md)

## Summary

This library defines the JSON that DeepCanvas models write and the Web client renders: 19 component kinds, inline canvases, and boards with report or slide layouts. Validation reports each problem with its JSON path, so a tool can return the list to the model for repair. Calculator formulas parse into a tree and evaluate without running code.

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

Import `validateInline`, `validateBoard`, `validateSection`, or `validateBlock` and pass untrusted JSON; each returns `{ ok: true, value }` or `{ ok: false, problems }` with at most 20 problems. Pass a `CanvasLimits` object to change size bounds; `DEFAULT_LIMITS` matches the shipped tool configuration. Use `parseFormula` and `evaluateFormula` for calculator outputs; `formulaNames` lists the variables a formula reads.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`src/types.ts`](src/types.ts) holds the vocabulary. [`src/validate.ts`](src/validate.ts) walks a description once, checks types, enumerations, list sizes, nesting depth, table and chart shape, calculator formulas, and that every cited source id is registered. [`src/formula.ts`](src/formula.ts) is a precedence-climbing parser over numbers, input names, arithmetic, comparison, logic, conditionals, and a fixed function list.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[Canvas tools](../tool-canvas/README.md) and [Web surfaces](../ui-canvas/README.md) consume this vocabulary.

-----

<a id="model-experience"></a>
## Model Experience

None, as a pure vocabulary and validation library; the [canvas tools](../tool-canvas/README.md) put validation problems into tool results.

#### KV Cache effect

None.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Validation accepts unknown extra fields; renderers ignore them.
- Formulas evaluate in double-precision floating point.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

The client bundles this package inline; it must stay free of Node, React, and Cordis imports.

</details>
