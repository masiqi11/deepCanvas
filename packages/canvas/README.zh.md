---
description: "canvas 分组地图：把回答与工作成果交付为可视化组件和带版本看板的 DeepCanvas 包；供浏览本分组的用户与维护者阅读。"
kind: "package-group"
---

# packages/canvas

[English](README.md) | 中文

## 概述

canvas 系列把结果交付为可视化内容，而不是大段文字。模型通过两个工具书写组件描述；Web 客户端把它们内联渲染在对话中，或作为带版本的看板显示在工作区。本系列还包含 DeepCanvas 产品叠加层和品牌。通过 `deepcanvas` profile 组装。

## 目录

- [包](#packages)
- [相关文档](#related-documentation)
- [开发备注](#dev-note)

-----

<a id="packages"></a>
## 包

| 包 | 职责 | ctx 键 |
|---|---|---|
| [`canvas-spec`](canvas-spec/README.zh.md) | 组件词汇、校验与计算器公式 | 库，无 ctx 键 |
| [`tool-canvas`](tool-canvas/README.zh.md) | `show_ui` 与 `canvas_board` 工具及呈现指引 | 注册到 `ctx.tools`、`ctx.sessionProjections`、`ctx.systemPrompt` |
| [`ui-canvas`](ui-canvas/README.zh.md) | 内联组件、看板卡片与看板工作区标签页 | 注册 slot、资源与侧栏标签页类型 |
| [`ui-brand-deepcanvas`](ui-brand-deepcanvas/README.zh.md) | 品牌 slot 中的 DeepCanvas 标识与名称 | 注册 slot |
| [`deepcanvas-bundle`](deepcanvas-bundle/README.zh.md) | DeepCanvas profile 叠加层 | 组合包，无 ctx 键 |

-----

<a id="related-documentation"></a>
## 相关文档

- [DeepCanvas 设计说明](../../deepcanvas/DESIGN.md)——产品范围、呈现模型与上游修改记录。

-----

<a id="dev-note"></a>
## 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
