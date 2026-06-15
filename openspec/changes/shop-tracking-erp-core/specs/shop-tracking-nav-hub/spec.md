## ADDED Requirements

### Requirement: 导航首位展示

`GlobalNav` 与首页模块卡片 SHALL 将「店铺跟踪」置于所有业务模块之前（第一位）。

#### Scenario: 导航顺序

- **WHEN** 已登录用户查看顶部导航
- **THEN** 第一项为「店铺跟踪」，链接至 `/tracking`

#### Scenario: 首页卡片顺序

- **WHEN** 已登录用户访问首页
- **THEN** 「店铺跟踪」模块卡片位于所有功能模块最前

### Requirement: 登录后默认入口

系统 SHALL 在用户登录成功后默认跳转至 `/tracking` 概览看板（除非 URL 含明确 redirect 参数）。

#### Scenario: 登录跳转

- **WHEN** 用户从 `/login` 成功登录且无 redirect 参数
- **THEN** 浏览器导航至 `/tracking`

### Requirement: ERP 工作台壳层

前端 SHALL 为 `/tracking` 及其子路由提供共享 Layout，包含：
- 页面标题区「店铺工作台」
- 店铺切换器（`StoreSwitcher`）
- 二级侧边/顶栏导航：概览、商品、库存、订单、预警
- 全局「立即同步」按钮与最近同步时间展示

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
| `/tracking/orders` | 订单中心 |
| `/tracking/alerts` | 预警汇总 |

#### Scenario: 旧路径兼容

- **WHEN** 用户直接访问原 MVP 商品列表逻辑
- **THEN** 商品列表位于 `/tracking/products` 且功能完整
