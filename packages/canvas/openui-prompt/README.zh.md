---
description: "DeepCanvas 交互式回答：教模型编写 openui 代码块的系统提示词片段；供维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-openui-prompt

[English](README.md) | 中文

## 概述

本插件增加一个系统提示词片段：客户端可渲染组件的 OpenUI Lang 参考、组织界面的规则和示例。模型随后用 Markdown 回答，并在回复中用 `openui` 代码块编写界面。参考文本由客户端组件库生成，因此提示词与渲染器保持一致。

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

把本插件加入 agent preset，并在 Web profile 中组装[渲染器](../ui-openui/README.zh.md)：

```yaml
- id: openui-prompt
  name: '@deepseek-ai/dsh-openui-prompt'
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 — 点击展开</summary>

[`src/index.ts`](src/index.ts) 在工具说明的位置注册 `openui:reference` 片段。[`src/reference.ts`](src/reference.ts) 由客户端包的提示词测试根据其组件库和提示词选项生成。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[渲染器](../ui-openui/README.zh.md) · [画布工具](../tool-canvas/README.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

### openui:reference

#### 模型看到的内容

`openui:reference` 片段以 `Replies are Markdown.` 开头，随后给出 OpenUI Lang 语法、组件签名、函数、动作、流式书写顺序、三个示例和组织规则。

#### Token 影响

每次请求约 9,000 个固定 token。

#### KV Cache 影响

该片段在同一 preset 中固定不变，因此保留在缓存前缀中。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 参考文本为英文；模型编写的界面文字跟随用户的语言。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者背景 — 点击展开</summary>

不要手动编辑 `src/reference.ts`；应从客户端包重新生成。

</details>
