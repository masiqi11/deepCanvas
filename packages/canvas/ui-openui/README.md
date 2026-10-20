---
description: "DeepCanvas interactive answers: openui fences in assistant replies rendered as live interfaces, for users and maintainers."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-openui

English | [中文](README.zh.md)

## Summary

An `openui` fence in an assistant reply renders as a live interface written in OpenUI Lang: calculators, checklists, comparisons, charts, step-by-step drawings, and small games. Inputs and buttons change the page locally without a model request; only an explicit submit sends a message, with the values on the page. A program that fails shows its problems and a button that asks the assistant to fix it.

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

Compose the row in a Web profile next to [the prompt section](../openui-prompt/README.md) that teaches the format:

```yaml
- id: ui-openui
  name: '@deepseek-ai/dsh-client-ui-openui'
```

Change any input or tick any item in an answer; the page updates at once. Buttons that continue the conversation send their message as your next turn.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`src/client/index.ts`](src/client/index.ts) claims the `openui` and `openui-lang` keys of the `conversation.chat.markdown.fence` slot. [`OpenUIFence.tsx`](src/client/OpenUIFence.tsx) renders the fence with the `@openuidev/react-lang` renderer against [`library.ts`](src/client/library.ts), keeps page state per fence while the page is open, maps `@ToAssistant` to the Session composer, opens only http(s) links, and shows blocking parser problems once the reply settles. The components in [`library/`](src/client/library) and the functions in [`functions/`](src/client/functions) are adapted from Open Intelligent UI (MIT, Copyright (c) 2026 Thesys Inc.); photo search, street maps, and video embeds are left out because they need the network. [`prompt-options.ts`](src/client/prompt-options.ts) holds the rules and examples the host prompt is generated from. `HtmlView` pages run in `sandbox="allow-scripts"` frames whose policy blocks all network access.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[Prompt section](../openui-prompt/README.md) · [Boards](../ui-canvas/README.md)

-----

<a id="model-experience"></a>
## Model Experience

None, as the package renders recorded replies and adds no model-visible input; the prompt it teaches lives in the prompt package.

#### KV Cache effect

None.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Page state lives in memory: reloading the page restores each fence to its defaults.
- The browser bundle carries its own KaTeX and zod copies, about 1.3 MB.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

After changing a component schema, a function, or `prompt-options.ts`, run the prompt spec with `DSH_WRITE_OPENUI_PROMPT=1` to rewrite the generated reference in the prompt package; the spec fails while the two differ.

</details>
