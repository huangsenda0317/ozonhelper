# 实现计划: [FEATURE]

**分支**: `[###-feature-name]` | **日期**: [DATE] | **规格**: [链接]
**输入**: 来自 `/specs/[###-feature-name]/spec.md` 的功能规格说明书

**注意**: 此模板由 `/speckit-plan` 命令填充。执行工作流详见 `.specify/templates/plan-template.md`。

## 概述

[从功能规格中提取: 主要需求 + 研究得出的技术方案]

## 技术上下文

<!--
  需要操作: 将本节内容替换为项目的具体技术细节。
  以下结构仅作为参考，用于指导迭代过程。
-->

**语言/版本**: [例如，Python 3.11、Swift 5.9、Rust 1.75 或 需要澄清]  
**主要依赖**: [例如，FastAPI、UIKit、LLVM 或 需要澄清]  
**存储方案**: [如适用，例如，PostgreSQL、CoreData、文件 或 不适用]  
**测试框架**: [例如，pytest、XCTest、cargo test 或 需要澄清]  
**目标平台**: [例如，Linux 服务器、iOS 15+、WASM 或 需要澄清]
**项目类型**: [例如，库/CLI/Web 服务/移动应用/编译器/桌面应用 或 需要澄清]  
**性能目标**: [按领域定义，例如，1000 req/s、10k 行/秒、60 fps 或 需要澄清]  
**约束条件**: [按领域定义，例如，<200ms p95、<100MB 内存、离线可用 或 需要澄清]  
**规模/范围**: [按领域定义，例如，1 万用户、100 万行代码、50 个界面 或 需要澄清]

## 宪章检查

*门禁: 必须在第 0 阶段研究之前通过。第 1 阶段设计之后重新检查。*

[门禁内容根据宪章文件确定]

## 项目结构

### 文档（本功能）

```text
specs/[###-feature]/
├── plan.md              # 本文件（/speckit-plan 命令输出）
├── research.md          # 第 0 阶段输出（/speckit-plan 命令）
├── data-model.md        # 第 1 阶段输出（/speckit-plan 命令）
├── quickstart.md        # 第 1 阶段输出（/speckit-plan 命令）
├── contracts/           # 第 1 阶段输出（/speckit-plan 命令）
└── tasks.md             # 第 2 阶段输出（/speckit-tasks 命令 - 不由 /speckit-plan 创建）
```

### 源代码（仓库根目录）
<!--
  需要操作: 将下方的占位符目录树替换为本功能的具体布局。
  删除未使用的选项，并将选定结构扩展为实际路径
  （例如，apps/admin、packages/something）。最终交付的计划不得包含选项标签。
-->

```text
# [如未使用请删除] 选项 1: 单项目（默认）
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [如未使用请删除] 选项 2: Web 应用（检测到 "前端" + "后端" 时使用）
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [如未使用请删除] 选项 3: 移动端 + API（检测到 "iOS/Android" 时使用）
api/
└── [同上 backend 结构]

ios/ 或 android/
└── [平台特定结构: 功能模块、UI 流程、平台测试]
```

**结构决策**: [记录选定的结构，并引用上面列出的实际目录]

## 复杂度追踪

> **仅在宪章检查有违规需要论证时才填写**

| 违规项 | 为什么需要 | 被拒绝的更简单替代方案及原因 |
|--------|-----------|---------------------------|
| [例如，第 4 个项目] | [当前需求] | [为什么 3 个项目不够] |
| [例如，仓储模式] | [具体问题] | [为什么直接访问数据库不够] |
