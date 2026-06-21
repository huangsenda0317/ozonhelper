/** 更新日志数据 — 按日期分组，最新在上 */

export type ChangelogTag = "新功能" | "改进" | "修复" | "其他";

export interface ChangelogItem {
  title: string;
  description?: string;
  tag: ChangelogTag;
}

export interface ChangelogDay {
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  items: ChangelogItem[];
}

/** 展示用日期，如「2026 年 6 月 16 日 · 星期一」 */
export function formatChangelogDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y} 年 ${m} 月 ${day} 日 · ${weekdays[d.getDay()]}`;
}

export const CHANGELOG: ChangelogDay[] = [
  {
    date: "2026-06-21",
    items: [
      {
        tag: "新功能",
        title: "店铺订单回溯天数",
        description:
          "店铺管理支持按店选择 7 / 14 / 30 天订单回溯（默认 30 天）；切换前确认弹层，确认后清空本地订单并立即触发订单重同步。",
      },
      {
        tag: "改进",
        title: "商品中心价格展示",
        description:
          "列表与详情仅展示 Ozon 卖家结算价（跨境店多为 CNY），移除不可靠的前台卢布换算列，并补充价格口径说明；商品/销售状态改为中文展示，详情返回链接回到商品 Tab。",
      },
      {
        tag: "改进",
        title: "财务对账指标口径",
        description:
          "区分「财务入账笔数」「实际送达订单」「同期入库订单」；修复 posting_number / posting_order_date 解析与 stale 元数据自动回填，使实际送达订单统计可用。",
      },
      {
        tag: "改进",
        title: "ERP 金额与状态展示",
        description:
          "看板、价格中心、订单等模块金额统一卢布格式化；新增 product-status 映射；筛选面板销售状态下拉中文化。",
      },
      {
        tag: "新功能",
        title: "店铺绑定后同步进度",
        description:
          "绑定 Ozon 店铺后展示同步进度与完成提示；跨 Tab 通过 store-sync-tracker / sync-session 跟踪正在同步的店铺，看板与订单页自动刷新。",
      },
      {
        tag: "改进",
        title: "CNY/RUB 市场汇率服务",
        description:
          "后端接入 fawazahmed0/currency-api 公共接口获取 CNY→RUB 汇率（Redis 缓存 24h），GET /api/v1/exchange-rate 返回真实数据；商品前台卢布价已从 UI 移除。",
      },
      {
        tag: "修复",
        title: "物流预警检测与阈值生效",
        description:
          "按订单 status 与 created_at/shipped_at 计算超时，修复 packed_at、last_tracking_at 被批量同步污染导致列表始终为空；调高阈值后自动关闭不再符合条件的记录；打开列表/保存配置时即时本地检测。",
      },
      {
        tag: "修复",
        title: "保存物流预警配置超时",
        description: "保存阈值时不再串行调用 Ozon 轨迹 API（原约 30s 易 500），改为仅本地重算；保存成功后自动刷新预警列表。",
      },
      {
        tag: "修复",
        title: "AI 问答日期回答错误",
        description:
          "system prompt 注入服务器当前时间（北京时间 + Ozon 莫斯科业务日），避免模型凭训练数据猜测「今天几号」。",
      },
      {
        tag: "改进",
        title: "移动端顶部导航",
        description:
          "屏幕宽度小于 1024px 时，Header 左侧 Logo 替换为菜单按钮；点击从侧边滑出导航栏，支持遮罩/关闭按钮/Esc 关闭与路由切换自动收起。",
      },
      {
        tag: "改进",
        title: "订单与退货状态中文展示",
        description: "订单列表与退货列表的状态字段改为中文可读文案，超时订单仍保留醒目标记。",
      },
      {
        tag: "改进",
        title: "Ant Design 6 弃用 API 适配",
        description: "Select 下拉改用 classNames.popup.root；Modal 遮罩关闭改用 mask.closable，消除控制台 deprecation 警告。",
      },
      {
        tag: "改进",
        title: "订单同步加速与看板双模式同步",
        description:
          "首 sync 默认回溯 7 天（ORDER_SYNC_INITIAL_DAYS 可配置）；增量 FBS 仅拉活跃履约状态；看板拆分为「快速同步」（商品/库存/趋势）与「含订单同步」全量。",
      },
      {
        tag: "修复",
        title: "删除店铺外键约束失败",
        description:
          "补全 price_snapshots、profit_configs、finance_transactions 等 phase2 子表及 listing_items 的级联删除，修复删除店铺时 500 错误。",
      },
      {
        tag: "修复",
        title: "生产环境销售趋势与转化率不同步",
        description:
          "Analytics 同步改用莫斯科时区计算 date_to，修复东八区凌晨 date_to 超前于 Ozon 当前日导致 API 400、analytics_daily 为空的问题；看板 KPI 与趋势查询日期边界一并对齐。",
      },
    ],
  },
  {
    date: "2026-06-20",
    items: [
      {
        tag: "新功能",
        title: "短信验证码登录",
        description:
          "登录页新增「短信登录」Tab，接入阿里云号码认证服务；支持验证码发送/核验、手机号首次登录自动注册，与密码登录并存。",
      },
      {
        tag: "改进",
        title: "物流预警阈值配置",
        description:
          "物流预警页阈值设置改为弹窗编辑，启用开关与天数输入适配深色模式。",
      },
      {
        tag: "改进",
        title: "深色模式交互样式",
        description:
          "统一导航与 Tab 的 hover/选中色，新增 interactive-muted 与 switch-sentry 组件，修复 ink-deep 在深色背景下不可见的问题。",
      },
      {
        tag: "修复",
        title: "订单同步为空",
        description:
          "修复商品同步提前更新 last_sync_at 导致订单时间窗口为零、以及 Ozon 价格字段解析崩溃；空库时自动回溯 30 天订单。",
      },
    ],
  },
  {
    date: "2026-06-18",
    items: [
      {
        tag: "新功能",
        title: "价格中心",
        description:
          "新增价格页：批量改价、成本定价模型（采购/物流/平台费率）、汇率配置与低价/高价异常检测；侧边栏 ERP 导航同步扩展。",
      },
      {
        tag: "新功能",
        title: "新品刊登",
        description:
          "支持 Excel 导入 SKU 素材并提交 Ozon 批量刊登；刊登任务队列、审核状态轮询与异常标记，工作台位于 /tracking/listing。",
      },
      {
        tag: "新功能",
        title: "财务对账",
        description:
          "同步 Ozon 交易流水并汇总回款、手续费、退款与净结算；看板扩展月度财务 KPI；支持 Excel 导出。",
      },
      {
        tag: "新功能",
        title: "物流节点预警",
        description:
          "可配置待打包/待揽收/运输停滞等节点阈值；定时检测生成预警台账，支持未处理/已处理/忽略闭环，页面位于 /tracking/logistics-alerts。",
      },
      {
        tag: "改进",
        title: "预警中心与订单履约",
        description:
          "预警 Hub 聚合低库存、订单超时、物流、差评与价格异常；订单页扩展 FBS 发货、运单回传、批量导出/备注及售后退货列表。",
      },
      {
        tag: "改进",
        title: "销售趋势 Tooltip",
        description: "经营看板图表悬停提示精简为日期、销量与营收，移除不可靠的订单数展示。",
      },
    ],
  },
  {
    date: "2026-06-17",
    items: [
      {
        tag: "改进",
        title: "AI 问答思考过程体验",
        description:
          "处理过程区限制最大高度并可滚动；工具调用默认折叠详情；SSE 完成后自动收起思考过程；优化布局防跳动并移除边框。",
      },
      {
        tag: "改进",
        title: "AI 问答工具调用优化",
        description:
          "同一会话内相同工具参数去重缓存，避免重复请求 Ozon；ozon_api_call 与语义化工具对齐；提升工具轮次上限，触顶后基于已有结果生成总结。",
      },
      {
        tag: "修复",
        title: "AI 问答 SSE 流式响应",
        description:
          "修复回答内容一次性返回的问题：后端改用纯 ASGI 日志中间件；前端增加 SSE 流式代理 Route，避免 Next.js rewrite 缓冲。",
      },
      {
        tag: "新功能",
        title: "更新日志页面",
        description:
          "Header 用户菜单新增「更新日志」入口，按日期倒序展示产品迭代记录。",
      },
      {
        tag: "改进",
        title: "店铺管理与导航",
        description:
          "店铺绑定弹窗与全局店铺选择器；用户菜单支持店铺管理与登出跳转首页；删除店铺后立即刷新列表。",
      },
    ],
  },
  {
    date: "2026-06-16",
    items: [
      {
        tag: "新功能",
        title: "AI 店铺问答",
        description:
          "新增 AI 问答页，基于 DeepSeek 流式对话；支持查询当前店铺 Ozon 订单、库存与卖家数据，展示思考过程与工具调用详情。",
      },
      {
        tag: "新功能",
        title: "销售趋势图表",
        description:
          "经营看板销售趋势改用 ECharts，支持折线/柱图切换，以及销量与营收维度切换。",
      },
      {
        tag: "新功能",
        title: "多店铺 ERP 同步",
        description:
          "支持多店铺 Ozon 凭证绑定；自动同步商品、库存与订单；经营看板汇总展示；低库存与订单超时预警。",
      },
      {
        tag: "改进",
        title: "店铺绑定与管理",
        description:
          "移除环境变量默认店铺引导，凭证统一在设置页绑定；删除店铺时级联清理同步数据；全局店铺选择器与导航优化。",
      },
      {
        tag: "修复",
        title: "生产构建稳定性",
        description:
          "修复前端生产构建 SWC 版本不匹配、lockfile 依赖安装失败及 OOM SIGKILL 问题。",
      },
      {
        tag: "修复",
        title: "凭证加密与调度",
        description: "修复 ENCRYPTION_KEY 配置问题；完善 Celery Beat 本地调度状态忽略规则。",
      },
    ],
  },
  {
    date: "2026-06-15",
    items: [
      {
        tag: "新功能",
        title: "Ozon Seller API MCP",
        description:
          "集成 Ozon 卖家 API MCP 服务，覆盖目录、库存、订单等只读工具，便于 AI 与 IDE 调用 Ozon 接口。",
      },
      {
        tag: "改进",
        title: "UI/UX 设计规范",
        description: "引入 UI 设计技能库，统一 Apple Design 风格组件与页面布局规范。",
      },
      {
        tag: "其他",
        title: "部署与启动脚本",
        description: "完善生产环境启动脚本与服务编排配置。",
      },
    ],
  },
  {
    date: "2026-06-13",
    items: [
      {
        tag: "新功能",
        title: "店铺跟踪 ERP",
        description:
          "上线店铺跟踪模块：商品列表与详情、库存快照、订单列表、预警中心及同步任务调度。",
      },
      {
        tag: "新功能",
        title: "Ozon 跟卖全链路平台",
        description:
          "完成榜单发现、选品池、1688 比价、AI 改图/翻译、批量上架等核心模块的首版实现。",
      },
    ],
  },
];
