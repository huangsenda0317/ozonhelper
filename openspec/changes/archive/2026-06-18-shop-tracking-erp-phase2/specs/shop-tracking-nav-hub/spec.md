## MODIFIED Requirements

### Requirement: ERP 工作台壳层

前端 SHALL 为 `/tracking` 及其子路由提供共享 Layout（`TrackingShell`），包含：
- 页面标题区「店铺跟踪」
- 店铺切换器（`StoreSwitcher`）
- 二级顶栏导航：概览、商品、库存、**价格**、**刊登**、订单、**财务**、**物流预警**、预警
- 全局「立即同步」按钮

#### Scenario: 子路由共享 Layout

- **WHEN** 用户访问 `/tracking/products`
- **THEN** 展示 ERP Layout，二级导航「商品」为激活态

#### Scenario: 未绑定店铺引导

- **WHEN** 用户无任何已绑定店铺
- **THEN** Layout 展示空状态，引导前往 `/settings/stores` 绑定店铺

### Requirement: 路由映射

系统 SHALL 按以下路由组织 ERP 子模块：

| 路径 | 模块 |
|------|------|
| `/tracking` | 概览看板 |
| `/tracking/products` | 商品中心 |
| `/tracking/products/{id}` | 商品详情 |
| `/tracking/inventory` | 库存中心 |
| `/tracking/pricing` | 价格中心 |
| `/tracking/listing` | 新品刊登 |
| `/tracking/orders` | 订单中心 |
| `/tracking/finance` | 财务对账 |
| `/tracking/logistics-alerts` | 物流预警 |
| `/tracking/alerts` | 预警汇总 |

#### Scenario: 商品列表路径

- **WHEN** 用户访问商品列表
- **THEN** 位于 `/tracking/products` 且功能完整

#### Scenario: 价格中心路径

- **WHEN** 用户点击侧边栏「价格」
- **THEN** 导航至 `/tracking/pricing` 且 Layout 激活态正确
