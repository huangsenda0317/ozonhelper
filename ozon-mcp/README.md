# Ozon Seller API MCP Server

面向 AI Agent（Cursor、Claude Code 等）的 Ozon Seller API MCP 服务，支持商品上架、库存价格、FBS 订单、财务、聊天等跟卖全链路操作。

## 环境变量

与 `backend/.env` 共用：

```bash
export OZON_CLIENT_ID="your-client-id"
export OZON_API_KEY="your-api-key"
# 可选
export OZON_API_BASE_URL="https://api-seller.ozon.ru"
```

## 安装

```bash
cd ozon-mcp
pip install -e .
```

## 更新 API 索引（官方文档变更时）

从 `reference/Ozon Seller API 文件.html` 重新生成 `api-index.json`：

```bash
python scripts/parse_ozon_api_html.py
cp data/api-index.json src/ozon_mcp/data/api-index.json
```

## Cursor MCP 配置

在 `~/.cursor/mcp.json` 或项目 `.cursor/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "ozon-seller": {
      "command": "python3",
      "args": ["-m", "ozon_mcp.server"],
      "cwd": "/Users/huangsenda/Project/code/ozonhelper/ozon-mcp",
      "env": {
        "OZON_CLIENT_ID": "你的Client-Id",
        "OZON_API_KEY": "你的Api-Key",
        "PYTHONPATH": "src"
      }
    }
  }
}
```

或使用已安装入口：

```json
{
  "mcpServers": {
    "ozon-seller": {
      "command": "ozon-mcp"
    }
  }
}
```

## 推荐 Agent 工作流

```
1. read_resource ozon://api/workflows     → 了解业务流程
2. search_endpoints("库存")              → 找端点 path
3. get_endpoint_schema("/v2/products/stocks")  → 查参数与请求范例
4. 优先用语义 tool（update_stocks 等）    → 常见任务
5. 长尾接口用 ozon_api_call              → 覆盖全部 263 端点
```

## MCP Resources

| URI | 内容 |
|-----|------|
| `ozon://api/overview` | 能力分组与 Agent 策略 |
| `ozon://api/endpoints` | 按模块分类的端点目录 |
| `ozon://api/workflows` | 上架、订单、促销等核心流程 |

## Tools 一览（36 个）

### 商品与类目
| Tool | Ozon Path |
|------|-----------|
| `get_category_tree` | POST /v1/description-category/tree |
| `get_category_attributes` | POST /v1/description-category/attribute |
| `get_attribute_values` | POST /v1/description-category/attribute/values |
| `import_products` | POST /v3/product/import |
| `get_import_status` | POST /v1/product/import/info |
| `get_product_list` | POST /v3/product/list |
| `get_product_info` | POST /v3/product/info/list |
| `import_product_pictures` | POST /v1/product/pictures/import |
| `archive_product` | POST /v1/product/archive |
| `unarchive_product` | POST /v1/product/unarchive |

### 库存与价格
| Tool | Ozon Path |
|------|-----------|
| `get_product_stocks` | POST /v4/product/info/stocks |
| `get_fbs_stocks_by_warehouse` | POST /v2/product/info/stocks-by-warehouse/fbs |
| `update_stocks` | POST /v2/products/stocks |
| `get_product_prices` | POST /v5/product/info/prices |
| `update_prices` | POST /v1/product/import/prices |

### 订单与物流
| Tool | Ozon Path |
|------|-----------|
| `get_fbs_unfulfilled_orders` | POST /v4/posting/fbs/unfulfilled/list |
| `get_fbs_orders` | POST /v4/posting/fbs/list |
| `get_fbs_order` | POST /v3/posting/fbs/get |
| `ship_fbs_order` | POST /v4/posting/fbs/ship |
| `print_package_label` | POST /v2/posting/fbs/package-label |
| `mark_awaiting_delivery` | POST /v2/posting/fbs/awaiting-delivery |
| `cancel_fbs_order` | POST /v2/posting/fbs/cancel |
| `set_tracking_number` | POST /v2/fbs/posting/tracking-number/set |
| `mark_delivering` | POST /v2/fbs/posting/delivering |
| `mark_delivered` | POST /v2/fbs/posting/delivered |

### 元数据与通用
| Tool | Ozon Path |
|------|-----------|
| `get_seller_info` | POST /v1/seller/info |
| `get_api_roles` | POST /v1/roles |
| `list_warehouses` | POST /v2/warehouse/list |
| `get_transaction_list` | POST /v3/finance/transaction/list |
| `get_realization_report` | POST /v2/finance/realization |
| `list_chats` | POST /v3/chat/list |
| `get_chat_history` | POST /v3/chat/history |
| `send_chat_message` | POST /v1/chat/send/message |
| `get_endpoint_schema` | 本地 api-index（来自官方 HTML） |
| `search_endpoints` | 本地 api-index 搜索 |
| `ozon_api_call` | 任意 /v* 端点 |

## 本地验证

```bash
# 生成索引
python scripts/parse_ozon_api_html.py

# 检查工具数量
python -c "from ozon_mcp.server import mcp; print(len(mcp._tool_manager._tools))"

# 查 schema
python -c "from ozon_mcp.tools.meta import get_endpoint_schema; print(get_endpoint_schema('/v3/product/import')[:200])"
```

## 限流

进程内令牌桶：每 Client-Id 50 请求/秒，与 Ozon 官方限制一致。
