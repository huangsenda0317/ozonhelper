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
