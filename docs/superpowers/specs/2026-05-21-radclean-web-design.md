# RadClean 网站设计规格书

**Date:** 2026-05-21
**Status:** Draft
**Based On:** 2026-05-21-radclean-web-brainstorm.md

---

## 1. Problem

Gradio 版本因 UI 控制力不足（CSS 优先级冲突、布局受限、导航无法实现、加载动画混乱）已废弃。需从零构建一个竞赛级 Web 前端，展示放射科 CT 数据治理智能体的完整能力。竞赛截止 2026-05-30。

---

## 2. Goals

1. **竞赛演示稳定**：预置 5 患者数据，打开即展示完整治理结果，零操作门槛
2. **真实功能可跑**：支持上传新数据并执行完整 pipeline，非玩具
3. **交互式可视化**：ECharts 重做全部图表，支持 hover/缩放/钻取
4. **学术极简美学**：黑白灰 + 克莱因蓝，Nature/Science 期刊风格，专业可信
5. **Agent 逻辑清晰**：3 Agent 框架（净化→内容理解→质量闭环）贯穿所有页面

---

## 3. Non-Goals

- 不做用户登录/权限系统
- 不做大规模数据处理（仅支持单次 ≤20 例）
- 不训练 ML 模型
- 不部署到公网服务器（本地运行，localhost 演示）
- 不做移动端适配（桌面端优先）

---

## 4. Design Principles

1. **规则引擎是骨干，LLM 是增强**：pipeline 的核心流程不依赖 LLM，LLM 只在用户主动触发时作为 Agent 2 的增强功能
2. **每个 UI 元素必须有意图**：无装饰性元素，所有视觉组件服务于数据叙事
3. **渐进式披露**：先展示摘要和结论，细节按需展开，避免信息轰炸
4. **零摩擦演示**：预置数据加载时间 < 1s，页面切换无闪烁
5. **Pipeline 异步执行**：后端 BackgroundTasks + 前端轮询进度，不阻塞 UI

---

## 5. Architecture

### 5.1 整体架构

```
浏览器 (SPA)
    │
    ├── GET /          → static/index.html
    ├── GET /api/...   → FastAPI REST
    ├── WS  /ws/...    → WebSocket (进度推送)
    │
FastAPI (backend/)
    ├── api/pipeline.py     # Pipeline 执行端点
    ├── api/demo.py         # 预置数据端点
    ├── api/terminology.py  # 术语查询端点
    ├── services/pipeline_service.py  # 封装现有 medical_data_agent
    ├── services/llm_service.py       # LLM API 调用
    └── main.py             # App 工厂 + 静态文件挂载
```

### 5.2 前端路由 (Hash SPA)

| Route | Page | 说明 |
|-------|------|------|
| `#/home` | 首页 | 产品介绍 + Agent 概览 + CTA |
| `#/workspace` | 工作台 | Pipeline 执行界面 |
| `#/dashboard` | 仪表盘 | 图表 + 数据表总览 |
| `#/terminology` | 术语库 | 中英双语标准化对照表 |
| `#/about` | 关于 | 团队 + 技术架构 |

### 5.3 API 端点

| Method | Path | 说明 |
|--------|------|------|
| `POST` | `/api/pipeline/run` | 执行完整 pipeline（需上传文件或指定 data_root） |
| `POST` | `/api/pipeline/agent1` | 仅执行 Agent 1（元数据清洗） |
| `POST` | `/api/pipeline/agent2` | 仅执行 Agent 2（报告标注） |
| `POST` | `/api/pipeline/agent2/llm` | Agent 2 LLM 增强（LLM 13 字段结构化） |
| `POST` | `/api/pipeline/agent3` | 仅执行 Agent 3（质量评估 + 术语标准化） |
| `GET`  | `/api/demo/overview` | 预置数据摘要（KPI 卡片数据） |
| `GET`  | `/api/demo/{dataset}` | 预置数据详情（metadata/annotations/classifications/quality） |
| `GET`  | `/api/terminology` | 术语标准化数据（支持 ?type=disease&q=搜索） |
| `WS`   | `/ws/progress` | Pipeline 执行进度推送 |

