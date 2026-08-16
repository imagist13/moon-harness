# AIASys 架构分析

> 版本：v0.4.34（与 `apps/web/package.json`、`apps/backend/pyproject.toml` 保持一致）
> 本文档基于仓库当前实现整理，用于帮助新协作者和架构审查者快速理解系统全貌。

---

## 1. 项目定位

AIASys（艾斯）是一款**本地优先的 AI Agent 工作平台**，面向科研、数据分析、知识生产和长期项目推进。与一次性聊天窗口不同，AIASys 以**持久化任务工作区**为核心，把对话、文件、代码执行、知识库、图谱、画布、记忆和自动化任务沉淀在同一个可持续演进的工作区里。

当前产品形态：

- **Web 端**：React SPA，面向浏览器访问、开发调试和私有部署。
- **后端**：Python FastAPI 服务，提供 Agent 编排、会话持久化、运行环境、MCP/Skill 接口。

---

## 2. 设计哲学

### 2.1 核心原则

- **工作区先于会话**：文件、会话、Notebook 执行记录、知识库、图谱、画布、记忆和产物都沉淀在工作区内。
- **本地优先**：单机单用户、本地数据存储、本地代码执行，适合个人电脑、实验环境和私有部署。
- **证据优先**：界面优先回答“用户在哪、当前主对象是什么、下一步常用操作是什么、哪些信息是证据”。
- **可扩展的 Agent 能力**：通过 MCP 与 Skill 市场接入外部工具、领域流程、办公能力和协作专家。
- **长期任务自动推进**：AutoTask 可承接连续推进、单次触发、周期触发和固定时间触发。

### 2.2 视觉与交互基线

完整设计基线见根目录 [`DESIGN.md`](../DESIGN.md)。关键约束：

- 三段式骨架：左侧工作区/分支导航、中间对象画布、右侧助手侧栏。
- 颜色以中性灰底 + 少量语义色为主，强调色克制。
- 执行日志、诊断详情、市场目录不长期占据右侧一级主区。
- 当前不按多人协作 SaaS 设计，"协作"指用户与 Agent/子 Agent/托管循环之间的任务协作。

---

## 3. 整体架构

