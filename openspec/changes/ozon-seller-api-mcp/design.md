## Context

- Ozon Seller API 共 263 个 POST 端点（除 `GET /v1/actions`），基础地址 `https://api-seller.ozon.ru`，鉴权头 `Client-Id` + `Api-Key`
- 项目已有 `backend/src/services/ozon/client.py`（`OzonSellerClient`），仅封装 `product_list` 与 `product_info_list`，供 FastAPI 店铺跟踪使用
- **原始文档** `reference/Ozon Seller API 文件.html`（5.8MB Redoc 预渲染）含完整 Request/Response Schema 与请求范例，是参数级真相来源
- 蒸馏文档 `reference/Ozon_Seller_API_精简架构文档.md` 给出 Agent 能力分组；`reference/Ozon_Seller_API_AI_阅读版.md` 列出端点目录与核心业务流程
- 项目尚无 MCP Server；Cursor 通过 stdio MCP 协议接入外部工具
- Ozon 限流：每 Client-Id 每秒最多 50 请求；2025-05-16 起仅支持后端到后端调用

## Goals / Non-Goals

**Goals:**

- 提供独立 MCP Server（`ozon-mcp/`），Agent 可通过工具调用 Ozon Seller API
- 高层语义工具覆盖跟卖核心链路：商品上架、库存价格、FBS 订单处理、仓库查询、财务报告、聊天
- 通用 `ozon_api_call` 工具覆盖全部 263 个端点，避免为每个接口单独写 tool
- 将 API 目录与业务流程暴露为 MCP Resources，Agent 可检索而不占 context
- 从原始 HTML 生成 `api-index.json`，提供 `get_endpoint_schema` 工具，补齐 Agent 调用 `ozon_api_call` 前的参数路书
- 统一鉴权、限流、错误映射；凭证通过环境变量配置，与 `backend/.env` 一致
- 提供 Cursor MCP 注册说明，开箱可用

**Non-Goals:**

- Webhook 接收与事件推送服务（Notification Agent 留后续）
- 多店铺凭证管理与切换（MVP 单店铺环境变量）
- 将 MCP 嵌入 FastAPI 后端（独立进程，stdio 传输）
- 为全部 263 个端点各建一个独立 tool（用通用调用 + 分组语义 tool 平衡）
- 本地缓存/数据库同步层

## Decisions

### 1. 包结构与部署形态

**选择**: 新建顶层目录 `ozon-mcp/`，独立 `pyproject.toml`，入口 `ozon_mcp.server:main`，stdio 传输。

```
ozon-mcp/
├── pyproject.toml
├── README.md
├── src/ozon_mcp/
│   ├── __init__.py
│   ├── server.py          # MCP Server 注册与启动
│   ├── client.py          # Ozon HTTP 客户端（对齐 backend 模式）
│   ├── rate_limiter.py    # 令牌桶 50/s
│   ├── errors.py          # 错误映射
│   ├── resources.py       # API 目录 Resource
│   └── tools/
│       ├── catalog.py
│       ├── inventory.py
│       ├── orders.py
│       └── meta.py
```

**理由**: MCP 生命周期与 FastAPI 不同（长驻 stdio 子进程），独立包避免污染 backend 依赖与启动流程。

**备选**: 在 `backend/` 内加 MCP 路由 — FastAPI 非 stdio MCP 标准接入方式，Cursor 配置复杂。

### 2. HTTP 客户端：独立实现、对齐约定

**选择**: `ozon-mcp` 内自建 `OzonApiClient`，逻辑对齐 `backend/src/services/ozon/client.py`（headers、超时、错误码），不直接 import backend（避免跨包路径与 Settings 耦合）。

**理由**: MCP 包应可单独 `pip install -e ozon-mcp` 运行；共享逻辑通过复制最小 `_post` 模式保持一致。

**备选**: 抽取 `packages/ozon-client` 共享库 — 过度设计，MVP 先独立。

### 3. 工具分层：语义工具 + 通用调用

**选择**:

| 层级 | 工具示例 | 用途 |
|------|----------|------|
| 语义层 | `get_category_tree`, `import_products`, `get_product_list`, `update_stocks`, `update_prices`, `get_fbs_orders`, `ship_fbs_order`, `get_seller_info` | Agent 常见任务，参数友好、带文档说明 |
| 通用层 | `ozon_api_call(path, method, body)` | 调用任意端点，path 如 `/v3/product/import` |

