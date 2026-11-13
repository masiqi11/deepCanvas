---
description: "Web 客户端侧栏与空白会话位置的 DeepCanvas 品牌填充；供组装 DeepCanvas profile 的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-deepcanvas

[English](README.md) | 中文

## 概述

在侧栏显示 DeepCanvas 标识与名称，并在空白会话标题旁显示标识。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

[DeepCanvas profile 叠加层](../deepcanvas-bundle/README.zh.md)挂载本行，并停用官方品牌行。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`src/client/index.ts`](src/client/index.ts) 填充 `sidebar.brand.mark`、`sidebar.brand.name` 与 `conversation.hero.brand.mark`；每个填充都会等待对应声明。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[DeepCanvas profile 叠加层](../deepcanvas-bundle/README.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

None, as browser presentation only.

#### KV Cache 影响

无。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 无。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者上下文——点击展开</summary>

无。

</details>
