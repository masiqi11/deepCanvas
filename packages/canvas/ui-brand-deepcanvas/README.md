---
description: "DeepCanvas brand occupants for the Web client sidebar and blank-conversation slots, for users and maintainers composing the DeepCanvas profile."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-deepcanvas

English | [中文](README.zh.md)

## Summary

Shows the DeepCanvas mark and name in the sidebar, and the mark beside the blank-conversation headline.

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

The [DeepCanvas profile layer](../deepcanvas-bundle/README.md) mounts this row and disables the official brand row.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation details — click to expand</summary>

[`src/client/index.ts`](src/client/index.ts) fills `sidebar.brand.mark`, `sidebar.brand.name`, and `conversation.hero.brand.mark`; each occupant waits for its declaration.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

[DeepCanvas profile layer](../deepcanvas-bundle/README.md)

-----

<a id="model-experience"></a>
## Model Experience

None, as browser presentation only.

#### KV Cache effect

None.


## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- None.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Maintainer context — click to expand</summary>

None.

</details>