---

## 6. Page Design

### 6.1 Home (`#/home`)

**目的**：5 秒内传达"这是什么产品、能做什么、为什么可信"

**布局**：
```
┌──────────────────────────────────────────────┐
│  [Logo]              [工作台] [仪表盘] [术语库] [关于] │
├──────────────────────────────────────────────┤
│                                              │
│         RadClean                             │
│         放射科 CT 数据治理智能体                │
│         轻量化 · 可解释 · 医学原生              │
│                                              │
│         [查看演示]    [开始治理]               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │   │
│  │ 数据净化  │→│ 内容理解  │→│ 质量闭环  │   │
│  │          │  │          │  │          │   │
│  │ 文件层   │  │ 结构层   │  │ 关系层   │   │
│  │ +字段层   │  │ +内容层   │  │ +标准化层 │   │
│  │ 规则引擎  │  │ 规则+LLM  │  │ 规则校验  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                              │
│              治理前后对比指标                   │
│    有效文件比   结构化率   术语一致性  质量评分   │
│    58%→100%   0%→100%   3种→1种    0.XXX    │
│                                              │
├──────────────────────────────────────────────┤
│  © 2026 苏州大学 · 思必驰 OPC 创新大赛         │
└──────────────────────────────────────────────┘
```

**关键交互**：
- "查看演示"：直接跳转 `#/dashboard`，加载预置数据
- "开始治理"：跳转 `#/workspace`

### 6.2 Workbench (`#/workspace`)

**目的**：Pipeline 执行的主操作界面，支持逐步执行或一键全流程

**布局**：
```
┌──────────────────────────────────────────────┐
│  [Logo]              [首页] [仪表盘] [术语库] [关于] │
├────────────┬─────────────────────────────────┤
│  数据源     │                                 │
│            │    ┌─────────────────────────┐  │
│ ○ 预置演示  │    │  Agent 1 · 数据净化      │  │
│ ○ 上传数据  │    │  ┌───────────────────┐  │  │
│            │    │  │ 清洗前 → 清洗后     │  │  │
│ [选择文件]  │    │  │ 077Y → 77         │  │  │
│            │    │  │ M → Male          │  │  │
│            │    │  └───────────────────┘  │  │
│ ─────────  │    │  [执行 Agent 1]  ✓ 完成  │  │
│  执行控制   │    └─────────────────────────┘  │
│            │                                 │
│ [全流程]   │    ┌─────────────────────────┐  │
│ [Agent1]   │    │  Agent 2 · 内容理解      │  │
│ [Agent2]   │    │  ┌───────────────────┐  │  │
│ [Agent3]   │    │  │ 标注结果 + 高亮    │  │  │
│            │    │  │ 21 疾病 / 50+ 部位 │  │  │
│            │    │  └───────────────────┘  │  │
│            │    │  [执行 Agent 2]         │  │
│            │    │  [AI 深度分析]  ← LLM   │  │
│            │    └─────────────────────────┘  │
│            │                                 │
│            │    ┌─────────────────────────┐  │
│            │    │  Agent 3 · 质量闭环      │  │
│            │    │  ┌───────────────────┐  │  │
│            │    │  │ 雷达图 + PASS/FAIL │  │  │
│            │    │  │ 术语标准化对照     │  │  │
│            │    │  └───────────────────┘  │  │
│            │    │  [执行 Agent 3]         │  │
│            │    └─────────────────────────┘  │
└────────────┴─────────────────────────────────┘
```

