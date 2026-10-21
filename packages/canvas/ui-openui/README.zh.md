---
description: "DeepCanvas 交互式回答：把助手回复中的 openui 代码块渲染为可操作的界面；供用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-openui

[English](README.md) | 中文

## 概述

助手回复中的 `openui` 代码块会渲染为用 OpenUI Lang 写成的可操作界面：计算器、清单、对比、图表、分步示意图和小游戏。输入和按钮只在本地改变界面，不会发起模型请求；只有明确的提交才会发送消息，并带上界面上的数值。程序出错时保留能正常显示的部分，列出问题，并提供一个让助手修正的按钮。

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

在 Web profile 中与讲解该格式的[提示词片段](../openui-prompt/README.zh.md)一起组装本行：

```yaml
- id: ui-openui
  name: '@deepseek-ai/dsh-client-ui-openui'
```

在回答里修改任意输入或勾选任意条目，界面会立即更新。继续对话的按钮会把它的消息作为你的下一轮输入发送。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 — 点击展开</summary>

[`src/client/index.ts`](src/client/index.ts) 认领 `conversation.chat.markdown.fence` 插槽的 `openui` 与 `openui-lang` 两个键。[`OpenUIFence.tsx`](src/client/OpenUIFence.tsx) 使用 `@openuidev/react-lang` 渲染器按 [`library.ts`](src/client/library.ts) 渲染代码块，在页面打开期间按代码块保存界面状态，把 `@ToAssistant` 映射到会话输入框，只打开 http(s) 链接，并在回复结束后显示阻断渲染的解析问题；有效组件仍能显示时标为部分显示。[`library/`](src/client/library) 中的组件与 [`functions/`](src/client/functions) 中的函数改编自 Open Intelligent UI（MIT，Copyright (c) 2026 Thesys Inc.）；需要联网的图片搜索、街道地图和视频嵌入没有纳入。[`prompt-options.ts`](src/client/prompt-options.ts) 保存生成宿主提示词所用的规则和示例。`HtmlView` 页面运行在 `sandbox="allow-scripts"` 的 iframe 中，其策略禁止所有网络访问。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[提示词片段](../openui-prompt/README.zh.md) · [看板](../ui-canvas/README.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

无，本包只渲染已记录的回复，不增加模型可见的输入；它所讲解的提示词位于提示词包中。

#### KV Cache 影响

无。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 界面状态保存在内存中：刷新页面后，每个代码块会回到默认值。
- 浏览器包自带 KaTeX 和 zod 副本，约 1.3 MB。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者背景 — 点击展开</summary>

修改组件 schema、函数或 `prompt-options.ts` 后，用 `DSH_WRITE_OPENUI_PROMPT=1` 运行提示词测试，以重写提示词包中生成的参考文本；两者不一致时该测试会失败。

</details>
