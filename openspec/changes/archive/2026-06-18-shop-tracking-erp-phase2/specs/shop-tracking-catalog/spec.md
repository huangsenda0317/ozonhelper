## ADDED Requirements

### Requirement: 价格异常筛选

`GET /api/v1/tracking/products` SHALL 支持 Query 参数 `price_anomaly`（boolean）：筛选当前价低于保本价的商品。

#### Scenario: 筛选价格异常商品

- **WHEN** 用户请求 `price_anomaly=true`
- **THEN** 返回售价低于 suggested_min_price 的商品列表

### Requirement: 刊登来源标记

`synced_products` SHALL 可选字段 `listing_job_id`；商品详情 API 响应 MAY 含 `source=listing|sync`。

#### Scenario: 刊登商品标识

- **WHEN** 商品由 listing job 创建且已同步
- **THEN** 商品详情展示「刊登来源」标签

## MODIFIED Requirements

### Requirement: 商品中心页面

前端 SHALL 在 `/tracking/products` 提供：
- 列表列：图片、名称、SKU、价格、库存、销量、浏览量、转化率、状态、**保本价对比**
- Tab：全部 / 在售 / 下架 / 异常 / **价格异常**
- 批量选择与批量上下架
- 同步时间戳与「刷新」入口

#### Scenario: 价格异常 Tab

- **WHEN** 用户切换至价格异常 Tab
- **THEN** 列表仅展示 price_anomaly 商品且低于保本价标红
