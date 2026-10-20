---
description: "面向模型的 DeepCanvas 工具：用于内联可视化组件的 show_ui，与用于带版本工作区看板的 canvas_board；供组装 agent preset 的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-canvas

[English](README.md) | 中文

## 概述

`show_ui` 在对话中显示校验后的组件；`canvas_board` 把完整看板作为不可变的新版本发布到工作区。参数无效时返回每个问题及其路径，并且不发布任何内容。提示词片段告诉模型何时用文字、组件或看板回答（结构化内容优先用组件，文字只作衔接），以及如何引用证据。

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

在 agent preset 中加入本插件，并写明限制：

```yaml
- id: tool-canvas
  name: '@deepseek-ai/dsh-tool-canvas'
  config:
    limits: { blocks: 60, sections: 24, items: 200, series: 12, depth: 3, text: 20000, html: 200000 }
```

同时组装 [Web 界面](../ui-canvas/README.zh.md)，用户才能看到结果。省略 `board_id` 会新建看板；传入先前结果中的编号会发布下一个版本。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`src/index.ts`](src/index.ts) 注册两个工具、仅 host 使用的 `canvasBoards` 投影和 `canvas:presentation` 提示词片段。`canvas_board` 成功后追加 `canvas/board` 事件，记录看板编号、版本、调用编号和标题；内容保留在已记录的调用参数中。版本号按 Session 预留，并发修订会得到不同的版本号。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[组件词汇](../canvas-spec/README.zh.md) · [Web 界面](../ui-canvas/README.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

### show_ui

#### 模型看到的内容

schema 要求 `blocks`（每项的 `type` 取自组件列表）以及可选的 `sources`。描述指向“Presenting results”提示词片段及其组件参考。成功结果为 `Displayed N component(s) to the user.`；失败时逐条列出带 JSON 路径的问题。

#### Token 影响

一个 schema 加共用的指引片段；每次调用一行简短结果。

#### KV Cache 影响

schema 与片段在同一 preset 中保持不变。

### canvas_board

#### 模型看到的内容

schema 要求 `title`、`layout`（`report` 或 `slides`）、`sections`，以及可选的 `board_id`、`subtitle`、`summary` 和 `sources`。成功结果为 `Published board "<title>" (board_id <id>, version <n>). The user can open it from the conversation.`

#### Token 影响

每个版本的完整看板都在调用参数中传递。

#### KV Cache 影响

schema 保持不变；每个版本把其参数追加到历史中。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 每个看板版本都携带完整看板，不支持局部更新。
- host 不执行也不检查 HTML 组件；客户端报告 iframe 中的运行错误。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者上下文——点击展开</summary>

无。

</details>
