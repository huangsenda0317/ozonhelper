# Ozon Seller API 接口文档（AI 阅读版）

> 来源：https://docs.ozon.ru/api/seller/zh/  
> 版本：2.1  
> 生成时间：2026-06-15  
> 共收录 **263** 个接口

---

## 目录

1. [基础信息](#1-基础信息)
2. [认证方式](#2-认证方式)
3. [请求格式](#3-请求格式)
4. [接口总览](#4-接口总览)
5. [按模块分类接口详情](#5-按模块分类接口详情)
6. [核心业务流程](#6-核心业务流程)
7. [限流与错误处理](#7-限流与错误处理)
8. [更新日志](#8-更新日志)

---

## 1. 基础信息

| 项目 | 说明 |
|------|------|
| **API 基础地址** | `https://api-seller.ozon.ru` |
| **协议** | HTTPS only |
| **数据格式** | JSON |
| **编码** | UTF-8 |
| **时区** | UTC |
| **请求方式** | 全部为 POST（除 `/v1/actions` 为 GET） |

### 重要变更（2025-05-16 起）
- **Seller API 仅支持后端到后端调用**
- 浏览器的直接请求将被 CORS 策略阻止
- 每秒每个 Client ID 最多 **50** 个请求

---

## 2. 认证方式

所有请求必须在 HTTP Header 中携带以下认证信息：

```http
Client-Id: <你的Client-ID>
Api-Key: <你的API密钥>
Content-Type: application/json
```

### 获取 API 密钥
1. 在卖家个人中心进入 **设置 → 卖家 API**
2. 点击 **生成密钥**
3. 命名密钥并选择访问级别
4. 选择使用目的（个人使用 / 外部服务）
5. 点击 **生成**

⚠️ **安全提示**：
- API 密钥仅在创建时可见，请立即保存
- 密钥有效期 **6 个月**
- 可通过 `/v1/roles` 的 `expires_at` 字段查看到期时间
- 如泄露，立即删除并重新生成

---

## 3. 请求格式

```http
POST /{version}/{endpoint} HTTP/1.1
Host: api-seller.ozon.ru
Client-Id: <Client-Id>
Api-Key: <Api-Key>
Content-Type: application/json

{JSON请求体}
```

---

## 4. 接口总览

| 模块 | 接口数量 | 主要功能 |
|------|----------|----------|
| 商品管理 | 20 | 创建/更新/查询/删除商品、图片、属性 |
| 卖家促销活动 | 18 | 创建/管理各类促销活动 |
| Ozon 促销活动 | 12 | 参与平台促销活动 |
| 定价策略 | 12 | 自动定价、竞争对手监控 |
| FBS/rFBS 订单处理 | 12 | 订单列表、发货、取消 |
| FBS 配送 | 12 | 发运、标签、装配 |
| FBP 配送 | 11 | FBP 订单管理 |
| 仓库管理 | 16 | FBS/rFBS 仓库创建、配置、归档 |
| 价格与库存 | 9 | 更新价格、库存查询 |
| 退货管理 | 9 | FBO/FBS/rFBS 退货处理 |
| 聊天 | 6 | 买家消息管理 |
| 财务报告 | 6 | 交易、销售、赔偿报告 |
| 评价/问答 | 15 | 评价回复、问题管理 |
| 其他 | 若干 | 通行证、标签代码、卖家评级等 |

---

## 5. 按模块分类接口详情


### 商品上传和更新

- **`POST` `/v3/product/import`** — 创建或更新商品
- **`POST` `/v1/product/import/info`** — 查询商品添加或更新状态
- **`POST` `/v1/product/import-by-sku`** — 通过SKU创建商品
- **`POST` `/v1/product/attributes/update`** — 更新商品特征
- **`POST` `/v1/product/pictures/import`** — 上传或更新商品图片
- **`POST` `/v3/product/list`** — 品列表的
- **`POST` `/v1/product/rating-by-sku`** — 按SKU获得商品的内容排名
- **`POST` `/v3/product/info/list`** — 根据标识符获取商品信息
- **`POST` `/v3/products/info/attributes`** — 获取商品特征描述
- **`POST` `/v4/product/info/attributes`** — 获取商品特征描述
- **`POST` `/v1/product/info/description`** — 获取商品详细信息
- **`POST` `/v4/product/info/limit`** — 品类限制、商品的创建和更新
- **`POST` `/v1/product/update/offer-id`** — 从卖家的系统中改变商品货号
- **`POST` `/v1/product/archive`** — 将商品归档
- **`POST` `/v1/product/unarchive`** — 从档案中还原商品
- **`POST` `/v2/products/delete`** — 从存档删除没有SKU的商品
- **`POST` `/v1/product/info/subscription`** — 订阅该商品的用户数
- **`POST` `/v1/product/related-sku/get`** — 获取相关SKU
- **`POST` `/v2/product/pictures/info`** — 获取商品图片
- **`POST` `/v1/product/info/wrong-volume`** — 体积重量特征不正确的商品列表

### 卖家促销活动

- **`POST` `/v1/seller-actions/create/discount`** — 创建采用"折扣"机制的促销活动
- **`POST` `/v1/seller-actions/create/discount-with-condition`** — 创建采用"基于订单总额的折扣"机制的促销活动
- **`POST` `/v1/seller-actions/create/installment`** — 创建采用"免息分期付款"机制的促销活动
- **`POST` `/v1/seller-actions/create/multi-level-discount`** — 创建采用"多级满额折扣"机制的促销活动
- **`POST` `/v1/seller-actions/create/voucher`** — 创建采用"促销码折扣"机制的促销活动
- **`POST` `/v1/seller-actions/update/discount`** — 更新“折扣”机制的促销活动
- **`POST` `/v1/seller-actions/update/discount-with-condition`** — 更新“基于订单总额的折扣”机制的促销活动
- **`POST` `/v1/seller-actions/update/installment`** — 更新“免息分期付款”机制的促销活动
- **`POST` `/v1/seller-actions/update/multi-level-discount`** — 更新“多级满额折扣”机制的促销活动
- **`POST` `/v1/seller-actions/update/voucher`** — 更新“促销码折扣”机制的促销活动
- **`POST` `/v1/seller-actions/products/add`** — 将商品添加到促销活动中
- **`POST` `/v1/seller-actions/products/candidates`** — 获取促销活动可用商品列表
- **`POST` `/v1/seller-actions/products/delete`** — 从促销活动中移除商品
- **`POST` `/v1/seller-actions/products/list`** — 获取参与活动的商品列表
- **`POST` `/v1/seller-actions/archive`** — 将促销活动归档
- **`POST` `/v1/seller-actions/change-activity`** — 启用或关闭活动
- **`POST` `/v1/seller-actions/list`** — 获取促销活动列表
- **`POST` `/v1/seller-actions/voucher/get`** — 获取CSV格式的促销码文件

### Ozon促销活动

- **`GET` `/v1/actions`** — 活动清单
- **`POST` `/v1/actions/candidates`** — 可用的促销商品清单
- **`POST` `/v1/actions/products`** — 参与 活动的商品列表
- **`POST` `/v1/actions/products/activate`** — 在促销活动中增加一个商品
- **`POST` `/v1/actions/products/deactivate`** — 从活动中删除商品
- **`POST` `/v1/actions/discounts-task/list`** — 申请折扣列表
- **`POST` `/v1/actions/discounts-task/approve`** — 同意折扣申请
- **`POST` `/v1/actions/discounts-task/decline`** — 取消折扣申请
- **`POST` `/v1/actions/auto-add/products/list`** — 获取促销活动自动添加列表中的商品列表
- **`POST` `/v1/actions/auto-add/products/candidates`** — 获取可自动添加到促销活动中的商品列表
- **`POST` `/v1/actions/auto-add/products/delete`** — 从促销活动自动添加列表中删除商品
- **`POST` `/v1/actions/auto-add/products/update`** — 在促销活动自动添加列表中添加或更新商品

### 定价策略

- **`POST` `/v1/pricing-strategy/competitors/list`** — 竞争对手名单
- **`POST` `/v1/pricing-strategy/list`** — 策略列表
- **`POST` `/v1/pricing-strategy/create`** — 创建策略
- **`POST` `/v1/pricing-strategy/info`** — 策略信息
- **`POST` `/v1/pricing-strategy/update`** — 更新策略
- **`POST` `/v1/pricing-strategy/products/add`** — 将商品添加到策略
- **`POST` `/v1/pricing-strategy/strategy-ids-by-product-ids`** — 策略ID列表
- **`POST` `/v1/pricing-strategy/products/list`** — 策略中的商品列表
- **`POST` `/v1/pricing-strategy/product/info`** — 竞争对手  的商品价格
- **`POST` `/v1/pricing-strategy/products/delete`** — 从策略中删除商品
- **`POST` `/v1/pricing-strategy/status`** — 更改策略状态
- **`POST` `/v1/pricing-strategy/delete`** — 删除策略

### FBS和rFBS订单处理

- **`POST` `/v4/posting/fbs/unfulfilled/list`** — 获取未处理货件列表
- **`POST` `/v4/posting/fbs/list`** — 获取货件列表
- **`POST` `/v3/posting/fbs/get`** — 按照ID获取货件信息
- **`POST` `/v2/posting/fbs/get-by-barcode`** — 按条形码获取有关货件的信息
- **`POST` `/v2/posting/fbs/product/country/list`** — 可用产地名单
- **`POST` `/v2/posting/fbs/product/country/set`** — 添加商品产地信息
- **`POST` `/v2/posting/fbs/package-label`** — 打印标签
- **`POST` `/v2/posting/fbs/awaiting-delivery`** — 货件装运
- **`POST` `/v2/posting/fbs/cancel-reason/list`** — 货件取消原因
- **`POST` `/v1/posting/fbs/cancel-reason`** — 货运取消原因
- **`POST` `/v2/posting/fbs/cancel`** — 取消货运
- **`POST` `/v2/posting/fbs/product/cancel`** — 取消某些商品发货

### FBS配送

- **`POST` `/v1/carriage/create`** — 创建发运
- **`POST` `/v1/carriage/approve`** — 发运确认
- **`POST` `/v1/carriage/get`** — 运输信息
- **`POST` `/v1/posting/carriage-available/list`** — 可供运输的列表
- **`POST` `/v1/carriage/set-postings`** — 发运组成商品更改
- **`POST` `/v1/carriage/cancel`** — 发运删除
- **`POST` `/v2/posting/fbs/act/get-postings`** — 单据中的货件列表
- **`POST` `/v2/posting/fbs/act/get-container-labels`** — 货位标签
- **`POST` `/v1/assembly/carriage/posting/list`** — 获取发运中的货件列表
- **`POST` `/v1/assembly/carriage/product/list`** — 获取发运中的商品列表
- **`POST` `/v1/assembly/fbs/posting/list`** — 获取货件列表
- **`POST` `/v1/assembly/fbs/product/list`** — 获取货件中的商品列表

### 其他方法

- **`POST` `/v1/posting/fbs/split`** — 将订单拆分为不带备货的货件
- **`POST` `/v1/product/info/warehouse/stocks`** — 获取FBS和rFBS仓库库存信息
- **`POST` `/v1/product/stairway-discount/by-quantity/set`** — 管理按数量折扣
- **`POST` `/v1/product/stairway-discount/by-quantity/get`** — 获取按数量折扣信息
- **`POST` `/v1/finance/balance`** — 获取余额报告
- **`POST` `/v1/description-category/tips`** — 获取用于确定商品类目的提示
- **`POST` `/v2/actions/discounts-task/list`** — 获取折扣申请列表
- **`POST` `/v1/product/visibility/set`** — 新增了用于设置商品在Ozon和Ozon Select橱窗可见性的Beta方法。
- **`POST` `/v1/finance/accrual/postings`** — 获取按货件统计的应计项目
- **`POST` `/v1/finance/accrual/types`** — 获取应计项目参考信息
- **`POST` `/v1/finance/accrual/by-day`** — 获取某日应计项目
- **`POST` `/v1/product/visibility/info`** — 获取商品可见性信息

### FBP配送

- **`POST` `/v1/fbp/act-from/create`** — 生成验收证明书
- **`POST` `/v1/fbp/act-from/get`** — 获取验收证明书生成状态
- **`POST` `/v1/fbp/act-to/create`** — 生成货物运单
- **`POST` `/v1/fbp/act-to/get`** — 获取货物运单生成状态
- **`POST` `/v1/fbp/archive/get`** — 获取已完成交货信息
- **`POST` `/v1/fbp/archive/list`** — 获取已完成交货列表
- **`POST` `/v1/fbp/label/create`** — 创建标签生成任务
- **`POST` `/v1/fbp/label/get`** — 获取标签生成任务状态
- **`POST` `/v1/fbp/order/get`** — 获取关于特定交货的信息
- **`POST` `/v1/fbp/order/list`** — 获取交货列表
- **`POST` `/v1/posting/fbp/list`** — 获取货件列表

### 处理 FBP direct 交货草稿

- **`POST` `/v1/fbp/draft/direct/seller-dlv/create`** — 创建由卖家配送的草稿
- **`POST` `/v1/fbp/draft/direct/seller-dlv/edit`** — 更新草稿中由卖家配送的信息
- **`POST` `/v1/fbp/draft/direct/timeslot/edit`** — 编辑草稿中的时间段
- **`POST` `/v1/fbp/draft/direct/timeslot/get`** — 获取直供的时间段列表
- **`POST` `/v1/fbp/draft/direct/create`** — 创建不指定配送方法的交货申请草稿
- **`POST` `/v1/fbp/draft/direct/delete`** — 删除交货申请草稿
- **`POST` `/v1/fbp/draft/direct/product/validate`** — 检查合作伙伴仓库商品列表
- **`POST` `/v1/fbp/draft/direct/registrate`** — 将草稿单转为正式交货
- **`POST` `/v1/fbp/draft/direct/tpl-dlv/create`** — 创建第三方物流公司配送的申请草稿
- **`POST` `/v1/fbp/draft/direct/tpl-dlv/edit`** — 编辑采用第三方承运商配送方法的交货草稿

### 商品价格和库存

- **`POST` `/v2/products/stocks`** — 更新库存商品的数量
- **`POST` `/v4/product/info/stocks`** — 关于商品数量的信息
- **`POST` `/v2/product/info/stocks-by-warehouse/fbs`** — 获取卖家仓库库存信息
- **`POST` `/v1/product/import/prices`** — 更新价格
- **`POST` `/v1/product/action/timer/update`** — 最低价格时效性计时器更新
- **`POST` `/v1/product/action/timer/status`** — 获取已设置计时器状态
- **`POST` `/v5/product/info/prices`** — 获取商品价格信息
- **`POST` `/v1/product/info/discounted`** — 通过减价商品的SKU查找减价商品和主商品的信息
- **`POST` `/v1/product/update/discount`** — 为打折商品设置折扣

### 创建并管理 FBS 仓库

- **`POST` `/v1/warehouse/fbs/create/drop-off/list`** — 获取用于创建仓库的揽收点列表
- **`POST` `/v1/warehouse/fbs/update/drop-off/list`** — 获取用于修改仓库信息的揽收点列表
- **`POST` `/v1/warehouse/fbs/create/drop-off/timeslot/list`** — 获取用于创建drop-off发运仓库的时间段列表
- **`POST` `/v1/warehouse/fbs/update/drop-off/timeslot/list`** — 获取用于更新drop-off发运仓库的时间段列表
- **`POST` `/v1/warehouse/fbs/create/pick-up/timeslot/list`** — 获取用于创建pick-up发运仓库的时间段列表
- **`POST` `/v1/warehouse/fbs/update/pick-up/timeslot/list`** — 获取用于更新pick-up发运仓库的时间段列表
- **`POST` `/v1/warehouse/fbs/create`** — 创建仓库
- **`POST` `/v1/warehouse/fbs/update`** — 更新仓库
- **`POST` `/v1/warehouse/fbs/first-mile/update`** — 更新头程物流

### 通行证

- **`POST` `/v1/pass/list`** — 通行证列表
- **`POST` `/v1/carriage/pass/create`** — 创建通行证
- **`POST` `/v1/carriage/pass/update`** — 更新通行证
- **`POST` `/v1/carriage/pass/delete`** — 删除通行证
- **`POST` `/v1/return/pass/create`** — 创建退货通行证
- **`POST` `/v1/return/pass/update`** — 更新退货通行证
- **`POST` `/v1/return/pass/delete`** — 删除退货通行证
- **`POST` `/v1/returns/company/fbs/info`** — FBS退货数量

### rFBS商品退货

- **`POST` `/v2/returns/rfbs/list`** — 退货申请列表
- **`POST` `/v2/returns/rfbs/get`** — 退货申请信息
- **`POST` `/v2/returns/rfbs/reject`** — 拒绝退货申请
- **`POST` `/v2/returns/rfbs/compensate`** — 退还部分商品金额
- **`POST` `/v2/returns/rfbs/verify`** — 批准退货申请
- **`POST` `/v2/returns/rfbs/receive-return`** — 确认收到待检查商品
- **`POST` `/v2/returns/rfbs/return-money`** — 向买家退款
- **`POST` `/v1/returns/rfbs/action/set`** — 传递 rFBS  退货的可用操作

### 报告

- **`POST` `/v1/report/info`** — 报告信息
- **`POST` `/v1/report/list`** — 报告清单
- **`POST` `/v1/report/products/create`** — 商品报告
- **`POST` `/v1/report/postings/create`** — 发货报告
- **`POST` `/v1/finance/cash-flow-statement/list`** — 财务报告
- **`POST` `/v1/report/discounted/create`** — 减价商品报告
- **`POST` `/v1/report/warehouse/stock`** — 关于FBS仓库库存报告
- **`POST` `/v1/report/marked-products-sales/create`** — 生成带有标记商品的销售报告

### 问题和回答管理

- **`POST` `/v1/question/answer/create`** — 创建对问题的回答
- **`POST` `/v1/question/answer/delete`** — 删除问题回答
- **`POST` `/v1/question/answer/list`** — 问题回答列表
- **`POST` `/v1/question/change_status`** — 更改问题状态
- **`POST` `/v1/question/count`** — 按状态统计问题数量
- **`POST` `/v1/question/info`** — 问题详情
- **`POST` `/v1/question/list`** — 问题列表
- **`POST` `/v1/question/top_sku`** — 提问数量最多的商品

### 处理 FBP drop-off 交货草稿

- **`POST` `/v1/fbp/draft/drop-off/province/list`** — 获取省份列表
- **`POST` `/v1/fbp/draft/drop-off/point/list`** — 获取省份内接收点列表
- **`POST` `/v1/fbp/draft/drop-off/point/timetable`** — 获取接收点的营业时间表
- **`POST` `/v1/fbp/draft/drop-off/product/validate`** — 检查合作伙伴仓库可接收的商品列表
- **`POST` `/v1/fbp/draft/drop-off/create`** — 创建接收点配送草稿
- **`POST` `/v1/fbp/draft/drop-off/delete`** — 删除接收点配送草稿
- **`POST` `/v1/fbp/draft/drop-off/dlv/edit`** — 编辑接收点配送草稿的配送详情
- **`POST` `/v1/fbp/draft/drop-off/registrate`** — 将草稿转为正式交货

### FBS 和 rFBS 仓库管理

- **`POST` `/v2/warehouse/list`** — 仓库列表
- **`POST` `/v2/delivery-method/list`** — realFBS仓库的配送方式列表
- **`POST` `/v1/warehouse/operation/status`** — 获取操作状态
- **`POST` `/v1/warehouse/archive`** — 将仓库归档
- **`POST` `/v1/warehouse/unarchive`** — 将仓库解除归档
- **`POST` `/v1/warehouse/invalid-products/get`** — 获取配送受限商品列表
- **`POST` `/v1/warehouse/warehouses-with-invalid-products`** — 获取含有配送受限商品的仓库列表

### 评价管理

- **`POST` `/v1/review/comment/create`** — 对评价留下评论
- **`POST` `/v1/review/comment/delete`** — 删除对评价的评论
- **`POST` `/v1/review/comment/list`** — 评价的评论列表
- **`POST` `/v1/review/change-status`** — 更改评价状态
- **`POST` `/v1/review/count`** — 根据状态统计的评价数量
- **`POST` `/v1/review/info`** — 获取评价信息
- **`POST` `/v2/review/list`** — 获取评价列表

### Premium

- **`POST` `/v1/analytics/data`** — 分析数据
- **`POST` `/v1/analytics/product-queries`** — 获取商品搜索查询信息
- **`POST` `/v1/analytics/product-queries/details`** — 有关特定商品查询的信息
- **`POST` `/v1/finance/realization/by-day`** — 每日商品销售报告
- **`POST` `/v1/search-queries/text`** — 获取按文本筛选的搜索查询列表
- **`POST` `/v1/search-queries/top`** — 获取热门搜索查询列表
- **`POST` `/v1/product/prices/details`** — 获取商品价格的详细信息

### 与买家的聊天

- **`POST` `/v1/chat/send/message`** — 发送信息
- **`POST` `/v1/chat/send/file`** — 发送文件
- **`POST` `/v1/chat/start`** — 创建新聊天
- **`POST` `/v3/chat/list`** — 聊天清单
- **`POST` `/v3/chat/history`** — 聊天历史记录
- **`POST` `/v2/chat/read`** — 将信息标记为已读

### 财务报告

- **`POST` `/v2/finance/realization`** — 商品销售报告 （第2版）
- **`POST` `/v1/finance/realization/posting`** — 按订单细分的商品销售报告
- **`POST` `/v3/finance/transaction/list`** — 交易清单
- **`POST` `/v3/finance/transaction/totals`** — 清单数目
- **`POST` `/v1/finance/compensation`** — 赔偿报告
- **`POST` `/v1/finance/decompensation`** — 赔偿返还报告

### rFBS配送

- **`POST` `/v2/fbs/posting/delivering`** — 将状态改成“运输中”
- **`POST` `/v2/fbs/posting/tracking-number/set`** — 添加跟踪号
- **`POST` `/v2/fbs/posting/last-mile`** — 状态改为“最后一英里”
- **`POST` `/v2/fbs/posting/delivered`** — 将状态改成“已送达”
- **`POST` `/v1/posting/cutoff/set`** — 确认货件发运日期

### 标签代码管理

- **`POST` `/v6/fbs/posting/product/exemplar/set`** — 检查并保存份数数据
- **`POST` `/v6/fbs/posting/product/exemplar/create-or-get`** — 获取已创建样件数据
- **`POST` `/v5/fbs/posting/product/exemplar/status`** — 获取样件添加状态
- **`POST` `/v5/fbs/posting/product/exemplar/validate`** — 标志代码验证
- **`POST` `/v1/fbs/posting/product/exemplar/update`** — Обновить данные экземпляров

### 处理 FBP pick-up 交货草稿

- **`POST` `/v1/fbp/draft/pick-up/create`** — 创建 pick-up 交货申请草稿
- **`POST` `/v1/fbp/draft/pick-up/delete`** — 取消 pick-up 交货申请草稿
- **`POST` `/v1/fbp/draft/pick-up/dlv/edit`** — 修改 pick-up 交货申请
- **`POST` `/v1/fbp/draft/pick-up/product/validate`** — 验证用于 pick-up 交货的商品列表
- **`POST` `/v1/fbp/draft/pick-up/registrate`** — 将草稿单转为正式交货

### Ozon 的属性和特征

- **`POST` `/v1/description-category/tree`** — 商品类别和类型的树形图
- **`POST` `/v1/description-category/attribute`** — 类别特征列表
- **`POST` `/v1/description-category/attribute/values`** — 特征值指南
- **`POST` `/v1/description-category/attribute/values/search`** — 根据属性的参考值进行搜索

### 处理 FBP direct 请求

- **`POST` `/v1/fbp/order/direct/cancel`** — 取消交货
- **`POST` `/v1/fbp/order/direct/seller-dlv/edit`** — 更新卖家自配送信息
- **`POST` `/v1/fbp/order/direct/timeslot/edit`** — 编辑交货申请中的时间段
- **`POST` `/v1/fbp/order/direct/timeslot/list`** — 获取交货时间段列表

### 取消订单

- **`POST` `/v2/conditional-cancellation/list`** — 获取 rFBS 取消申请列表
- **`POST` `/v2/conditional-cancellation/approve`** — 确认 rFBS 取消申请
- **`POST` `/v2/conditional-cancellation/reject`** — 拒绝 rFBS 取消申请

### 使用FBP草稿

- **`POST` `/v1/fbp/warehouse/list`** — 获取合作伙伴仓库列表
- **`POST` `/v1/fbp/draft/get`** — 获取交货草稿信息
- **`POST` `/v1/fbp/draft/list`** — 交货草稿列表

### 处理 FBP drop-off 请求

- **`POST` `/v1/fbp/order/drop-off/cancel`** — 取消 drop-off 交货
- **`POST` `/v1/fbp/order/drop-off/dlv/edit`** — 编辑收货点的送货信息
- **`POST` `/v1/fbp/order/drop-off/timetable`** — 获取接收点的营业时间表

### 卖家账户信息

- **`POST` `/v1/seller/info`** — 卖家个人中心信息
- **`POST` `/v1/seller/ozon-logistics/info`** — Ozon配送开通信息

### 商品条形码列表

- **`POST` `/v1/barcode/add`** — 为商品绑定条形码
- **`POST` `/v1/barcode/generate`** — 创建商品条形码

### 多边形

- **`POST` `/v1/polygon/create`** — 创建一个快递的设施
- **`POST` `/v1/polygon/bind`** — 将快递方式与快递设施联系起来

### FBS/rFBS标志代码和订单备货管理

- **`POST` `/v4/posting/fbs/ship`** — 搜集订单 (第4方案)
- **`POST` `/v4/posting/fbs/ship/package`** — 货件的部分装配 (第4方案)

### 卖家评级

- **`POST` `/v1/rating/index/fbs/info`** — 获取错误指数：FBS 和 rFBS
- **`POST` `/v1/rating/index/fbs/posting/list`** — 影响错误指数的货件列表：FBS 和 rFBS

### 处理 FBP pick-up 请求

- **`POST` `/v1/fbp/order/pick-up/cancel`** — 取消上门揽收交货
- **`POST` `/v1/fbp/order/pick-up/dlv/edit`** — 更改取货地点信息

### API密钥相关信息

- **`POST` `/v1/roles`** — 使用API密钥获取角色和方式列表

### FBO

- **`POST` `/v1/supply-order/bundle`** — 交货或交货申请的商品组成

### FBO和FBS商品退货

- **`POST` `/v1/returns/list`** — FBO和FBS退货信息


---

## 6. 核心业务流程

### 6.1 商品上架完整流程

```
1. GET /v1/description-category/tree          → 获取类目树
2. POST /v1/description-category/attribute      → 获取类目属性
3. POST /v1/description-category/attribute/values → 获取属性可选值
4. POST /v3/product/import                    → 创建/更新商品（最多100件/次）
5. POST /v1/product/import/info               → 查询 task_id 处理状态
6. POST /v3/product/list                      → 获取商品列表（获取 offer_id + product_id）
7. POST /v1/product/pictures/import           → 上传商品图片
8. POST /v2/products/stocks                   → 更新库存
9. POST /v1/product/import/prices             → 更新价格
```

### 6.2 FBS 订单处理流程

```
1. POST /v4/posting/fbs/unfulfilled/list      → 获取未处理订单
2. POST /v3/posting/fbs/get                   → 获取订单详情
3. POST /v4/posting/fbs/ship                  → 订单备货/装配
4. POST /v2/posting/fbs/package-label         → 打印包裹标签
5. POST /v2/posting/fbs/awaiting-delivery     → 标记发货
6. POST /v2/fbs/posting/delivering            → 标记运输中（rFBS）
7. POST /v2/fbs/posting/delivered             → 标记已送达（rFBS）
```

### 6.3 参与 Ozon 促销活动流程

```
1. GET /v1/actions                            → 获取可用活动列表
2. POST /v1/actions/candidates                → 获取可参与活动的商品
3. POST /v1/actions/products/activate         → 将商品加入活动
4. POST /v1/actions/products                  → 查看已参与活动的商品
5. POST /v1/actions/products/deactivate       → 从活动中移除商品
```

### 6.4 定价策略设置流程

```
1. POST /v1/pricing-strategy/competitors/list  → 获取竞争对手列表
2. POST /v1/pricing-strategy/create           → 创建定价策略
3. POST /v1/pricing-strategy/products/add     → 添加商品到策略
4. POST /v1/pricing-strategy/status          → 启用/禁用策略
5. POST /v1/pricing-strategy/products/list    → 查看策略中的商品
```

### 6.5 退货处理流程（rFBS）

```
1. POST /v2/returns/rfbs/list                → 获取退货申请列表
2. POST /v2/returns/rfbs/get                 → 获取退货详情
3. POST /v2/returns/rfbs/verify             → 批准退货
4. POST /v2/returns/rfbs/reject              → 拒绝退货
5. POST /v2/returns/rfbs/compensate          → 部分退款
6. POST /v2/returns/rfbs/return-money        → 全额退款
```

---

## 7. 限流与错误处理

### 限流规则
- 每秒每个 Client ID 最多 **50** 个请求（所有接口合计）
- 频繁发送相同/错误请求可能导致 API 访问被限制

### 常见错误码
| 状态码 | 含义 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式和必填字段 |
| 401 | 认证失败 | 检查 Client-Id 和 Api-Key |
| 403 | 权限不足 | 检查 API 密钥的访问级别 |
| 404 | 接口不存在 | 检查 URL 路径 |
| 429 | 请求过于频繁 | 降低请求频率 |
| 500 | 服务器错误 | 稍后重试 |

---

## 8. 更新日志（2025-2026 精选）

| 日期 | 更新内容 |
|------|----------|
| 2026-06-11 | API 文档更新 |
| 2026-06-09 | 新增接口/功能更新 |
| 2026-05-28 | 功能优化 |
| 2026-05-16 | **重要**：仅支持后端调用，禁止浏览器直接请求 |
| 2026-04-30 | 新增 FBP 相关接口 |
| 2026-03-24 | 评价管理、问答管理接口更新 |
| 2026-02-26 | 财务报告接口增强 |
| 2026-01-29 | 卖家促销活动接口更新 |
| 2025-12-30 | 年末功能更新 |
| 2025-11-27 | 仓库管理接口优化 |
| 2025-10-28 | 定价策略功能增强 |
| 2025-09-29 | 订单处理流程优化 |
| 2025-08-27 | 新增退货管理接口 |
| 2025-07-30 | 库存管理功能更新 |
| 2025-06-25 | 商品上传接口增强 |

---

## 附录：关键 ID 说明

| ID 类型 | 说明 | 获取方式 |
|---------|------|----------|
| **Client-Id** | 卖家账户标识 | 个人中心 → 设置 → API 密钥页面 |
| **Api-Key** | 接口调用密钥 | 个人中心生成 |
| **offer_id** | 卖家系统商品编号 | `/v3/product/list` |
| **product_id** | Ozon 平台商品 ID | `/v3/product/list` |
| **sku** | 商品 SKU | 商品创建后自动生成 |
| **posting_number** | 订单/货件编号 | 订单相关接口 |
| **warehouse_id** | 仓库 ID | `/v2/warehouse/list` |
| **action_id** | 促销活动 ID | `/v1/actions` |

---

> 本文档基于 Ozon Seller API 官方中文文档整理，适用于 AI 模型快速检索和理解接口结构。  
> 详细参数定义请参考官方文档各接口的 Console 调试页面。
