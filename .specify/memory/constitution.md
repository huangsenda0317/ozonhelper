<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0 (MINOR: 新增中文语言约束，模板全部翻译为中文)
Modified principles: None
Added sections:
  - 技术约束: 新增「中文优先」条目
Removed sections: None
Templates requiring updates:
  - .specify/templates/spec-template.md ✅ 已翻译为中文
  - .specify/templates/plan-template.md ✅ 已翻译为中文
  - .specify/templates/tasks-template.md ✅ 已翻译为中文
  - .specify/templates/checklist-template.md ✅ 已翻译为中文
Follow-up TODOs: None
-->

# Ozonhelper Constitution

## Core Principles

### I. 数据抓取可靠性 (Scraping Reliability)

所有 Ozon 平台数据获取 MUST 基于 Scrapling (https://github.com/D4Vinci/Scrapling) 实现。
抓取层 MUST 具备以下能力：

- **反检测机制**: MUST 使用 Scrapling 的内置反检测能力，确保请求不被 Ozon 平台屏蔽
- **速率限制**: 所有抓取请求 MUST 遵守合理的速率控制，避免对目标平台造成压力
- **优雅降级**: 当抓取失败时 MUST 返回明确的错误信息，而非静默失败；支持自动重试（指数退避）
- **数据验证**: 抓取结果 MUST 经过结构校验后再传递给下游模块

**理由**: 数据抓取是整个系统的基础设施，其可靠性直接决定所有上游功能是否可用。如果
抓取层不可靠，系统将无法完成跟卖流程中的任何环节。

### II. 模块化独立架构 (Modular Independent Architecture)

系统 MUST 按功能领域拆分为独立模块，每个模块 MUST 满足：

- **自包含**: 每个模块职责单一，可独立理解、测试和部署
- **高内聚低耦合**: 模块间通过明确定义的接口通信，禁止循环依赖
- **可替换**: 任一模块可在不重写其他模块的情况下被替换（例如更换货源平台）
- **独立测试**: 每个模块 MUST 有独立的单元测试和集成测试

核心模块划分：

| 模块 | 职责 |
|------|------|
| `scraper` | Ozon 平台数据抓取（基于 Scrapling） |
| `sourcer` | 1688 及其他货源平台商品匹配 |
| `calculator` | 利润计算与定价策略 |
| `lister` | 商品上架到 Ozon 平台 |
| `scheduler` | 定时任务调度与自动搜索 |
| `ai` | AI 增强功能（热卖分析、智能匹配） |

**理由**: 跟卖流程涉及多个独立环节（搜索→找货源→算利润→上架），模块化设计允许
用户灵活组合使用，也便于后续扩展新的货源平台或销售渠道。

### III. 安全与合规第一 (Security & Compliance First)

安全是不可协商的底线。以下规则 MUST 在所有代码变更中得到遵守：

- **凭证管理**: 所有 API 密钥、Token、密码 MUST 存储在环境变量或安全配置文件中，禁止硬编码在源码中
- **抓取合规**: 抓取行为 MUST 遵守目标平台的 robots.txt 和使用条款；MUST 设置合理的请求间隔
- **输入验证**: 所有用户输入和外部数据 MUST 在进入系统边界时验证
- **错误信息安全**: 错误信息 MUST NOT 泄露敏感数据（如凭证、内部路径）
- **数据保护**: 用户配置和操作记录 MUST 安全存储，不得明文暴露敏感信息

**理由**: 抓取工具涉及多平台账号和交易操作，安全漏洞可能导致账号封禁、资金损失或
法律风险。安全必须在系统设计的每一层得到保障。

### IV. AI 增强可选 (AI-Augmented, Always Optional)

AI 功能用于增强用户体验，但 MUST NOT 成为阻塞性依赖：

- **可回退**: 任何 AI 驱动的决策（热卖判断、货源匹配建议）MUST 允许用户手动覆盖或完全跳过 AI 环节
- **透明性**: AI 推荐结果 MUST 附带依据说明，用户可以理解推荐逻辑
- **离线可用**: 核心跟卖流程（搜索→找货源→算利润→上架）在无 AI 模块的情况下 MUST 仍然可完整运行
- **成本可控**: AI 调用 MUST 有明确的使用量统计和成本提示

**理由**: AI 是锦上添花而非雪中送炭。用户可能在无网络、预算有限或对 AI 结果不信任
的情况下使用系统，核心业务流程不能依赖 AI 才能运转。

### V. 任务可观测性 (Task Observability)

所有自动化和定时任务 MUST 具备完整的可观测性：

- **结构化日志**: 所有模块 MUST 使用结构化日志（JSON 格式），包含时间戳、模块名、操作、结果、耗时
- **状态追踪**: 定时任务（自动搜索、自动上架）MUST 记录每次执行的状态（成功/失败/部分成功）
- **告警通知**: 连续失败或异常状态 MUST 触发用户通知
- **调试友好**: 日志 MUST 包含足够的上下文信息用于问题排查

**理由**: 系统包含定时自动执行的抓取和上架操作。如果这些任务在后台静默失败，
用户可能错失商机。完整的可观测性是自动化系统可信赖的前提。

## 技术约束

- **语言**: Python 3.11+（与 Scrapling 生态一致）
- **异步 I/O**: 所有 I/O 密集型操作（网络请求、文件操作）MUST 使用 `asyncio` 实现
- **类型注解**: 所有公共函数和方法 MUST 包含完整的类型注解
- **依赖管理**: 使用 `pyproject.toml` 管理项目依赖，锁定版本范围
- **配置管理**: 使用环境变量 + `.env` 文件管理配置，不允许硬编码环境差异
- **目标平台**: macOS/Linux 桌面环境（CLI 优先，后续可扩展 Web UI）
- **中文优先**: 所有文档、注释、规格说明书、任务列表、检查清单、提交信息和代码生成产物 MUST 使用简体中文输出。模板文件（`.specify/templates/` 下的所有文件）MUST 以中文编写

## 开发工作流

- **测试驱动开发 (TDD)**: 新功能 MUST 先写测试（RED → GREEN → REFACTOR），测试覆盖率目标 ≥ 80%
- **代码审查**: 每次提交前 MUST 自我审查代码，参考 `.claude/rules/common/code-review.md` 中的检查清单
- **分支策略**: 功能开发使用 feature 分支，命名格式 `###-feature-name`
- **提交规范**: 遵循 Conventional Commits（`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`）
- **文件规模**: 单个文件不超过 800 行，单个函数不超过 50 行
- **不可变性**: 优先使用不可变数据模式，禁止直接修改传入参数

## Governance

本宪章是本项目的最高指导文件，所有设计决策、代码审查和 PR 合并 MUST 以本宪章的
原则为准。

- **修订流程**: 宪章的修改 MUST 通过文档记录、版本号更新和 Sync Impact Report
- **版本策略**: 遵循语义化版本（MAJOR.MINOR.PATCH）
  - MAJOR: 原则删除或不兼容的重新定义
  - MINOR: 新增原则或章节
  - PATCH: 措辞澄清、拼写修正
- **合规审查**: 每个功能开发阶段（specify → plan → implement）MUST 通过
  Constitution Check 门禁，验证设计是否符合宪章原则
- **复杂度论证**: 任何违反宪章原则的设计决策 MUST 在 `plan.md` 的
  Complexity Tracking 表格中明确记录并论证必要性
- **运行时指导**: 开发过程中遇到未覆盖的决策场景时，优先以本宪章中声明
  的原则精神为指导，并在事后考虑修订宪章

**Version**: 1.1.0 | **Ratified**: 2026-06-11 | **Last Amended**: 2026-06-11
