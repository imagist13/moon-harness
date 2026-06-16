# moon-harness

AI Agent 智能助手平台 - 基于 LangGraph 的智能对话系统，支持 RAG 知识库、企业微信集成和可扩展技能系统。

## 功能特性

- **智能对话** - 与 AI Agent 自然交互，基于 LangGraph 的 Agent 架构
- **RAG 知识库** - 文档向量化检索增强生成，支持 Milvus 向量数据库
- **企业微信** - WebSocket 连接企业微信机器人，实时响应用户消息
- **技能系统** - 可扩展的专业能力模块（代码审查、数据分析、文本摘要等）
- **工具调用** - 支持代码执行、文件读取、API 调用等工具
- **多会话管理** - 支持会话列表、置顶、编辑和上下文压缩
- **主题切换** - 支持明暗主题切换

## 技术栈

### 后端
- **框架**: FastAPI (Python)
- **AI/LLM**: LangChain + LangGraph
- **向量数据库**: Milvus
- **企业微信**: wecom-aibot-python-sdk
- **数据库**: PostgreSQL
- **认证**: JWT

### 前端
- **框架**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui + Radix UI
- **状态管理**: Zustand + TanStack Query

## 项目结构

```
moon-harness/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API 路由
│   │   │   ├── auth.py      # 认证接口
│   │   │   ├── chat.py       # 聊天接口
│   │   │   ├── rag.py       # RAG 接口
│   │   │   ├── wecom.py     # 企业微信接口
│   │   │   ├── skills.py    # 技能接口
│   │   │   └── tools.py     # 工具接口
│   │   ├── core/            # 核心模块
│   │   │   ├── config.py    # 配置管理
│   │   │   ├── auth.py      # 认证
│   │   │   └── security.py  # 安全
│   │   ├── models/          # 数据模型
│   │   ├── services/        # 业务服务
│   │   │   ├── agent.py    # Agent 核心
│   │   │   ├── llm.py      # LLM 调用
│   │   │   ├── rag/        # RAG 服务
│   │   │   └── wecom*      # 企业微信
│   │   ├── skills/          # 技能系统
│   │   └── tools/           # 工具系统
│   ├── skills/             # 内置技能包
│   │   ├── code-review/    # 代码审查
│   │   ├── data-analysis/  # 数据分析
│   │   ├── summarize-text/ # 文本摘要
│   │   └── hv-profile-creator-coach/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── hooks/         # React Hooks
│   │   ├── pages/         # 页面
│   │   ├── stores/        # 状态管理
│   │   └── types/         # 类型定义
│   └── package.json
│
├── scripts/
│   └── run.py              # 启动脚本
│
├── docker-compose.yml      # Docker 部署配置
├── Dockerfile.backend       # 后端 Docker 配置
├── Dockerfile.frontend      # 前端 Docker 配置
└── nginx.conf              # Nginx 配置
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Docker & Docker Compose (可选)

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必要的配置：

```env
# 数据库
DATABASE_URL=postgresql://username:password@host:port/database_name

# LLM 配置
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.example.com

# 百炼 API (RAG)
BAILIAN_API_KEY=your_bailian_key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com

# Milvus 向量数据库
MILVUS_HOST=localhost
MILVUS_PORT=19530

# 企业微信
WECOM_CORP_ID=your_corp_id
WECOM_APP_ID=your_app_id
WECOM_APP_SECRET=your_secret
```

### 2. 使用 Docker 部署 (推荐)

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

服务启动后：
- 前端: http://localhost
- 后端 API: http://localhost:8001
- API 文档: http://localhost:8001/docs

### 3. 本地开发

**后端：**

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**前端：**

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 技能系统

项目内置可扩展的技能模块，位于 `backend/skills/` 目录：

### 内置技能

| 技能 | 描述 | 触发关键词 |
|------|------|-----------|
| code-review | 代码审查专家，可检测语法错误、安全漏洞、性能问题 | 代码审查、code review、找bug |
| data-analysis | 数据分析助手，提供统计计算和数据处理 | 数据分析、统计 |
| summarize-text | 文本摘要生成，根据模板输出结构化摘要 | 摘要、总结 |
| hv-profile-creator-coach | 教练问卷模板，生成用户画像问卷 | 问卷、用户画像 |

### 自定义技能

技能通过 `SKILL.md` 文件定义，格式如下：

```markdown
---
name: skill-name
description: 技能描述，说明何时使用
---

# 技能名称

## When to Use
触发条件说明

## How It Works
工作流程说明

## Examples
使用示例
```

## API 接口

访问 `/docs` 查看完整的 API 文档，主要接口包括：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth` | POST | 用户注册/登录 |
| `/api/sessions` | GET/POST/DELETE | 会话管理 |
| `/api/chat` | POST | 发送消息 |
| `/api/rag` | POST | 文档上传/检索 |
| `/api/skills` | GET | 获取可用技能 |
| `/api/tools` | POST | 执行工具 |
| `/api/wecom` | GET/POST | 企业微信配置 |

## 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (反向代理)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
        ┌───────────┐            ┌───────────┐
        │  Frontend  │            │  Backend  │
        │  (React)   │            │ (FastAPI) │
        │   :80      │            │  :8000    │
        └───────────┘            └─────┬─────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
        ┌───────────┐            ┌───────────┐            ┌───────────┐
        │ PostgreSQL│            │  Milvus   │            │  企业微信  │
        │  Database │            │  VectorDB │            │  Server   │
        └───────────┘            └───────────┘            └───────────┘
```

## License

MIT