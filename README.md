# RadClean — 放射科 CT 数据治理平台

面向放射科 CT 数据的轻量化治理平台。三阶段管线将原始 DICOM 数据转化为标准化科研数据集，规则引擎为骨干、LLM 为可选增强，开箱即用。

## 概览

| Stage | 功能 | 技术 | 产出 |
|-------|------|------|------|
| **1 数据净化** | 文件去残留、字段标准化、影像校验 | 规则引擎 | 清洗后的 DICOM 元数据 |
| **2 报告结构化** | 自由文本 → 结构化标注 | 规则引擎 + 可选 LLM | 21 疾病 · 50+ 部位 · 30+ 修饰词 |
| **3 治理验证** | 四维质量评估 + 术语标准化 | 规则校验 + 模糊匹配 | 评分报告 + RadLex 术语表 |

## 快速开始

### 环境要求

- Python 3.10+
- 浏览器（Chrome / Edge / Firefox）

### 1. 安装依赖

```bash
cd radclean
pip install -r backend/requirements.txt
```

### 2. 启动后端

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. 打开前端

浏览器直接打开 `frontend/index.html`，或访问 `http://localhost:8000`（后端托管静态文件）。

### 4. 配置 LLM 增强（可选）

复制 `backend/.env.example` 为 `backend/.env`，填入 API Key：

```env
LLM_API_KEY=your_api_key_here
```

支持任何兼容 OpenAI 协议的 API（DeepSeek、OpenAI 等）。不配置不影响规则引擎核心功能。

## 治理流程

```
原始数据包 (.nii.gz / .xlsx / .txt)
    │
    ▼
┌──────────────────────────────────────────────┐
│  Stage 1 — 数据净化                          │
│  文件层：去残留 · 统一命名 · 完整性校验       │
│  字段层：年龄 · 性别 · 厂商 · HU 参数标准化   │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Stage 2 — 报告结构化                        │
│  结构层：自由文本 → 结构化 JSON               │
│  语义层：疾病识别 · 解剖定位 · 否定检测        │
│  增强层（可选 LLM）：13 字段深度提取           │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Stage 3 — 治理验证                          │
│  完整性 · 准确性 · 一致性 · 可用性 四维评分    │
│  术语 → RadLex 标准词表                       │
│  LLM 语义抽查 + AI 治理总结                   │
└──────────────────────────────────────────────┘
    │
    ▼
  治理后数据（JSON · CSV · PDF 报告）
```

## 项目结构

```
radclean/
├── backend/
│   ├── main.py                  # FastAPI 入口
│   ├── api/
│   │   ├── pipeline.py          # 管线执行 + SSE 流式推送
│   │   ├── demo.py              # 演示数据端点
│   │   └── terminology.py       # 术语查询端点
│   ├── services/
│   │   ├── pipeline_service.py  # 三阶段管线编排
│   │   ├── llm_service.py       # LLM 调用（OpenAI 兼容协议）
│   │   └── pdf_report.py        # 治理报告 PDF 生成
│   └── requirements.txt
├── frontend/
│   ├── index.html               # SPA 入口
│   ├── css/style.css            # 全局样式
│   └── js/
│       ├── app.js               # 全局状态
│       ├── router.js            # Hash 路由
│       ├── api.js               # API 请求封装
│       ├── main.js              # 应用初始化
│       ├── pages/               # 页面渲染
│       │   ├── home.js          # 首页
│       │   ├── workbench.js     # 工作台
│       │   ├── dashboard.js     # 仪表盘（ECharts）
│       │   ├── terminology.js   # 术语库
│       │   └── about.js         # 关于
│       └── vendor/              # 第三方库
├── demo_data/                   # 预置演示数据（JSON）
└── docs/
    ├── 启动教程.md
    └── 平台功能与AI融合总结.md
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | FastAPI + Uvicorn |
| 管线引擎 | Python 规则引擎 |
| LLM 集成 | OpenAI 兼容协议（可插拔） |
| 前端 | 原生 JS SPA（零框架依赖） |
| 可视化 | ECharts |
| 报告生成 | ReportLab（PDF） |

## 设计原则

- **规则优先，LLM 增强**：确定性规则覆盖常规场景，LLM 处理复杂语义，互不耦合
- **轻量化**：无需 GPU、无需训练、无需标注数据
- **可解释**：每条清洗规则、每个实体标注均可逻辑溯源
- **医学原生**：内置 RadLex 术语库，中英双语，支持变体归一
