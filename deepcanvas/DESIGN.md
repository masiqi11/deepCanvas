# DeepCanvas 设计说明

DeepCanvas 是基于 DeepSeek Harness（dsh）二次开发的本地 Web Agent 客户端。它的核心能力是把 Agent 的回答与任务成果交付为可视、可交互的界面，而不是大段文字。

## 基线

- 上游：dsh `0.2.1-rc.2`，提交 `687f282e8625c6b8d11ff58211a90524be2e4317`（2026-10-17）。
- 语言、构建、前端框架、包管理均沿用上游：TypeScript ESM、pnpm workspace、tsdown、React 18、Vite。
- 内部包名保留 `@deepseek-ai/dsh-*`，以便后续同步上游；产品界面中不出现 dsh 或 DeepSeek Harness 字样。`LICENSE` 中的 MIT 版权声明按许可证要求保留。

## 二次开发边界

| 层 | 来源 | 说明 |
|---|---|---|
| 模型、流式输出、Agent 循环、工具执行 | 上游原样复用 | 不另建模型调用循环 |
| 会话日志、持久化、恢复、取消、权限 | 上游原样复用 | 看板内容记录在会话日志的工具调用参数中，刷新后从日志恢复 |
| 搜索与抓取 | 上游 `ctx.web`（DeepSeek Search/Fetch、Exa、Perplexity） | 缺少凭据时如实告知 |
| 澄清、任务清单 | 上游 `ask_user_question`、`todo_write` | 后续阶段按需扩展 |
| 品牌与产品组装 | 新增 `packages/canvas/deepcanvas-bundle`、`ui-brand-deepcanvas` | 通过 profile 叠加层组装，不改上游插件 |
| 可视化组件与看板 | 新增 `packages/canvas/*` | 通过工具注册表与客户端插槽接入 |

对上游源码的直接修改集中记录在本文件末尾的“上游修改记录”。

## 呈现模型：原生组件为主，HTML 兜底

参考 ChatGPT Intelligent UI 的思路：应用提供一套原生组件库，模型只生成受 Schema 约束的组件描述，由客户端渲染。组件库覆盖不了的交互（专用计算器、小游戏、特殊可视化），允许模型写一段在隔离 iframe 中运行的 HTML。

模型按问题选择形式：

- 闲聊、澄清和一两句话能答完的问题：直接文字回答。
- 其他有结构的回答（多个要点、方案、步骤、数字、比较、取舍）：调用 `show_ui`，组件显示在回复中调用它的位置；文字只作一句引入和简短收尾。
- 调研、分析、规划等完整成果：调用 `canvas_board`，在右侧工作区生成任务看板（可滚动报告或幻灯片），并在对话中留一张入口卡片。

### 工具

| 工具 | 职责 |
|---|---|
| `show_ui` | 在对话中内联渲染一组组件 |
| `canvas_board` | 创建看板，或以同一 `board_id` 发布新版本；旧版本保留 |

两个工具的参数都是组件描述 JSON。客户端在参数流式到达时增量解析并逐块渲染，参数完整且校验通过后定稿。校验失败时工具返回结构化错误，模型据此修正后重试。

### 组件（v1）

| 类型 | 用途 |
|---|---|
| `markdown` | 段落文字 |
| `callout` | 结论、提示、风险（`info`/`success`/`warning`/`danger`） |
| `stats` | 关键数字卡片，支持单位、变化值和来源 |
| `cards` | 卡片网格，适合机会点、方案、要素 |
| `table` | 对比表，支持排序、筛选、高亮 |
| `chart` | 柱状、折线、面积、饼图（原生 SVG，带入场动画） |
| `timeline` | 时间线 |
| `steps` | 步骤或清单 |
| `tabs` | 分组切换 |
| `accordion` | 折叠详情 |
| `proscons` | 优劣对比 |
| `calculator` | 输入项和公式输出，用受限表达式求值，不执行任意代码 |
| `sources` | 来源列表 |
| `actions` | 继续追问按钮，点击后把预设问题发回 Agent |
| `html` | 兜底：隔离 iframe（`sandbox="allow-scripts"`，无同源权限、无网络凭据） |

任何组件都可以带 `sources`，引用看板或回答中登记的来源编号。

### 看板

看板有两种布局：`report`（纵向滚动的分节报告）和 `slides`（分页幻灯片，支持键盘翻页和全屏演示）。看板包含标题、摘要、章节或页面、来源表。同一 `board_id` 每次发布都会生成一个不可变的新版本，工作区可以切换查看历史版本，并导出为单个 HTML 文件。

## 阶段

1. 运行基础与独立应用：`deepcanvas` profile、启动命令、品牌替换、精简产品界面。
2. 组件库与 `show_ui`：对话内联可视化、流式渲染、校验与修复。
3. 看板：`canvas_board`、右侧工作区、版本、导出、继续追问。
4. 研究流程：澄清、任务清单、检索与来源，产出看板。
5. 呈现策略评测：固定题集，评估形式选择、渲染与交互成功率。

## 上游修改记录

### 阶段一：独立应用与品牌

- `packages/boot/app-boot/src/profile.ts`：新增 `deepcanvas` profile 模板（`dsh-base` + `dsh-web-app` + `dsh-deepcanvas`）。
- `packages/bundle/web-app/src/index.ts`：`web-runtime` 新增 `consoleLabel` 配置（默认 `dsh web`），DeepCanvas 叠加层设为 `DeepCanvas`，使终端提示显示产品名。
- `apps/web`：页面标题、PWA manifest、favicon 改为 DeepCanvas。
- 客户端文案：`brand.localBuild`、首页标题、欢迎说明、会话占用与进程中断提示、快捷键、Office 预览、账号与引导页中的产品名改为 DeepCanvas；账号相关文案改为“DeepSeek 账号”，因为登录的是 DeepSeek 账号。
- `packages/client/connection/src/browser-auth.ts`：未认证访问的纯文本提示改为中英双语的 DeepCanvas 提示。
- 测试与 Web 界面快照中断言上述文案的位置同步更新；模型可见的提示词与录制会话保持上游原样。

### 阶段二、三：组件与看板

- `packages/util/values`：新增 `parseJsonPrefix()` 与 `PartialArguments.partialValue()`，用于在工具参数流式到达时逐个渲染组件。
- `packages/client/tsdown.client.ts`：`INLINE_SAFE` 加入 `dsh-canvas-spec`，允许客户端包内联这一纯数据词汇库。
- `show_ui` 组件与已发布看板卡片作为 `groupTree: 'turn'` 的 Chat 节点渲染，回合结束后不会被收进“已完成”的工作步骤；这使用上游已有的分组位置，不修改上游代码。
- DeepCanvas 叠加层关闭 `ui-agent-preset`（模式切换与 Agent 预设设置）、`ui-settings-plugins` 及其配置页、`ui-deepseek-model-label-1017`；保留 DeepSeek 账号登录。
- DeepCanvas 叠加层通过已有配置项关闭 `includeHarnessIdentity`，由 persona 说明产品身份，不修改上游代码。
