# Brainstorming: RadClean 网站重建

**Date Started:** 2026-05-21
**Status:** In Progress
**Current Phase:** spec_writing
**Final Spec:** docs/superpowers/specs/2026-05-21-radclean-web-design.md
**Last Updated:** 2026-05-22 00:30

## Original User Request

> 重新设计并开发 RadClean（放射科CT数据治理智能体）网站。之前用 Gradio 版本因 UI 受限（按钮大小难调、布局受限、导航功能难实现、CSS 优先级冲突、加载动画混乱）决定废弃。新网站要求在 `D:\孵化项目\radclean\` 下从零开始，竞赛截止 2026-05-30（剩 9 天）。

---

## Phase A: Alignment Decision Log

### Q1: 技术栈选择
**Options Presented:**
- A: 纯静态前端 + FastAPI（前后端分离，完全 UI 自由）
- B: Flask 全栈（模板渲染，页面刷新）
- C: 纯静态单页（无后端，无法跑 Agent）

**Decision:** A — FastAPI + 静态前端
**Rationale:** 目标 1（真正实现功能）必须有后端跑 Agent；目标 2（演示稳定）需要 API 可独立测试。FastAPI 异步支持 Agent 2 的 LLM 调用不阻塞，Swagger 自动文档方便调试。前端纯 HTML/CSS/JS 完全掌控 UI 设计。
**Timestamp:** 2026-05-21 01:35

### Q2: 网站核心定位
**Options Presented:**
- A: Pipeline 启动器（上传数据跑治理）
- B: 结果展示台（预置数据可视化）
- C: 两者都要

**Decision:** C — 两者都要
**Rationale:** 既要有真实功能（真正跑 pipeline），也要有竞赛演示能力（预置数据直接展示）。首页设两个入口：演示模式和工作台模式。
**Timestamp:** 2026-05-21 01:45

### Q3: 可视化方案
**Options Presented:**
- A: 交互式重做（ECharts/D3.js）
- B: 直接嵌入 matplotlib 图片
- C: 混合方案

**Decision:** A — 交互式重做
**Rationale:** 竞赛演示需要专业视觉效果。全部图表用 ECharts 重做，支持 hover 提示、缩放、钻取等交互。数据稀疏的图表（年龄/性别）融入 KPI 卡片替代独立图表。
**Timestamp:** 2026-05-21 02:00

### Q4: 页面结构
**Options Presented:**
- A: 单页仪表盘（长滚动 + 锚点跳转）
- B: 多页 SPA（首页/工作台/仪表盘/术语库/关于）
- C: 双模式（演示模式 vs 工作台模式）

**Decision:** B — 多页 SPA
**Rationale:** 功能分区清晰，每个页面有明确目的。Hash 路由无刷新切换，显得更成熟完整。首页做项目介绍和入口分流，仪表盘做可视化核心。
**Timestamp:** 2026-05-21 02:10

### Q5: 设计美学方向
**Options Presented:**
- A: 医疗专业风（浅色/医用蓝/衬线体/严谨）
- B: 深色科技风（深蓝底/霓虹强调/玻璃拟态）
- C: 极简学术风（黑白灰/克莱因蓝/大字号数据）

**Decision:** C — 极简学术风
**Rationale:** 黑白灰基调 + 克莱因蓝唯一强调色。Nature/Science 期刊式的数据呈现风格，大字号 KPI，极细分割线，无装饰元素。专业可信，不浮夸。
**Timestamp:** 2026-05-21 02:20

### Q6: LLM 增强接入
**Options Presented:**
- A: 接入 LLM LLM 作为 Agent 2 增强
- B: 仅用规则引擎

**Decision:** A — 接入 LLM
**Rationale:** 规则引擎做确定性实体标注作为主流程，LLM 作为可选的"AI 深度分析"按钮，提供 13 字段深度结构化。即使 LLM 不稳定也不影响核心功能。体现 OPC 主题（AI 智能体），增加技术亮点。
**Timestamp:** 2026-05-21 02:30

### Q7: 数据输入方式
**Options Presented:**
- A: 预置+上传双模式
- B: 仅预置演示数据
- C: 仅上传模式

**Decision:** A — 预置+上传双模式
**Rationale:** 首页"查看演示"按钮加载预置数据（零操作门槛），工作台支持上传新数据执行完整 pipeline。演示和真实功能两不误。
**Timestamp:** 2026-05-21 02:40

### Q8: 智能体框架
**Options Presented:**
- A: 沿用 3 Agent 框架（竞赛策略文档）
- B: 4 Stage 流程（按 pipeline 代码实现）
- C: 3 Agent + 质量中台

**Decision:** A — 3 Agent 框架
**Rationale:**
- Agent 1 数据净化（规则引擎）：文件层去残留/统一命名/校验完整性 + 字段层年龄/性别/厂商/HU参数标准化
- Agent 2 内容理解（规则+LLM）：结构层自由文本→结构化JSON + 内容层21疾病/50+部位/30+修饰词实体识别+否定检测
- Agent 3 质量闭环（模糊匹配+规则校验）：关系层跨源一致性校验 + 标准化层术语→RadLex标准词表
- 规则引擎是骨干，LLM是增强，互不依赖
**Timestamp:** 2026-05-21 03:00

### Phase A → B Transition Confirmation [2026-05-21 03:15]
**Alignment Summary (compiled by ds):**
- Decision 1: FastAPI + 静态前端（前后端分离）
- Decision 2: 网站定位 = Pipeline 启动器 + 结果展示台
- Decision 3: 全部图表 ECharts 交互式重做
- Decision 4: 多页 SPA（首页/工作台/仪表盘/术语库/关于）
- Decision 5: 极简学术风，黑白灰 + 克莱因蓝
- Decision 6: LLM LLM 作为 Agent 2 可选增强
- Decision 7: 预置演示 + 上传双模式
- Decision 8: 3 Agent 框架（净化→内容理解→质量闭环），规则+LLM互补

**User Confirmation:** ✓ Confirmed

---

## Phase B: Spec Writing Status

- [x] Initial draft complete (2026-05-22 00:30)
- [ ] Round 1 revision
- [ ] Final sign-off

Spec written at: `docs/superpowers/specs/2026-05-21-radclean-web-design.md`
Implementation in progress: 6 phases, backend complete, frontend 5 pages built, server running on :8000.
