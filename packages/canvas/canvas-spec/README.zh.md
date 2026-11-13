---
description: "DeepCanvas 的画布组件词汇：组件与看板类型、带路径的校验问题与计算器公式；供工具与客户端作者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-canvas-spec

[English](README.md) | 中文

## 概述

本库定义 DeepCanvas 模型书写、Web 客户端渲染的 JSON：19 种组件、内联画布，以及报告或幻灯片布局的看板。校验会带上每个问题的 JSON 路径，工具可以把问题列表返回给模型修正。计算器公式解析为语法树后求值，不执行任何代码。

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

导入 `validateInline`、`validateBoard`、`validateSection` 或 `validateBlock` 并传入不可信 JSON；返回 `{ ok: true, value }`，或最多包含 20 条问题的 `{ ok: false, problems }`。传入 `CanvasLimits` 可调整大小上限；`DEFAULT_LIMITS` 与随附工具配置一致。计算器输出使用 `parseFormula` 与 `evaluateFormula`；`formulaNames` 列出公式读取的变量。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`src/types.ts`](src/types.ts) 定义词汇。[`src/validate.ts`](src/validate.ts) 遍历一次描述，检查类型、枚举、列表大小、嵌套深度、表格与图表结构、计算器公式，以及每个被引用的来源编号都已登记。[`src/formula.ts`](src/formula.ts) 是基于优先级的解析器，支持数字、输入名、算术、比较、逻辑、条件和固定函数列表。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

[画布工具](../tool-canvas/README.zh.md)与 [Web 界面](../ui-canvas/README.zh.md)使用这套词汇。

-----

<a id="model-experience"></a>
## 模型体验

None, as a pure vocabulary and validation library; the [canvas tools](../tool-canvas/README.zh.md) put validation problems into tool results.

#### KV Cache 影响

无。


## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 校验接受未知的额外字段；渲染器忽略它们。
- 公式按双精度浮点数求值。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者上下文——点击展开</summary>

客户端会内联打包本包；它不能引入 Node、React 或 Cordis。

</details>
