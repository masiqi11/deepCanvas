---
description: "Web 界面之上的 DeepCanvas 产品叠加层：品牌、带画布工具的 DeepCanvas agent preset，以及精简的产品插件表；供启动 DeepCanvas 的用户阅读。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-deepcanvas

[English](README.md) | 中文

## 概述

`deepcanvas` profile 在 base 与 Web 组合包之上叠加本层。它设置产品名称，用一个 DeepCanvas preset 替换随附 preset（包含网页研究、澄清、任务清单、文件工具、`openui` 交互式回答和画布看板），并移除 Harness 开发相关界面、插件管理与内置插件设置、Agent 模式切换以及模型发布标识。

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

在源码目录运行 `pnpm deepcanvas`；终端打印 `DeepCanvas: <url>` 并打开浏览器。在应用内或通过 `DEEPSEEK_API_KEY` 配置 DeepSeek API Key。Web 参数写在命令之后，例如 `pnpm deepcanvas --no-open --port 3080`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`cordis.patch.yml`](cordis.patch.yml) 停用身份行、官方品牌、插件管理、开发上下文和四个随附 preset；插入品牌、画布 Web 界面和 `deepcanvas` preset；并设置终端标签。profile 模板位于 [app-boot](../../boot/app-boot/README.zh.md)。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[画布工具](../tool-canvas/README.zh.md) · [Web 界面](../ui-canvas/README.zh.md) · [设计说明](../../../deepcanvas/DESIGN.md)

-----

<a id="model-experience"></a>
## 模型体验

Indirectly, through the composed persona and [canvas tools](../tool-canvas/README.zh.md), which own model context and results.

#### KV Cache 影响

preset 提示词在各 Session 间保持不变。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 开始第一个任务前仍需要选择工作区目录。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者上下文——点击展开</summary>

无。

</details>