**关键交互**：
- 左侧数据源切换：预置/上传，切换时自动加载对应数据
- 每个 Agent 阶段独立执行按钮 + 执行状态指示器（等待/运行中/完成/失败）
- "全流程"按钮一键串行执行 Agent 1→2→3
- Agent 2 的"AI 深度分析"按钮仅在标注完成后可用，调用 LLM 做 13 字段结构化
- 执行中显示进度条 + 当前阶段动画

### 6.3 Dashboard (`#/dashboard`)

**目的**：所有治理结果的可视化总览，竞赛演示的核心页面

**布局**：
```
┌──────────────────────────────────────────────┐
│  [Logo]              [首页] [工作台] [术语库] [关于] │
├──────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   │
│  │ 5    │ │ 10   │ │0.887 │ │ PASS  ✓  │   │
│  │ 病例  │ │ 影像  │ │综合评分│ │ 质量总评  │   │
│  └──────┘ └──────┘ └──────┘ └──────────┘   │
├──────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌───────────────────┐  │
│  │ 质量雷达图        │ │ 疾病检出概览      │  │
│  │ (ECharts radar)  │ │ (ECharts 堆叠柱图) │  │
│  │ 4维交互          │ │ 5病例×21标签矩阵   │  │
│  └─────────────────┘ └───────────────────┘  │
│  ┌─────────────────┐ ┌───────────────────┐  │
│  │ 解剖部位频次      │ │ 分类标签分布      │  │
│  │ (ECharts 条形图)  │ │ (ECharts 热力图)   │  │
│  │ TOP15 可滚动     │ │ 标签×病例频次     │  │
│  └─────────────────┘ └───────────────────┘  │
├──────────────────────────────────────────────┤
│  元数据清洗前后对比 (可排序表格)               │
│  病例结构化详情 (展开行钻取)                   │
└──────────────────────────────────────────────┘
```

**关键交互**：
- KPI 卡片：数字滚动动画进入
- 雷达图：hover 显示每维度阈值线和实际值，点击维度弹出详情
- 疾病检出概览：堆叠柱状图，每病例一根柱子，不同颜色=不同疾病，hover 显示疾病名+置信度
- 解剖部位频次：水平条形图，TOP15，支持滚动查看更多
- 分类标签分布：热力图（标签×病例），颜色深浅=置信度
- 数据表：点击行展开该病例的完整标注详情（原始文本 + 高亮实体）
- 年龄/性别信息融入 KPI 卡片和病例详情，不做单独饼图

### 6.4 Terminology (`#/terminology`)

**目的**：中英双语术语标准化对照表，可搜索可筛选

**布局**：
```
┌──────────────────────────────────────────────┐
│  [Logo]              [首页] [工作台] [仪表盘] [关于] │
├──────────────────────────────────────────────┤
│  [搜索术语...]   [全部] [疾病] [解剖] [修饰]  │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │ 标准中文  │ 标准英文        │ 变体    │   │
│  ├──────────────────────────────────────┤   │
│  │ 胸腔积液  │ Pleural_Effusion│ pleural │   │
│  │           │                 │ effusion│   │
│  │           │                 │ pleural │   │
│  │           │                 │ fluid   │   │
│  ├──────────────────────────────────────┤   │
│  │ 磨玻璃影  │ Ground_Glass_   │ ground  │   │
│  │           │ Opacity         │ glass,  │   │
│  │           │                 │ ground- │   │
│  │           │                 │ glass   │   │
│  └──────────────────────────────────────┘   │
│                         共 71 条术语         │
└──────────────────────────────────────────────┘
```

**关键交互**：
- 搜索框实时过滤（中文/英文/变体均可搜）
- 类型筛选器（疾病 21/解剖 50+/修饰 30+）
- 每行可展开查看所有变体
- 导出按钮（CSV 下载）

### 6.5 About (`#/about`)

**目的**：团队介绍 + 技术说明