语义工具内部调用 `OzonApiClient._post`，参数经 Pydantic 校验后组装 body。

**理由**: 参考文档建议 10 个核心工具；263 个全量 tool 会导致 schema 膨胀与维护成本极高。通用层保证覆盖率。

### 4. MCP Resources：API 知识库 + Schema 索引

**选择**: 双层知识库：

| 层级 | 来源 | MCP 形态 |
|------|------|----------|
| 策略层 | 精简架构 MD + AI 阅读版 §6 | Resources: `overview`, `endpoints`, `workflows` |
| 参数层 | `Ozon Seller API 文件.html` | `data/api-index.json` + Tool `get_endpoint_schema` |

从 HTML 一次性解析生成 `api-index.json`（263 端点，含 path、method、title、request_fields、request_example）。Agent 工作流：先 `get_endpoint_schema` 查参数，再 `ozon_api_call` 调用。

**理由**: Markdown 是导航地图，HTML 是参数真相；整份 HTML 5.8MB 不适合直接作 Resource，JSON 索引可按 path 按需查询。

**备选**: 直接嵌入 HTML — 太大且 Redoc markup 难解析；在线拉 OpenAPI spec — 未确认稳定 URL。

### 5. 限流策略

**选择**: 进程内令牌桶，每 Client-Id 50 token/s，超出时 tool 返回明确错误 `OZON_RATE_LIMIT`，建议 Agent 等待后重试。

**理由**: 符合 Ozon 官方限制；多 Agent 并发时仍可能触发 Ozon 侧 429，客户端已映射该错误。

### 6. 工具描述与 inputSchema

**选择**: 每个 tool 的 `description` 包含：功能说明、对应 Ozon path、典型场景、关键参数提示。`inputSchema` 使用 JSON Schema，必填字段标注清楚。

**理由**: MCP tool 描述是 Agent 选型的唯一依据，需自解释。

### 7. Cursor 集成配置

**选择**: 文档提供 `~/.cursor/mcp.json` 片段：

```json
{
  "mcpServers": {
    "ozon-seller": {
      "command": "uv",
      "args": ["run", "--directory", "<repo>/ozon-mcp", "ozon-mcp"],
      "env": {
        "OZON_CLIENT_ID": "${env:OZON_CLIENT_ID}",
        "OZON_API_KEY": "${env:OZON_API_KEY}"
      }
    }
  }
}
```

**理由**: `uv run` 与项目 Python 工具链一致；环境变量从用户 shell 继承。

### 8. 依赖选型

**选择**: `mcp>=1.0.0`（官方 Python SDK）、`httpx`、`pydantic`、`pydantic-settings`。

**理由**: MCP SDK 提供 stdio server、tool/resource 注册标准 API。

## Risks / Trade-offs

- **[Risk] 语义工具参数与 Ozon 官方 schema 漂移** → 通用 `ozon_api_call` 作兜底；Resource 链到官方文档；语义工具 description 注明 API 版本
- **[Risk] 单店铺环境变量不满足多卖家** → 后续扩展 `OZON_CLIENT_ID` 多实例或 profile 参数；MVP 文档说明限制
- **[Risk] 50/s 限流在批量操作时不够** → 令牌桶 + 工具返回提示；语义工具支持批量上限（如 import 100 件/次）
- **[Risk] MCP 与 backend 客户端逻辑重复** → 接受 MVP 重复；后续可抽共享包
- **[Trade-off] 不实现全部 263 独立 tool** → Agent 需学会使用 `ozon_api_call`；通过 Resource 降低学习成本

## Migration Plan

1. 在 `ozon-mcp/` 实现并本地 `uv run ozon-mcp` 验证 stdio 启动
2. 配置 Cursor MCP，确认 tools 列表与一次 `get_seller_info` 调用成功
3. 将 `ozon-mcp/README.md` 链入项目 `quickstart.md`（可选，实现阶段）
4. 回滚：从 Cursor MCP 配置移除 `ozon-seller` 条目即可，不影响 backend

## Open Questions

- （已决）HTML → `api-index.json` 在实现阶段通过 `scripts/parse_ozon_api_html.py` 生成；文档更新时重新导出 HTML 并运行脚本
- （已决）`search_endpoints` 与 `get_endpoint_schema` 基于 `api-index.json` 实现
