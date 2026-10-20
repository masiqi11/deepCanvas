---
description: "The DeepCanvas product layer over the Web surface: brand, the DeepCanvas agent preset with canvas tools, and a trimmed roster, for users launching DeepCanvas."
kind: "package-bundle"
---

# @deepseek-ai/dsh-deepcanvas

English | [中文](README.zh.md)

## Summary

The `deepcanvas` profile stacks this layer on the base and Web bundles. It names the product, replaces the shipped presets with one DeepCanvas preset that includes web research, clarification, todo tracking, file tools, interactive `openui` answers, and canvas boards, and removes Harness development surfaces, the plugin manager and built-in plugin settings, the agent mode switch, and the model-release badge.

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

From a checkout, run `pnpm deepcanvas`; it prints `DeepCanvas: <url>` and opens the browser. Configure a DeepSeek API key in the app or through `DEEPSEEK_API_KEY`. Pass Web flags after the command, for example `pnpm deepcanvas --no-open --port 3080`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`cordis.patch.yml`](cordis.patch.yml) disables the identity line, the official brand, plugin management, developer context, and the four shipped presets; inserts the brand, the canvas Web surfaces, and the `deepcanvas` preset; and sets the console label. The profile template lives in [app-boot](../../boot/app-boot/README.md).

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[Canvas tools](../tool-canvas/README.md) · [Web surfaces](../ui-canvas/README.md) · [Design notes](../../../deepcanvas/DESIGN.md)

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the composed persona and [canvas tools](../tool-canvas/README.md), which own model context and results.

#### KV Cache effect

The preset prompt is static across Sessions.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Sessions still require choosing a workspace directory before the first task.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

None.

</details>