**布局**：
```
┌──────────────────────────────────────────────┐
│  [Logo]              [首页] [工作台] [仪表盘] [术语库] │
├──────────────────────────────────────────────┤
│                                              │
│              关于 RadClean                    │
│     2026 思必驰首届 OPC 创新大赛参赛作品        │
│     赛道：数据治理 · 医疗方向                  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │          技术架构图 (静态 SVG)         │   │
│  │   数据包 → Agent1 → Agent2 → Agent3   │   │
│  │           规则引擎  规则+LLM  质量校验  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │徐天桐│ │董怡婷│ │邱乐晟│ │林凯熙│ │沙淼 │  │
│  │负责人│ │Agent1│ │Agent3│ │前端 │ │文档 │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                              │
│         苏州大学 计算机科学与技术学院           │
└──────────────────────────────────────────────┘
```

---

## 7. Design System

### 7.1 Color Palette

```
--bg-primary:    #FAFAFA    (主背景 - 近白)
--bg-card:       #FFFFFF    (卡片背景)
--text-primary:  #1A1A1A    (主文字 - 近黑)
--text-secondary:#6B6B6B    (次要文字)
--text-tertiary: #9E9E9E    (辅助文字)
--accent:        #002FA7     (克莱因蓝 - 唯一强调色)
--accent-light:  #3B6FD4    (强调色浅)
--border:        #E5E5E5    (分割线 - 极细)
--rule:          #F0F0F0    (规则线)
--success:       #2D5A27    (PASS 绿)
--fail:          #8B1A1A    (FAIL 红)
```

### 7.2 Typography

- 标题：Noto Serif SC（思源宋体），用于页面标题和 KPI 数字，学术权威感
- 正文：系统默认中文字体（苹方/微软雅黑），14-16px，高可读性
- 代码/数据：JetBrains Mono，用于 JSON 字段名和数值

### 7.3 Spacing

- 页面最大宽度：1200px，居中
- 卡片间距：24px
- 卡片内边距：32px
- 分区间距：48px
- 所有间距为 8px 的倍数

### 7.4 Iconography

- 无图标库。使用极简几何符号（← → ↓ ↑ ✓ ✗ — ·）表达状态
- Agent 编号使用纯数字：`1` `2` `3`

---

## 8. Charts Specification (ECharts)

| # | 图表 | ECharts 类型 | 交互 |
|---|------|-------------|------|
| 1 | 质量雷达图 | radar | hover 显示阈值线，点击维度展开评分详情 |
| 2 | 疾病检出概览 | bar (stacked) | 每病例一根柱，分段色=疾病，hover 显示疾病名+置信度 |
| 3 | 解剖部位频次 | bar (horizontal) | Y 轴 TOP15 可滚动，hover 显示提及次数 |
| 4 | 分类标签热力图 | heatmap | 行=标签 列=病例，颜色=置信度，hover 显示详情 |
| 5 | 元数据前后对比 | 表格 (可排序) | 每列可排序，异常格高亮 |
| 6 | 病例详情钻取 | 表格 (可展开) | 点击行展开该病例完整标注 |

---

## 9. File Inventory

