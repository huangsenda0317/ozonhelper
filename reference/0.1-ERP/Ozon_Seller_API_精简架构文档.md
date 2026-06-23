
# Ozon Seller API（AI友好版接口文档）

## 1. API概览

Ozon Seller API 是 Ozon 平台提供给卖家的开放接口，主要用于：

- 商品管理
- 库存管理
- 价格管理
- 订单管理
- 仓库管理（FBO/FBS/rFBS）
- 促销活动
- 财务与报表
- 消息与客服聊天
- 推送通知（Webhook）

## 2. 鉴权方式

所有请求均需：

```http
Client-Id: {CLIENT_ID}
Api-Key: {API_KEY}
Content-Type: application/json
```

认证信息来自 Ozon Seller 后台。

---

## 3. 推荐给 AI Agent 的能力分组

### A. 商品中心（Catalog）

核心能力：

- 获取类目
- 获取属性
- 创建商品
- 更新商品
- 删除商品
- 查询商品

典型任务：

- 批量上传商品
- 同步 ERP 商品
- 更新图片
- 更新属性

---

### B. 库存与价格（Inventory）

核心能力：

- 查询库存
- 更新库存
- 查询价格
- 更新价格
- 预留库存

典型任务：

- ERP → Ozon库存同步
- 自动调价
- 缺货处理

---

### C. 订单中心（Order）

核心能力：

- 获取订单
- 获取订单状态
- 发货
- 取消订单
- 退货管理

典型任务：

- 自动拉单
- 自动发货
- 售后处理

---

### D. 仓储物流（Warehouse）

支持：

- FBO
- FBS
- rFBS
- CrossBorder

能力：

- 创建仓库
- 更新仓库
- 仓库归档
- 配送管理

---

### E. 促销营销（Promotion）

能力：

- 获取促销活动
- 参与 Ozon 官方活动
- 创建卖家活动
- 定价策略管理

---

### F. 财务与报表（Finance）

能力：

- 财务报表
- 销售报表
- 分析报表
- 结算数据

适合：

- BI分析
- 利润统计
- 自动对账

---

### G. 客服与聊天（Chat）

能力：

- 获取聊天
- 发送消息
- 获取未读消息
- 客服沟通

---

### H. 通知中心（Webhook）

支持事件：

- 新订单
- 订单取消
- 发货状态变更
- 商品创建
- 商品更新
- 库存变化
- 新聊天消息

推荐：

Webhook + 本地队列 + 数据库

---

## 4. AI开发推荐模块映射

| 模块 | Ozon能力 |
|-------|----------|
| Product Agent | 商品管理 |
| Inventory Agent | 库存同步 |
| Pricing Agent | 自动调价 |
| Order Agent | 自动拉单发货 |
| Warehouse Agent | FBS/FBO管理 |
| Promotion Agent | 活动管理 |
| Finance Agent | 财务分析 |
| Customer Agent | 聊天客服 |
| Notification Agent | Webhook监听 |

---

## 5. API目录结构（提炼版）

### 基础接口
- API Key信息
- 卖家账户信息

### 商品接口
- 商品上传更新
- 商品条码管理
- 商品属性管理

### 价格库存接口
- 商品价格
- 商品库存

### 订单接口
- FBO订单
- FBS订单
- rFBS订单
- 取消订单

### 仓库接口
- FBS仓库
- rFBS仓库

### 配送接口
- FBS配送
- rFBS配送

### 营销接口
- Ozon促销
- Seller促销
- 定价策略

### 财务接口
- 财务报告
- 销售报告
- 分析报告

### 客服接口
- Chat

### Webhook接口
- Notification

---

## 6. AI读取建议

建议按以下优先级向量化：

1. 商品接口
2. 订单接口
3. 库存接口
4. 仓库接口
5. Webhook接口
6. 财务接口

构建 MCP Server 时建议拆分工具：

- create_product
- update_product
- get_product
- update_stock
- update_price
- get_orders
- ship_order
- cancel_order
- get_finance_report
- get_chat_messages

这样最适合 Cursor、Claude Code、OpenAI Agent、MCP Server 调用。
