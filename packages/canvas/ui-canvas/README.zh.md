---
description: "DeepCanvas Web 界面：内联可视化组件、生成中与已发布的看板卡片，以及带版本的看板工作区；供用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-canvas

[English](README.md) | 中文

## 概述

`show_ui` 参数流式到达时，完整的组件逐个出现；调用成功后最终组件留在回复下方。`canvas_board` 调用显示一张卡片，报告正在生成的章节，并在发布后打开看板。右侧栏的看板标签页从 Session 历史读取所有版本，新版本到达时自动更新，支持幻灯片翻页、全屏演示，并可导出单个离线 HTML 文件。

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

在 Web profile 中与[画布工具](../tool-canvas/README.zh.md)一起组装本行：

```yaml
- id: ui-canvas
  name: '@deepseek-ai/dsh-client-ui-canvas'
```

在看板中，通过工具栏切换版本，点击 **演示** 全屏展示，点击 **导出 HTML** 保存当前版本。继续追问按钮会把预设问题作为你的下一条消息发送。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`src/client/index.ts`](src/client/index.ts) 注册 `show_ui` 与 `canvas_board` 工具视图、由 `tool/call` 与 `canvas/board` 事件折叠出的隐藏 `canvas-visual` Chat 节点（用于回复末尾）、`canvas-board` 资源和工作区标签页。[`board-resource.ts`](src/client/board-resource.ts) 先分页读取一次历史，再跟随新事件。组件在 [`Blocks.tsx`](src/client/Blocks.tsx) 与 [`Chart.tsx`](src/client/Chart.tsx) 中渲染。[`HtmlFrame.tsx`](src/client/HtmlFrame.tsx) 在 `sandbox="allow-scripts"` 的 iframe 中运行 HTML 组件，阻断网络请求，并且只接受来自自身窗口的 `deepcanvas.bridge/1` 消息。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[组件词汇](../canvas-spec/README.zh.md) · [画布工具](../tool-canvas/README.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

None, as the package renders recorded calls and adds no model-visible input.

#### KV Cache 影响

无。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 导出会复制页面样式规则，并显示所有标签页和幻灯片；离线时可交互表格与计算器保持默认状态。
- iframe 发起的追问只会填入输入框，需要用户确认发送。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者上下文——点击展开</summary>

看板内容读取自已记录的 `canvas_board` 参数；host 上的投影只负责版本编号。

</details>