```
radclean/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, static mount
│   ├── api/
│   │   ├── __init__.py
│   │   ├── pipeline.py            # Pipeline run endpoints
│   │   ├── demo.py                # Pre-computed demo data endpoint
│   │   └── terminology.py         # Terminology search/filter endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── pipeline_service.py    # Wrap medical_data_agent.CleaningPipeline
│   │   └── llm_service.py         # LLM API call for 13-field structuring
│   └── requirements.txt           # fastapi, uvicorn, openai (for LLM compat)
├── frontend/
│   ├── index.html                 # SPA shell
│   ├── css/
│   │   └── style.css              # All styles
│   ├── js/
│   │   ├── app.js                 # Entry: init router + global state
│   │   ├── router.js              # Hash-based SPA router
│   │   ├── api.js                 # Fetch wrappers for all endpoints
│   │   ├── pages/
│   │   │   ├── home.js            # Home page render
│   │   │   ├── workbench.js       # Workbench page render + pipeline UI logic
│   │   │   ├── dashboard.js       # Dashboard page render + ECharts init
│   │   │   ├── terminology.js     # Terminology page render + search/filter
│   │   │   └── about.js           # About page render
│   │   └── components/
│   │       ├── navbar.js          # Top navigation bar
│   │       ├── footer.js          # Page footer
│   │       ├── charts.js          # ECharts factory functions (6 charts)
│   │       ├── progress.js        # Pipeline progress indicator
│   │       └── kpi-card.js        # KPI summary card
│   └── assets/
│       └── logo.svg               # Optional logo
├── demo_data/                     # Pre-computed pipeline outputs (JSON)
│   ├── cleaned_metadata.json
│   ├── annotations.json
│   ├── classifications.json
│   ├── quality_report.json
│   └── terminology.json
├── docs/
│   └── superpowers/
│       ├── brainstorms/
│       │   └── 2026-05-21-radclean-web-brainstorm.md
│       └── specs/
│           └── 2026-05-21-radclean-web-design.md
├── .gitignore
└── CLAUDE.md
```

---

## 10. Implementation Phases

### Phase 1: 后端骨架 (Day 1)
- FastAPI app 创建 + CORS + 静态文件挂载
- `/api/demo/overview` + `/api/demo/{dataset}` 端点（加载 pre-computed JSON）
- `pipeline_service.py` 封装 `CleaningPipeline`
- `/api/terminology` 端点（加载 terminology JSON，支持搜索过滤）
- `llm_service.py` LLM API 封装

### Phase 2: 前端外壳 (Day 1-2)
- `index.html` SPA 入口
- Hash router 实现
- 导航栏组件（5 页面切换 + 当前页高亮）
- 5 页面模板 + CSS 设计系统（变量、字体、栅格）
- 全局状态管理（当前数据源模式、pipeline 状态）

### Phase 3: 工作台 (Day 2-3)
- 数据源切换（预置/上传）
- 文件上传组件（拖拽区域）
- 3 阶段 pipeline 执行 UI
- 进度轮询 + 状态指示器
- Agent 2 LLM 增强按钮 + 结果对比展示
- 每阶段结果展示（清洗前后表、标注高亮、质量雷达小图）

### Phase 4: 仪表盘 (Day 3-4)
- KPI 卡片组件（数字滚动动画）
- 6 个 ECharts 图表
- 可排序数据表
- 病例行展开钻取
- 预置数据模式：页面加载时直接渲染

### Phase 5: 术语库 + 关于 (Day 4)
- 术语表：搜索 + 类型筛选 + 变体展开 + CSV 导出
- 关于页：团队信息 + 技术架构 SVG

### Phase 6: 打磨 + 联调 (Day 5)
- 全局 loading/transition 动画
- 错误状态处理（pipeline 失败、API 超时）
- 端到端测试（预置数据模式 + 真实上传模式）
- 浏览器兼容检查（Chrome 为主）

---

## 11. Verification

1. **预置数据演示**：打开网站 → 首页 → 点击"查看演示" → 仪表盘立即渲染全部图表 → KPI 数据正确
2. **Pipeline 执行**：工作台 → 选择上传模式 → 上传 example_data → 点击"全流程" → 3 阶段依次完成 → 结果写入 outputs/
3. **LLM 增强**：工作台 → Agent 2 完成后 → 点击"AI 深度分析" → 13 字段结构化 JSON 展示 → 与规则引擎结果对比
4. **术语搜索**：术语库 → 输入"胸腔" → 过滤出 Pleural_Effusion 行 → 展开变体列表
5. **API 独立测试**：FastAPI Swagger (`/docs`) → 每个端点可独立调用并返回正确数据

---

## 12. Out of Scope

- 移动端适配
- 多语言切换（UI 固定中文）
- 数据持久化（不保存历史执行记录）
- 并发多用户（单用户本地运行）
- CI/CD 部署