```text
┌─────────────────────────────────────────────────────────────┐
│                          用户层                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │      浏览器 / Web        │  │     CLI / 深链参数       │  │
│  │      (apps/web)         │  │                         │  │
│  └───────────┬─────────────┘  └─────────────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                     前端 (React + Vite)             │    │
│  │  - 工作区壳层：WorkspaceSidebar / Object Canvas     │    │
│  │  - 核心页面：WorkspacePage / HomePage               │    │
│  │  - 能力组件：Notebook、Canvas、Database 等          │    │
│  └───────────────────────────┬────────────────────────┘    │
│                              │ HTTP / WebSocket / SSE       │
│  ┌───────────────────────────┴────────────────────────┐    │
│  │                     后端 (FastAPI + Python)         │    │
│  │  - API 路由层：/api/*                                │    │
│  │  - 服务编排层：Agent / Session / Runtime            │    │
│  │  - 工具层：Notebook、AskUser、File、MCP 等          │    │
│  │  - 存储层：SQLite、DuckDB、文件系统                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 进程边界

| 进程 | 端口/入口 | 说明 |
|------|----------|------|
| Web 前端 | `13000` | Vite dev / preview，生产可换静态服务器 |
| 后端 API | `13001` | Uvicorn + FastAPI |
| 本地 Jupyter Kernel | 动态 | 后端按需启动，执行 Notebook / Python 代码 |
| Docker Sandbox | 动态 | 可选，云端部署默认启用 |

---

## 4. 技术栈

### 4.1 后端

- **Python 3.12+**
- **FastAPI + Uvicorn**：REST API，SSE 流式输出
- **Pydantic v2**：请求/响应模型与配置校验
- **SQLAlchemy 2.0**：ORM 与数据库抽象
- **Loguru**：结构化日志
- **PyJWT / python-jose / passlib**：本地 JWT 认证
- **OpenAI / Anthropic SDK**：LLM 调用
- **jupyter-client / ipykernel**：本地 Python 执行
- **pandas / numpy / matplotlib / seaborn / DuckDB / networkx**：数据分析与图计算
- **fastmcp**：MCP 服务端/客户端

### 4.2 前端

- **React 19**
- **TypeScript 5.9**
- **Vite 7**
- **Tailwind CSS 4**
- **Base UI / shadcn/ui / Radix UI**：基础组件
- **CodeMirror 6**：多语言编辑器
- **ECharts / Mermaid / PixiJS / D3-force**：图表、流程图、画布、力导向图
- **@xterm/xterm**：Web 终端
- **React Markdown + KaTeX**：富文本渲染

### 4.3 数据与检索

- **SQLite**：主元数据、会话、配置
- **DuckDB**：分析型 SQL、内置数据库浏览器
- **sqlite-vec**：向量检索
- **SQLite FTS5**：全文检索
- **PostgreSQL / MySQL**：外部数据库连接器（可选）

---

## 5. 后端架构（apps/backend）

### 5.1 目录组织

```text
apps/backend/
├── app/
│   ├── main.py                 # FastAPI 入口与 lifespan
│   ├── api/routes/             # HTTP 路由（按领域拆分）
│   ├── services/               # 业务编排与服务实现
│   ├── agents/                 # Agent Runtime、场景、工具
│   ├── capabilities/           # 能力注册与发现
│   ├── core/                   # 配置、认证、数据库、日志
│   ├── document_extraction/    # 文档解析
│   ├── graphrag/               # 知识图谱/GraphRAG
│   ├── knowledge/              # 向量知识库
│   ├── mcp/                    # MCP 协议实现
│   ├── models/                 # Pydantic 模型
│   ├── storage/                # 存储抽象
│   ├── skills/                 # 内置 Skill
│   └── vendors/                # 第三方 Agent 适配（如 hermes_agent）
├── data/                       # 内置 RAG/知识库数据
├── workspaces/                 # 用户工作区文件持久化
├── tests/                      # 测试
└── pyproject.toml              # 依赖与工具配置
```

### 5.2 核心服务层

| 模块 | 职责 |
|------|------|
| `services/agent` | Agent 执行编排、上下文压缩、SSE 事件流、Runtime 后端切换 |
| `services/session` | 会话生命周期、分支 Fork、消息历史、导出、检查点 |
| `services/memory` | 四层记忆架构（事实/程序/情境/参考） |
| `services/auto_tasks` | 自动任务引擎（连续/单次/周期/固定时间） |
| `services/runtime` | Python UV 环境、Kernel 生命周期、包管理 |
| `services/database` | DuckDB/SQLite 查询、外部数据库连接器 |
| `services/llm` | LLM Provider 管理、配置同步、模型选择 |
| `services/terminal` | 跨平台 PTY 会话管理 |
| `services/channel` / `services/claw` | IM 平台接入（飞书/微信等） |

### 5.3 路由层（主要 API 分组）

- `/api/agent/*`：Agent 执行（核心 SSE 端点 `/api/agent/execute/stream`）
- `/api/sessions/*`：会话、消息、分支、导出、执行、审批、监控
- `/api/workspaces/*`：工作区 CRUD、资源树、模板、运行时
- `/api/files/*`：文件浏览、上传、下载、版本、差异
- `/api/notebooks/*`：Notebook 与 Cell 的 CRUD 和执行
- `/api/database/*` / `/api/runtime_database/*` / `/api/file_database/*`：数据库查询
- `/api/knowledge/*` / `/api/rag/*`：知识库与向量检索
- `/api/mcp/*` / `/api/mcp-session/*` / `/api/skills/*` / `/api/capabilities/*`：能力市场
- `/api/auto_tasks/*`：自动化任务
- `/api/terminal/*`：WebSocket 终端
- `/api/ask-user/*`：人机确认
- `/api/auth/*`：认证

### 5.4 Agent 执行流

```text
用户输入
   │
   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Agent 编排   │───▶│  工具调用     │───▶│  Runtime 执行 │
│  (services/   │    │  (tools/)     │    │  (local/     │
│   agent)      │◀───│               │◀───│  docker)     │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       ▼
   SSE 事件流 (status/content/tool_call/tool_result/subagent_event/file_changes/error)
       │
       ▼
   前端渲染
```

SSE 事件类型覆盖：`status`、`content`（text/think）、`tool_call`、`tool_result`、`subagent_event`、`file_changes`、`error`，以 `[DONE]` 标记结束。

### 5.5 存储模型

- **应用数据库**：SQLite，位于 `data/app.db`，存储用户、会话元数据、工作区、配置等。
- **工作区文件**：`workspaces/{user_id}/{workspace_id}/`，包含上传文件、生成产物、Notebook、Canvas 等。
- **会话状态**：`workspaces/{user_id}/{session_id}/`，包含 `metadata.json`、`history.json`、文件快照、`.session/` SDK 状态。
- **向量库**：`data/chroma` 或 sqlite-vec 数据文件，支持多租户隔离。

---

## 6. 前端架构（apps/web）

### 6.1 目录组织

```text
apps/web/src/
├── App.tsx                     # 根组件与路由
├── pages/                      # 页面级组件
│   ├── WorkspacePage/          # 工作区主页面（核心）
│   ├── HomePage/               # 首页
│   ├── UserProfilePage/        # 用户配置
│   └── TokenDashboard/         # Token 用量
├── components/                 # 业务组件
│   ├── layout/WorkspaceSidebar/# 左侧工作区侧栏
│   ├── CanvasEditor/           # JSON Canvas 画布
│   ├── database/               # 数据库查询工作台
│   ├── chat/                   # 聊天与消息渲染
│   ├── editor/                 # CodeMirror 编辑器
│   ├── terminal/               # Web 终端
│   ├── settings/               # 设置面板
│   └── ui/                     # 基础 UI 组件
├── hooks/                      # 业务 Hooks（useAgentStream、useCodeExecutor 等）
├── lib/api/                    # API 客户端
├── contexts/                   # React Context
├── types/                      # TypeScript 类型
└── utils/                      # 工具函数
```

### 6.2 路由

当前为轻量自实现路由（非 react-router）：

- `/` / `/home`：首页
- `/workspace`：工作区主页面，支持 `?workspace_id=` 和 `?session_id=`
- `/profile`：用户配置
- `/dashboard`：Token 仪表盘
- 旧 `/analysis` 已重定向到 `/workspace`

### 6.3 核心页面结构

`WorkspacePage` 采用三段式骨架：

```text
┌─────────────────────────────────────────────────────────────────┐
│ 左侧 Activity Bar │ 中间 Object Canvas │ 右侧 Assistant Rail   │
│  - 工作区/全局     │  - 工作区概览      │  - 当前会话对话        │
│  - 资源/数据库     │  - 资源/能力/资产   │  - 输入区             │
│  - 文件搜索       │  - Notebook/Canvas │  - 上下文摘要         │
│  - 专家协作节点   │  - 数据库查询      │  - 当前对象轻量说明    │
│  - 文件变更       │  - PDF/图片/图表   │                        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 状态与数据流

- 页面级状态集中在 `WorkspacePage` 及其 Hooks 中。
- `useAgentStream` 封装 SSE 连接、事件解析与状态更新。
- `useCodeExecutor` 封装会话提交、上传、停止、工作区联动。
- API 调用通过 Vite 代理转发到后端（`/api`、`/health`、`/ws`）。
- SSE 流式端点单独配置代理，禁用压缩与缓冲。

---

## 7. 数据与检索

### 8.1 数据库策略

| 数据库 | 用途 | 说明 |
|--------|------|------|
| SQLite | 主元数据、用户、会话、配置 | 内置，开箱即用 |
| DuckDB | 分析型 SQL、本地数据表 | 内置 |
| sqlite-vec | 向量检索 | 内置 |
| PostgreSQL | 外部数据库连接器测试/生产 | 可选，见 `infra/docker/postgres` |
| MySQL | 外部数据库连接器 | 可选 |

### 8.2 检索能力

- **全文检索**：SQLite FTS5，用于知识库文档检索。
- **向量检索**：sqlite-vec / Chroma，用于语义检索。
- **混合检索**：结合全文与向量结果，支持多租户隔离。
- **GraphRAG**：可选 `graspologic + redis` 构建知识图谱社区分析。

---

## 9. 安全与隔离

### 9.1 认证模式

`config.toml` 中 `auth.mode` 支持：

- `local`：本地 JWT（Cookie 或 Bearer Token），默认返回本地默认用户。
- `sso`：外部 SSO Session 校验。
- `none`：开发/测试匿名身份。

当前主线按单机单用户设计，不强制独立登录流程。

### 9.2 代码执行隔离

- **本地沙盒**：默认模式，直接在本机 Python 环境执行。
- **Docker 沙盒**：云端部署默认启用，前端通过 `/api/system/capabilities` 隐藏本地沙盒选项。
- **环境变量隔离**：`LocalIPythonBox` 默认不继承后端敏感环境变量到执行内核。

### 9.3 敏感信息

- `config.toml` 已加入 `.gitignore`，不进入版本控制。
- 部署时推荐通过环境变量覆盖真实 Key（如 `AIASYS_LLM_PROVIDER_*_API_KEY`）。
- 前端不直接接触第三方模型 Key。

---

## 10. 部署架构

### 10.1 本地开发

统一入口为仓库根目录 `./dev.sh`：

```bash
./dev.sh setup      # 安装依赖
./dev.sh            # 启动前后端
./dev.sh status     # 查看状态
```

默认端口：

- Web：`http://127.0.0.1:13000`
- 后端：`http://127.0.0.1:13001`

### 10.2 手动部署

```bash
# 后端
cd apps/backend
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 13001

# 前端
cd apps/web
npm ci
npm run dev -- --host 0.0.0.0 --port 13000
```

### 10.3 生产部署

见 `infra/deploy/`，采用 **源码部署**：

- 前端：PM2 管理静态站点进程（`static_web_server.py`）
- 后端：PM2 管理 Python 进程
- 入口：Nginx 统一监听 80
- 数据库：Docker 运行 PostgreSQL（仅用于外部数据库连接器验证，系统本身不依赖）

核心脚本：

| 脚本 | 用途 |
|------|------|
| `deploy_init.sh` | 首次部署，安装全套环境 |
| `deploy_update.sh` | 后续更新，只上传代码并重启 |
| `check_server.sh` | 服务器资源与进程状态检查 |
| `remote_pm2.sh` | 远端 PM2 运维 |
| `remote_postgres.sh` | 远端 PostgreSQL 运维 |

---

## 11. 开发工作流与工程化

### 11.1 版本管理

- 语义化版本 `MAJOR.MINOR.PATCH`，当前阶段以 beta 预发布为主。
- 两端版本号必须同步：
  - `apps/web/package.json`
  - `apps/backend/pyproject.toml`

### 11.2 分支策略

- `main`：稳定发版分支
- `dev`：日常开发分支
- 所有功能/修复先合并到 `dev`，发版时从 `dev` 合并到 `main`
- 外部贡献：Fork → 功能分支 → PR 到 `dev`

### 11.3 提交规范

采用 Conventional Commits：

- `feat(scope):`
- `fix(scope):`
- `docs:`
- `refactor(scope):`
- `perf(scope):`
- `test(scope):`
- `chore(scope):`

### 11.4 代码质量

**前端**：

- ESLint
- TypeScript 类型检查（project references 结构）
- 单元测试（Node test runner）
- Playwright E2E 生命周期测试

**后端**：

- Ruff（lint + format）
- Pylint
- mypy
- pytest

**Pre-commit Hooks**（Lefthook）：

```bash
cd apps/web && npx lefthook install
```

自动运行前端 ESLint + TS 类型检查、后端 Ruff、EditorConfig 检查、作者校验。

### 11.5 CI/CD

`.github/workflows/` 包含：

- `ci.yml`：前后端 lint / test / build
- `pr-auto-review.yml` / `pr-merge-check.yml` / `pr-title-checker.yml`：PR 流程
- `secret-scan.yml`：密钥扫描
- `branch-relationship.yml`：分支关系检查
- `cleanup.yml`：清理工作流

---

## 12. 扩展性设计

### 12.1 MCP（Model Context Protocol）

- 通过 `fastmcp` 接入外部 MCP Server。
- 支持全局 MCP 配置与会话级 MCP 动态启用。
- 路由：`/api/mcp/*`、`/api/mcp-session/*`。

### 12.2 Skill 市场

- 内置 Skill 位于 `apps/backend/app/skills/` 和 `apps/backend/skills/`。
- 支持外部 Skill 安装、版本管理与 Agent 调用。
- 路由：`/api/skills/*`。

### 12.3 专家角色

- 协作专家通过能力注册表统一发现。
- 支持启用策略、工具策略、执行树可视化。
- 路由：`/api/capabilities/*`、`/api/workspaces/*` 专家启用相关接口。

### 12.4 工作区模板

- 模板位于 `apps/backend/templates/`。
- 支持内置模板、自定义模板、外部导入。
- 新建工作区时可选择模板并绑定 Python 环境。

---

## 13. 关键设计决策

| 决策 | 说明 |
|------|------|
| 本地优先 | 数据默认落盘本地，降低部署成本，适合科研/实验场景。 |
| 工作区核心 | 会话只是工作区内的一条任务推进线，所有产物归属于工作区。 |
| 前后端分离 | 前端纯 SPA，后端纯 API。 |
| 轻量路由 | 前端不使用 react-router，自实现基于 `location` 的路由，减少依赖。 |
| SSE 而非 WebSocket | Agent 执行以服务端推送事件为主，WebSocket 仅用于终端等实时双向场景。 |
| UV 管理 Python | 使用 `uv` 管理后端环境与依赖，启动速度快。 |
| SQLite 默认 | 无需外部数据库即可运行，降低首次使用门槛。 |

---

## 14. 相关文档索引

- 快速启动：`docs/guides/getting-started/QUICKSTART.md`
- 系统使用：`docs/guides/getting-started/SYSTEM_USAGE.md`
- 部署说明：`docs/deployment.md`
- 远端发布：`infra/deploy/README.md`
- 视觉基线：`DESIGN.md`
- 贡献指南：`CONTRIBUTING.md`
- 文档-代码映射：`docs/DOC_CODE_MAP.md`
- 后端 README：`apps/backend/README.md`
- 前端 README：`apps/web/README.md`

---

## 15. 维护建议

1. 修改代码时同步检查 `docs/DOC_CODE_MAP.md` 对应文档是否需要更新。
2. 用户可感知的功能新增、bug 修复、性能优化必须更新 `docs/changelog/`。
3. 涉及前后端接口变更时，同步更新前端类型与后端 Pydantic 模型。
4. 新增路由/能力时，考虑是否需要在 `/api/system/capabilities` 中暴露可用性。
5. 桌面端行为变更时，同步检查 `service-manager.cjs` 与打包脚本。
