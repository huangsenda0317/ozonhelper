# 任务列表: Ozon 跟卖全链路平台

**输入**: 来自 `/specs/001-ozon-follow-sell/` 的设计文档
**前置条件**: plan.md（必需）、spec.md（7 个用户故事）、data-model.md（12 张表）、contracts/api-v1.yaml.md（11 个 API 模块）、research.md（11 项技术决策）

**组织方式**: 任务按用户故事分组，每个故事可独立实现和测试。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖关系）
- **[Story]**: 该任务所属的用户故事（例如，US1、US2、US3）
- 描述中包含具体的文件路径

## 路径约定

- **后端**: `backend/src/`、`backend/tests/`
- **前端**: `frontend/src/app/`、`frontend/src/components/`
- **浏览器插件**: `browser-extension/src/`

---

## 阶段 1: 环境搭建（共享基础设施）

**目的**: 项目初始化、依赖安装、开发环境配置

- [x] T001 按 plan.md 创建完整项目目录结构（`backend/`、`frontend/`、`browser-extension/`）
- [x] T002 [P] 初始化 Python 项目，配置 `backend/pyproject.toml` 含 FastAPI、SQLAlchemy 2.0、Scrapling、Celery、pytest、tencentcloud-sdk-python、Pillow 依赖
- [x] T003 [P] 初始化 Next.js 项目，配置 `frontend/package.json` 含 React 18+、Tailwind CSS、TypeScript
- [x] T004 [P] 初始化浏览器插件项目，配置 `browser-extension/manifest.json` (Manifest V3) 和 `browser-extension/package.json`
- [x] T005 [P] 配置后端代码检查工具 `backend/pyproject.toml`（ruff、mypy）
- [x] T006 [P] 配置前端代码检查工具 `frontend/.eslintrc.json` 和 `frontend/tsconfig.json`
- [x] T007 创建 `backend/.env.example` 和 `frontend/.env.example` 环境变量模板（含 VOLCENGINE_*、TENCENT_*、MINIO_*）
- [x] T008 创建 `docker-compose.yml` 含 PostgreSQL 15、Redis 7、MinIO 服务定义

---

## 阶段 2: 基础设施（阻塞性前置条件）

**目的**: 所有用户故事依赖的核心基础设施

**⚠️ 关键**: 在此阶段完成之前，不得开始任何用户故事的工作

### 数据库与配置

- [ ] T009 在 `backend/src/config.py` 中实现配置管理（环境变量加载、Pydantic Settings，含 DATABASE_URL、REDIS_URL、JWT_SECRET_KEY、VOLCENGINE_ACCESS_KEY_ID、VOLCENGINE_SECRET_ACCESS_KEY、VOLCENGINE_REGION、VOLCENGINE_SERVICE、VOLCENGINE_SEEDEDIT_REQ_KEY、VOLCENGINE_SEEDEDIT_CONCURRENCY、TENCENT_SECRET_ID、TENCENT_SECRET_KEY、TENCENT_TMT_REGION、TENCENT_TMT_PROJECT_ID、MINIO_ENDPOINT、MINIO_ACCESS_KEY、MINIO_SECRET_KEY、MINIO_BUCKET、ENCRYPTION_KEY）
- [ ] T010 在 `backend/src/database.py` 中创建 SQLAlchemy 2.0 async engine + AsyncSession + Base 声明基类
- [ ] T011 [P] 配置 Alembic 迁移框架，创建 `backend/alembic/` 目录及初始迁移
- [ ] T012 [P] 在 `backend/src/main.py` 中创建 FastAPI 应用入口（CORS、生命周期、路由注册、异常处理器）

### 认证与安全

- [ ] T013 [P] 在 `backend/src/models/user.py` 中创建 User 数据库模型（id, email, password_hash, name, profit_threshold, is_active, created_at, updated_at）
- [ ] T014 [P] 在 `backend/src/models/api_key.py` 中创建 ApiKey 数据库模型（id, user_id FK, name, key_hash, key_prefix, is_active, last_used_at, created_at, revoked_at）
- [ ] T015 [P] 在 `backend/src/schemas/auth.py` 中创建认证相关 Pydantic schemas（RegisterRequest、LoginRequest、TokenResponse、ApiKeyCreateRequest、ApiKeyResponse）
- [ ] T016 在 `backend/src/auth/jwt.py` 中实现 JWT 工具（create_access_token、decode_token、get_current_user 依赖注入）
- [ ] T017 [P] 在 `backend/src/auth/api_key.py` 中实现 API 密钥认证（生成/验证 API Key、SHA-256 哈希、HMAC 签名校验）
- [ ] T018 [P] 在 `backend/src/auth/password.py` 中实现密码哈希工具（bcrypt 哈希/验证）
- [ ] T019 在 `backend/src/api/deps.py` 中实现认证依赖注入（get_current_user JWT 依赖、get_current_user_from_api_key Header 依赖）
- [ ] T020 在 `backend/src/api/auth.py` 中实现认证 API 端点（POST register、POST login、POST api-keys、GET api-keys、DELETE api-keys/{id}）
- [ ] T021 [P] 在 `backend/src/services/crypto.py` 中实现凭证加密/解密工具（Fernet 对称加密，用于 Ozon API Key、Store 凭证加密存储）

### API 框架与通用中间件

- [ ] T022 在 `backend/src/api/__init__.py` 中统一注册所有路由，挂载到 `/api/v1` 前缀
- [ ] T023 [P] 在 `backend/src/schemas/common.py` 中定义通用 API 响应模型（ApiResponse[T]、ApiError、PaginationMeta、PaginationParams）
- [ ] T024 [P] 在 `backend/src/api/exceptions.py` 中实现异常处理模块（AppException 基类、各业务异常子类）
- [ ] T025 在 `backend/src/api/error_handler.py` 中实现全局异常处理中间件（捕获所有异常，返回统一 ApiResponse 格式）
- [ ] T026 [P] 在 `backend/src/api/logging_middleware.py` 中实现请求日志中间件（结构化 JSON 日志、请求耗时记录）

### 任务队列基础设施

- [ ] T027 在 `backend/src/worker/app.py` 中创建 Celery 应用实例（Celery 初始化、Redis broker、任务路由、序列化配置）
- [ ] T028 [P] 在 `backend/src/cache.py` 中创建 Redis 缓存工具（Redis 连接管理、缓存装饰器、榜单数据缓存）

### 图片存储

- [ ] T029 在 `backend/src/storage.py` 中创建 MinIO/S3 存储客户端（初始化 MinIO client、上传图片、生成预签名 URL、从 URL 下载转存——用于 SeedEdit 24h 临时链接转存）

### 前端 Apple Design 基础

- [ ] T030 在 `frontend/tailwind.config.ts` 中集成 Apple Design Tokens（colors、fontSize、borderRadius、spacing、fontFamily），参考 `apple/DESIGN.md`
- [ ] T031 [P] 在 `frontend/src/styles/globals.css` 中注入 Apple Design CSS 变量和 SF Pro 字体加载
- [ ] T032 [P] 在 `frontend/src/lib/api-client.ts` 中创建后端 API 客户端（fetch 封装、JWT 自动注入、统一错误处理、通用响应解析）
- [ ] T033 [P] 在 `frontend/src/lib/auth-context.tsx` 中创建认证上下文（AuthProvider、useAuth hook、登录/登出/注册状态管理）
- [ ] T034 [P] 在 `frontend/src/components/ui/Button.tsx` 中创建 Apple 风格按钮组件（pill-shaped primary/secondary 变体）
- [ ] T035 [P] 在 `frontend/src/components/ui/Card.tsx` 中创建 Apple 风格卡片组件（light/dark tile 变体）
- [ ] T036 [P] 在 `frontend/src/components/ui/SearchInput.tsx` 中创建 Apple 风格搜索输入框组件
- [ ] T037 [P] 在 `frontend/src/components/ui/StatusBadge.tsx` 中创建状态标签组件（pending/running/success/failed 颜色映射）
- [ ] T038 在 `frontend/src/components/layout/GlobalNav.tsx` 中实现全局导航栏（`{colors.surface-black}` 黑色导航条，工具箱模式平级菜单）
- [ ] T039 [P] 在 `frontend/src/components/layout/SubNav.tsx` 中实现子导航栏（毛玻璃效果 + 模块切换）
- [ ] T040 在 `frontend/src/app/layout.tsx` 中组装 GlobalNav + SF Pro 字体 + 全局样式入口布局
- [ ] T041 [P] 在 `frontend/src/app/login/page.tsx` 中实现登录页面
- [ ] T042 [P] 在 `frontend/src/app/register/page.tsx` 中实现注册页面

**检查点**: 基础设施就绪——用户可注册登录、获取 JWT/API Key、前端 Shell 页面渲染。用户故事实现现在可以开始。

---

## 阶段 3: 用户故事 1 - 榜单发现：在 Ozon 排行榜中锁定潜力商品 (优先级: P1) 🎯 MVP

**目标**: 用户可浏览 Ozon 各品类排行榜（热销榜/飙升榜/新品榜），多维度筛选排序，将商品加入选品池

**独立测试**: 注册用户登录→进入榜单页面→选择类目和榜单类型→浏览排名→使用筛选→加入选品池→选品池中可查看和移除

### 用户故事 1 的实现 — 后端

- [ ] T043 [P] [US1] 在 `backend/src/models/ranked_product.py` 中创建 RankedProduct 数据库模型（ozon_product_id, title, category, price_rub, rating, review_count, sales_trend, rank_type, rank_position, image_url, cached_at）
- [ ] T044 [P] [US1] 在 `backend/src/models/selected_product.py` 中创建 SelectedProduct 数据库模型（user_id FK, ranked_product_id FK, note, added_at）
- [ ] T045 [US1] 运行 Alembic 迁移创建 RankedProduct 和 SelectedProduct 表
- [ ] T046 [P] [US1] 在 `backend/src/schemas/rankings.py` 中创建榜单相关 Pydantic schemas（RankingFilterParams、RankedProductResponse、SelectedProductRequest）
- [ ] T047 [US1] 在 `backend/src/services/rank_scraper/scraper.py` 中实现 Ozon 排行榜爬虫（Scrapling StealthyFetcher，自适应定位 adaptive=True，Cloudflare 绕过 solve_cloudflare=True，DNS over HTTPS，指数退避重试 base=1s max=30s）
- [ ] T048 [P] [US1] 在 `backend/src/services/rank_scraper/parser.py` 中实现榜单数据解析器（HTML → RankedProduct Pydantic 模型列表，自适应元素定位）
- [ ] T049 [US1] 在 `backend/src/services/rank_scraper/service.py` 中实现榜单服务（获取榜单按类目+类型筛选、Redis 缓存、数据源不可用时降级使用缓存数据并标注更新时间）
- [ ] T050 [US1] 在 `backend/src/api/rankings.py` 中实现榜单 API 端点（GET /api/v1/rankings 支持 category/rank_type/price_min/price_max/rating_min/sales_min/page/limit，GET /api/v1/rankings/categories）
- [ ] T051 [US1] 在 `backend/src/api/selection_pool.py` 中实现选品池 API 端点（POST 加入选品池、GET 列表+搜索、DELETE 单个移除、POST batch-delete 批量移除）
- [ ] T052 [US1] 在 `backend/src/worker/scraper_tasks.py` 中实现榜单定时同步 Celery 任务（sync_rankings 每日定时抓取各品类榜单数据写入数据库）

### 用户故事 1 的实现 — 前端

- [ ] T053 [P] [US1] 在 `frontend/src/components/features/ProductCard.tsx` 中创建榜单商品卡片组件（图片、标题、价格、评分、销量趋势标签、加入选品池按钮、已选标记）
- [ ] T054 [P] [US1] 在 `frontend/src/components/features/FilterPanel.tsx` 中创建筛选面板组件（价格区间、评分下限、销量下限可折叠筛选面板）
- [ ] T055 [US1] 在 `frontend/src/app/rankings/page.tsx` 中实现榜单发现页面（类目选择器、榜单类型 Tab 切换 hot/rising/new、筛选交互、商品列表、分页、加载/空/错误状态）
- [ ] T056 [US1] 在 `frontend/src/app/selection-pool/page.tsx` 中实现选品池独立页面（商品列表、搜索、批量选择、移除、跳转后续操作）
- [ ] T057 [US1] 在 `frontend/src/lib/hooks/useRankings.ts` 和 `frontend/src/lib/hooks/useSelectionPool.ts` 中创建榜单/选品池 API hooks

**检查点**: 用户可独立完成榜单浏览筛选→加入选品池→选品池管理的完整闭环，此即为 MVP。

---

## 阶段 4: 用户故事 2 - AI 改图：商品图片本地化处理 (优先级: P1) 🔥

**目标**: 用户通过火山引擎 SeedEdit 3.0 图生图模型对商品图片进行语义编辑（去水印/文案替换），Pillow 标准化尺寸至 Ozon 规范 1200×1200，支持对比预览和手动修正

**独立测试**: 选择已采集商品→点击「AI 改图」→系统提交 SeedEdit 异步任务→轮询获取结果→Pillow 尺寸标准化→原图/处理后对比预览→不满意可重处理（修改 prompt 重新提交）

### 用户故事 2 的实现 — 后端

- [ ] T058 [P] [US2] 在 `backend/src/models/processing_task.py` 中创建 ProcessingTask 数据库模型（collected_product_id FK, task_type, status, input_data JSONB, output_data JSONB, seededit_task_ids JSONB, seededit_status, error_message, error_code VARCHAR(30), retry_count, cost_amount DECIMAL(8,4), created_at, completed_at）
- [ ] T059 [P] [US2] 在 `backend/src/schemas/ai.py` 中创建 AI 改图/翻译请求/响应 Pydantic schemas（ImageEditRequest 含 prompt/seed/scale/image_ids，TranslateRequest 含 fields/source_lang/target_lang/untranslated_text，TaskProgressResponse，TaskListResponse）
- [ ] T060 [US2] 在 `backend/src/services/ai_processor/seededit.py` 中实现 SeedEdit 3.0 API 客户端（火山引擎 Signature V4 签名鉴权、CVSync2AsyncSubmitTask 提交异步任务、CVSync2AsyncGetResult 轮询获取结果 ≤2s 间隔、Region=cn-north-1、Service=cv、req_key=seededit_v3.0、输入校验 JPEG/PNG ≤5MB ≤4096×4096 长宽比≤3:1、24h 临时链接立即下载转存 MinIO）
- [ ] T061 [P] [US2] 在 `backend/src/services/ai_processor/image_resizer.py` 中实现图片尺寸标准化工具（Pillow 缩放/裁剪/白底填充至 1200×1200，精确满足 Ozon 平台规范）
- [ ] T062 [US2] 在 `backend/src/services/ai_processor/image_edit_service.py` 中实现 AI 改图编排服务（提交 SeedEdit → 轮询结果 in_queue→generating→done → 下载图片转存 MinIO → Pillow 标准化 → 更新 ProcessingTask，错误码 50429/50430 指数退避重试 ≤3次，50411/50412/50413 提示用户调整输入）
- [ ] T063 [US2] 在 `backend/src/worker/ai_tasks.py` 中实现 AI 改图 Celery 任务（process_image_edit_task: 提交→轮询→转存→标准化→完成流水线，超时 3min/张，批量排队处理 SeedEdit 默认并发 2）
- [ ] T064 [US2] 在 `backend/src/api/ai_endpoints.py` 中实现 AI 改图 API 端点（POST /api/v1/ai/image-edit 提交改图任务返回 202，GET /api/v1/ai/tasks/{id}/progress 查询 SeedEdit 进度 seededit_status + items_completed，POST /api/v1/ai/image-edit/{id}/retry 修改 prompt 重新提交，PUT /api/v1/ai/tasks/{id}/output 手动覆盖输出）

### 用户故事 2 的实现 — 前端

- [ ] T065 [US2] 在 `frontend/src/app/ai-edit/page.tsx` 中实现 AI 改图页面（商品选择、改图任务列表、SeedEdit 状态轮询 pending→running→in_queue→generating→done、对比预览入口、批量操作）
- [ ] T066 [P] [US2] 在 `frontend/src/components/features/PromptEditor.tsx` 中创建提示词编辑器组件（SeedEdit 提示词输入框 ≤120 字符推荐最长 800、seed 随机种子滑块默认 -1、scale 编辑强度滑块 0-1 默认 0.5、预设提示词模板如"去除图片中的所有中文水印和文字"）
- [ ] T067 [P] [US2] 在 `frontend/src/components/features/ImageCompare.tsx` 中创建图片对比预览组件（原图 vs 处理后并排展示、放大查看细节、单张重处理按钮、手动微调入口）
- [ ] T068 [US2] 在 `frontend/src/lib/hooks/useImageEdit.ts` 中创建 AI 改图 API hooks（提交任务、轮询进度、获取结果、重试/覆盖）

**检查点**: 用户可独立完成图片本地化处理全流程（SeedEdit 语义编辑 + Pillow 标准化），改图模块可脱离其他模块独立使用。

---

## 阶段 5: 用户故事 3 - 一键采集：通过浏览器插件抓取商品全字段与图视频 (优先级: P2)

**目标**: 用户可通过浏览器插件在 Ozon 商品详情页一键采集完整商品信息，自动同步到平台

**独立测试**: 安装插件→打开 Ozon 商品页→点击采集→查看已采集商品列表→手动添加/编辑商品→去重检测

### 用户故事 3 的实现 — 后端

- [ ] T069 [US3] 在 `backend/src/models/collected_product.py` 中创建 CollectedProduct 数据库模型（user_id FK, ozon_product_id, source_url, title, title_zh, title_ru, description, description_ru, price_rub, attributes JSONB, variants JSONB, images JSONB, video_urls JSONB, category_path, is_manual, collected_at，唯一约束 (user_id, ozon_product_id)）
- [ ] T070 [US3] 运行 Alembic 迁移创建 CollectedProduct 表
- [ ] T071 [P] [US3] 在 `backend/src/schemas/products.py` 中创建商品采集 Pydantic schemas（CollectedProductCreate、CollectedProductResponse、DuplicateCheckResponse）
- [ ] T072 [US3] 在 `backend/src/services/collector/service.py` 中实现商品采集服务（接收插件上传数据 Pydantic 校验、去重检测基于 (user_id, ozon_product_id) 联合唯一约束、存储到 CollectedProduct、覆盖更新逻辑）
- [ ] T073 [US3] 在 `backend/src/api/products.py` 中实现商品管理 API 端点（POST /api/v1/products 创建采集商品支持 JWT + X-API-Key 两种认证，GET 列表+搜索+排序+去重标记，GET /{id} 详情，DELETE /{id} 删除，GET /{id}/check-duplicate 去重检测）

### 用户故事 3 的实现 — 浏览器插件

- [ ] T074 [US3] 在 `browser-extension/src/content/extractor.ts` 中实现 Ozon 商品页面 DOM 提取脚本（标题、价格当前+原价、评分、描述、属性表格、SKU 变体颜色/尺寸/选项、主图 URL 列表、详情图 URL 列表、视频链接、类目路径）
- [ ] T075 [P] [US3] 在 `browser-extension/src/background/api.ts` 中实现 API 通信模块（API 密钥 HMAC 签名、POST 请求到平台、重试逻辑、错误处理）
- [ ] T076 [P] [US3] 在 `browser-extension/src/popup/popup.ts` 中实现插件弹窗 UI（采集按钮、采集状态展示 animated、设置入口、API 密钥配置输入框）
- [ ] T077 [US3] 创建插件构建配置 `browser-extension/webpack.config.js` 或 `browser-extension/vite.config.ts`

### 用户故事 3 的实现 — 前端

- [ ] T078 [US3] 在 `frontend/src/app/products/page.tsx` 中实现已采集商品管理页面（列表展示、搜索、排序 collected_at/price_rub、筛选 has_image、去重提示、删除确认、跳转比价/AI 处理操作）
- [ ] T079 [P] [US3] 在 `frontend/src/app/products/[id]/page.tsx` 中实现商品详情页（完整字段展示、图片预览画廊、视频链接、属性表格）
- [ ] T080 [P] [US3] 在 `frontend/src/components/features/ManualProductForm.tsx` 中创建手动添加商品表单组件（手动录入降级方案，所有字段可编辑、图片 URL 输入）
- [ ] T081 [US3] 在 `frontend/src/lib/hooks/useProducts.ts` 中创建采集商品 API hooks

**检查点**: 插件可采集 Ozon 商品→数据同步到平台→列表中可查看管理。手动添加作为降级入口。

---

## 阶段 6: 用户故事 4 - 1688 比价：找货源并计算毛利 (优先级: P3)

**目标**: 针对已采集商品在 1688 搜索同款/相似货源，展示供应商报价，自动计算预估毛利率，标记高潜力商品

**独立测试**: 选择已采集商品→点击「1688 比价」→查看货源列表→选择货源→查看利润计算→调整参数实时重算→高潜力标记

### 用户故事 4 的实现 — 后端

- [ ] T082 [P] [US4] 在 `backend/src/models/supply_source.py` 中创建 SupplySource 数据库模型（collected_product_id FK, title, price_cny, min_order, supplier_name, supplier_url, image_url, similarity_score, searched_at）
- [ ] T083 [P] [US4] 在 `backend/src/models/profit_calculation.py` 中创建 ProfitCalculation 数据库模型（collected_product_id FK, supply_source_id FK, ozon_price_cny, supply_cost_cny, logistics_cost_cny, commission_rate, exchange_rate, gross_margin, calculated_at）
- [ ] T084 [US4] 运行 Alembic 迁移创建 SupplySource 和 ProfitCalculation 表
- [ ] T085 [P] [US4] 在 `backend/src/schemas/sourcing.py` 中创建比价相关 Pydantic schemas（SupplySourceResponse、ProfitCalculationRequest、ProfitCalculationResponse）
- [ ] T086 [US4] 在 `backend/src/services/sourcer/scraper.py` 中实现 1688 货源搜索服务（Scrapling StealthyFetcher，关键词搜索基于商品标题关键卖点词 + 以图搜图基于商品主图，结果融合去重，按相似度排序）
- [ ] T087 [P] [US4] 在 `backend/src/services/calculator/service.py` 中实现利润计算引擎（公式: 毛利率 = (ozon_price_cny - supply_cost - logistics - commission) / ozon_price_cny × 100%，高潜力阈值判断默认 ≥25%）
- [ ] T088 [P] [US4] 在 `backend/src/services/calculator/exchange_rate.py` 中实现汇率获取服务（调用 exchangerate-api.com 每日更新 RUB/CNY 汇率，Redis 缓存 key 含日期）
- [ ] T089 [US4] 在 `backend/src/api/sourcing.py` 中实现 1688 比价 API 端点（POST /api/v1/sourcing/search 发起搜索返回 202 + task_id，GET /api/v1/sourcing/results/{collected_product_id} 获取匹配结果，POST /api/v1/sourcing/calculate-profit 利润计算，GET /api/v1/sourcing/profit-history/{collected_product_id} 利润历史）
- [ ] T090 [US4] 在 `backend/src/api/exchange_rate.py` 中实现汇率 API 端点（GET /api/v1/exchange-rate 当前 RUB/CNY 汇率含 updated_at）
- [ ] T091 [US4] 在 `backend/src/worker/scraper_tasks.py` 中实现 1688 搜索 Celery 任务（search_supply_sources: 执行搜索→结果融合去重→写入 SupplySource，超时 30s，重试 2 次）

### 用户故事 4 的实现 — 前端

- [ ] T092 [US4] 在 `frontend/src/app/sourcing/page.tsx` 中实现 1688 比价页面（选择商品→触发搜索→查看货源列表→选择货源→查看利润→调整参数实时重算→高潜力标记）
- [ ] T093 [P] [US4] 在 `frontend/src/components/features/ProfitCalculator.tsx` 中创建利润计算器组件（输入: Ozon售价/进价/物流成本/佣金率/汇率可调，实时计算毛利率，可视化盈亏线，高潜力标签）
- [ ] T094 [P] [US4] 在 `frontend/src/components/features/SupplySourceList.tsx` 中创建货源列表组件（供应商名称、价格、起批量、相似度标签百分比、选择按钮、1688 链接跳转）
- [ ] T095 [US4] 在 `frontend/src/lib/hooks/useSourcing.ts` 中创建 1688 比价 API hooks

**检查点**: 用户可完成从采集商品→搜索货源→计算利润的决策流程。高潜力商品自动标记。

---

## 阶段 7: 用户故事 5 - AI 翻译：商品信息自动翻译 (优先级: P4)

**目标**: 用户通过腾讯云机器翻译（TMT）自动将商品标题/描述从中文翻译为俄文，翻译结果可预览和手动编辑

**独立测试**: 选择已采集商品→点击「AI 翻译」→TMT zh→ru 翻译→查看俄文翻译结果→手动编辑不满意的翻译→保存最终版本

### 用户故事 5 的实现 — 后端

- [ ] T096 [US5] 在 `backend/src/services/ai_processor/tmt_translator.py` 中实现腾讯云 TMT 翻译客户端（TextTranslate 接口调用 tmt.tencentcloudapi.com、API 3.0 签名鉴权 SecretId+SecretKey、zh→ru 翻译 ProjectId=0、超 6000 字符自动分段翻译+合并结果、频率限制 5次/秒内置节流、错误码处理 NoFreeAmount/ServiceIsolate/LimitedAccessFrequency/TextTooLong/BackendTimeout）
- [ ] T097 [US5] 在 `backend/src/services/ai_processor/translate_service.py` 中实现翻译编排服务（接收翻译请求 fields: title/description、字段提取、批量翻译调度、结果存储到 ProcessingTask.output_data 含 TargetText+UsedAmount、task_type='translate'）
- [ ] T098 [US5] 在 `backend/src/worker/ai_tasks.py` 中实现 AI 翻译 Celery 任务（process_translate_task: 调用 TMT 客户端翻译、存储结果、错误重试 ≤2 次）
- [ ] T099 [US5] 在 `backend/src/api/ai_endpoints.py` 中实现 AI 翻译 API 端点（POST /api/v1/ai/translate 提交翻译任务含 untranslated_text 可选参数，GET /api/v1/ai/tasks 任务列表支持按 status+task_type 筛选，GET /api/v1/ai/tasks/{id} 单任务详情与结果，PUT /api/v1/ai/tasks/{id}/output 手动编辑保存）

### 用户故事 5 的实现 — 前端

- [ ] T100 [US5] 在 `frontend/src/app/ai-edit/translate/page.tsx` 中实现 AI 翻译页面（商品选择、批量翻译、进度展示、翻译结果预览编辑）
- [ ] T101 [P] [US5] 在 `frontend/src/components/features/TranslationEditor.tsx` 中创建翻译结果编辑器组件（原文 vs 译文并排展示、可编辑文本框、批量确认保存）
- [ ] T102 [US5] 在 `frontend/src/lib/hooks/useTranslate.ts` 中创建 AI 翻译 API hooks

**检查点**: 用户可独立完成商品标题/描述的中→俄 TMT 翻译及人工校对。

---

## 阶段 8: 用户故事 6 - 批量上架：预填刊登整批提交 (优先级: P5)

**目标**: 已加工商品可批量预填刊登信息，一键提交至 Ozon 店铺或导出 Excel/CSV 文件

**独立测试**: 选择多个已完成加工的商品→进入批量上架页面→查看预填信息→修改个别字段→批量提交→查看成功/失败统计→导出 Excel

### 用户故事 6 的实现 — 后端

- [ ] T103 [US6] 在 `backend/src/models/listing.py` 中创建 Listing 数据库模型（user_id FK, store_id FK, collected_product_id FK, category, title_ru, description_ru, attributes JSONB, images JSONB, price_rub, stock, status draft/submitting/success/failed, ozon_product_id, error_message, submitted_at）
- [ ] T104 [US6] 运行 Alembic 迁移创建 Listing 表
- [ ] T105 [P] [US6] 在 `backend/src/schemas/listings.py` 中创建刊登相关 Pydantic schemas（ListingGenerateRequest、ListingUpdateRequest、ListingSubmitRequest、SubmitStatusResponse 含 success_count/failed_count/results）
- [ ] T106 [US6] 在 `backend/src/services/lister/prefill.py` 中实现刊登信息预填服务（从 CollectedProduct + ProcessingTask output_data 自动预填刊登: 类目/标题_ru/描述_ru/属性/图片/售价/库存，支持默认值模板 stock=100, price_multiplier=2.5）
- [ ] T107 [US6] 在 `backend/src/services/lister/ozon_api.py` 中实现 Ozon Seller API 客户端（POST /v1/product/import 提交商品创建，API Key+Client ID 认证，限流控制 ≤5 req/s，错误响应解析）
- [ ] T108 [US6] 在 `backend/src/services/lister/service.py` 中实现批量刊登服务（批量提交编排、状态追踪 draft→submitting→success/failed、成功/失败统计、失败原因解析、Excel/CSV 导出生成符合 Ozon 模板规范）
- [ ] T109 [US6] 在 `backend/src/api/listings.py` 中实现刊登管理 API 端点（POST generate 预填刊登信息，GET list 刊登列表按 store_id+status 筛选，PUT update 修改单个字段实时保存，POST submit 批量提交，GET submit-status/{task_id} 查询提交进度，POST export 导出 Excel/CSV）
- [ ] T110 [US6] 在 `backend/src/worker/lister_tasks.py` 中实现批量上架 Celery 任务（batch_submit_listings: 逐个调用 Ozon API 提交、状态更新、结果汇总，超时 5min）

### 用户故事 6 的实现 — 前端

- [ ] T111 [US6] 在 `frontend/src/app/listing/page.tsx` 中实现批量上架页面（选择商品→选择目标店铺→生成预填→编辑确认→批量提交→进度条→结果统计 success_count/failed_count→导出按钮→失败商品修正重提）
- [ ] T112 [P] [US6] 在 `frontend/src/components/features/ListingEditor.tsx` 中创建刊登编辑组件（可编辑表格、行内修改价格/库存/类目/属性字段、实时保存）
- [ ] T113 [P] [US6] 在 `frontend/src/components/features/SubmitResult.tsx` 中创建提交结果组件（成功/失败统计数字、失败清单+错误原因列表、重试按钮、导出按钮）
- [ ] T114 [US6] 在 `frontend/src/lib/hooks/useListings.ts` 中创建批量上架 API hooks

**检查点**: 用户可完成从加工完成商品→预填→提交→结果确认的批量上架闭环。

---

## 阶段 9: 用户故事 7 - 店铺跟踪：在线商品销售反馈 (优先级: P6)

**目标**: 用户可绑定 Ozon 店铺、查看销售数据仪表盘、接收库存预警和差评通知、分析销售趋势

**独立测试**: 绑定 Ozon 店铺→查看仪表盘数据→浏览商品销售指标→设置预警阈值→收到库存预警/差评通知→查看销售趋势图

### 用户故事 7 的实现 — 后端

- [ ] T115 [P] [US7] 在 `backend/src/models/store.py` 中创建 Store 数据库模型（user_id FK, name, ozon_client_id 加密存储, ozon_api_key_encrypted 加密存储, is_active, last_sync_at, created_at）——注: 基础认证阶段 T014 可能已部分创建，此处确保完整字段
- [ ] T116 [P] [US7] 在 `backend/src/models/sales_data.py` 中创建 SalesData 数据库模型（store_id FK, listing_id FK, ozon_product_id, views, orders, sales_quantity, revenue_rub, conversion_rate, stock, rating, review_count, synced_at）
- [ ] T117 [P] [US7] 在 `backend/src/models/notification.py` 中创建 Notification 数据库模型（user_id FK, store_id FK, type stock_alert/negative_review/sync_failed, title, content, related_product_id FK, is_read, triggered_at）
- [ ] T118 [US7] 运行 Alembic 迁移创建 Store（如未创建）、SalesData 和 Notification 表
- [ ] T119 [P] [US7] 在 `backend/src/schemas/stores.py` 中创建店铺管理 Pydantic schemas
- [ ] T120 [P] [US7] 在 `backend/src/schemas/tracking.py` 中创建跟踪相关 Pydantic schemas（DashboardResponse、ProductMetricsResponse、TrendDataResponse、NotificationResponse）
- [ ] T121 [US7] 在 `backend/src/services/tracker/sync.py` 中实现销售数据同步服务（调用 Ozon Seller API 获取销售报告 + 商品列表，数据写入 SalesData 按 store_id+ozon_product_id+synced_at 组合）
- [ ] T122 [P] [US7] 在 `backend/src/services/tracker/alert.py` 中实现预警检测服务（库存低于阈值检查→创建 Notification stock_alert，差评检测评分 ≤ 2→创建 Notification negative_review 含评价内容和链接）
- [ ] T123 [US7] 在 `backend/src/services/tracker/dashboard.py` 中实现仪表盘统计服务（聚合查询: 总商品数/总销量/总订单/转化率/总收入，按 today/week/month 周期切换统计）
- [ ] T124 [US7] 在 `backend/src/api/stores.py` 中实现店铺管理 API 端点（POST 绑定店铺加密存储凭证、GET 列表、PUT 更新凭证、DELETE 解绑确认）
- [ ] T125 [US7] 在 `backend/src/api/tracking.py` 中实现跟踪 API 端点（GET dashboard 仪表盘概览按 store_id+period 查询，GET products 在线商品销售列表+多维排序 sales/views/conversion/rating，GET products/{id}/trends 销售趋势数据 7d/30d/90d）
- [ ] T126 [US7] 在 `backend/src/api/notifications.py` 中实现通知 API 端点（GET 列表+分页+按 type/is_read 筛选，PUT /{id}/read 标记单条已读，PUT /read-all 全部已读）
- [ ] T127 [US7] 在 `backend/src/api/events.py` 中实现 SSE 事件推送端点（GET /api/v1/events: task.progress 进度更新、notification.new 新通知实时推送、sync.completed 同步完成事件）
- [ ] T128 [US7] 在 `backend/src/worker/sync_tasks.py` 中实现销售数据定时同步 Celery 任务（sync_sales_data: 每 30 分钟执行，超时 2min，重试 3 次）
- [ ] T129 [US7] 在 `backend/src/worker/sync_tasks.py` 中实现预警定时检查 Celery 任务（check_stock_alerts: 每 15 分钟检查库存低于阈值，check_negative_reviews: 差评轮询检测评分 ≤ 2 星）

### 用户故事 7 的实现 — 前端

- [ ] T130 [US7] 在 `frontend/src/app/tracking/page.tsx` 中实现店铺跟踪仪表盘页面（店铺选择器 store_id 必选 + 数据概览卡片: 总商品数/总销量/总订单/转化率/总收入 + 周期切换 today/week/month）
- [ ] T131 [P] [US7] 在 `frontend/src/components/features/SalesTrendChart.tsx` 中创建销售趋势图组件（折线图: 销量趋势/收入趋势/转化率变化，7d/30d/90d 时间范围切换）
- [ ] T132 [P] [US7] 在 `frontend/src/components/features/OnlineProductList.tsx` 中创建在线商品列表组件（多维度排序: 销量/库存/浏览量/转化率/评分，库存预警标记红色，差评标记橙色）
- [ ] T133 [US7] 在 `frontend/src/app/notifications/page.tsx` 中实现通知中心页面（通知列表分页、类型标签颜色区分 stock_alert/negative_review/sync_failed、已读/未读状态切换、点击跳转关联商品、SSE 实时推送新通知）
- [ ] T134 [US7] 在 `frontend/src/app/settings/stores/page.tsx` 中实现店铺管理设置页面（绑定店铺表单含 ozon_client_id+ozon_api_key 输入、已绑定列表展示、更新凭证、解绑确认对话框）
- [ ] T135 [US7] 在 `frontend/src/app/settings/api-keys/page.tsx` 中实现 API 密钥管理页面（密钥列表含名称+前缀 oz-+最后使用时间、生成新密钥弹窗仅创建时展示完整密钥、吊销确认）
- [ ] T136 [US7] 在 `frontend/src/app/settings/page.tsx` 中实现预警阈值设置页面（库存预警阈值、高潜力毛利率阈值 profit_threshold 默认 25% 可配置）
- [ ] T137 [US7] 在 `frontend/src/lib/hooks/useSSE.ts` 和 `frontend/src/lib/hooks/useNotifications.ts` 和 `frontend/src/lib/hooks/useTracking.ts` 中创建店铺跟踪 API hooks

**检查点**: 用户可绑定店铺→查看销售数据→接收预警通知，形成跟卖全链路闭环。

---

## 阶段 10: 收尾与跨模块关注点

**目的**: 影响多个用户故事的改进项和质量保障

- [ ] T138 [P] 在 `frontend/src/app/page.tsx` 中实现首页仪表盘（工具箱入口卡片 grid、模块概览导航、最近操作摘要）
- [ ] T139 [P] 在所有 API 端点中添加结构化日志（请求 ID、耗时、状态码），统一使用 `structlog`
- [ ] T140 [P] 在 `frontend/src/components/features/ErrorBoundary.tsx` 中创建全局错误边界组件（捕获渲染错误、友好降级页面）
- [ ] T141 [P] 在 `frontend/src/components/ui/` 中补充 Loading Skeleton、Empty State、Toast 通用状态组件
- [ ] T142 安全加固：审计所有 API 端点权限（JWT 验证覆盖、API Key 权限范围、CORS 白名单仅允许前端域名）
- [ ] T143 安全加固：审计所有用户输入验证（Pydantic schema 校验、SQL 注入防护参数化查询、XSS 防护输出转义、环境变量安全扫描确认 .env 在 .gitignore 无硬编码密钥 VOLCENGINE_* TENCENT_* 仅服务端使用）
- [ ] T144 性能优化：为前端页面添加 Next.js Loading UI 和 Error UI（每个路由 `loading.tsx` 和 `error.tsx`）
- [ ] T145 性能优化：后端数据库查询优化——为高频查询添加复合索引（按 data-model.md 索引设计方案: RankedProduct (category, rank_type, cached_at)、CollectedProduct (user_id, collected_at)、Listing (store_id, status)、SalesData (store_id, synced_at)、Notification (user_id, is_read, triggered_at)）
- [ ] T146 执行 `quickstart.md` 完整环境搭建验证（从零启动到完整跟卖流程走通: 注册→榜单浏览→采集→比价→AI 改图+翻译→上架→跟踪）
- [ ] T147 [P] 在 `frontend/src/app/` 中添加移动端响应式适配（参考 Apple Design 响应式断点）
- [ ] T148 代码清理与重构：检查各文件行数 ≤ 800 行，函数 ≤ 50 行，提取重复逻辑，遵循不可变数据模式
- [ ] T149 运行全量测试并验证覆盖率 ≥ 80%（`pytest --cov` + `npm test --coverage`）

---

## 依赖关系与执行顺序

### 阶段依赖

- **环境搭建（阶段 1）**: 无依赖——可立即开始
- **基础设施（阶段 2）**: 依赖于环境搭建完成——阻塞所有用户故事
- **用户故事 1 & 2（阶段 3-4）**: 同为 P1，基础设施完成后即可并行开始
- **用户故事 3（阶段 5）**: 依赖基础设施——不依赖 US1/US2
- **用户故事 4（阶段 6）**: 依赖 US3 的 CollectedProduct 数据模型
- **用户故事 5（阶段 7）**: 依赖 US2 的 ai_processor 框架（ProcessingTask 模型、ai_tasks Celery）+ US3 的 CollectedProduct
- **用户故事 6（阶段 8）**: 依赖 US2+US5 的加工结果（AI 改图+翻译后的数据）+ US3 的采集数据 + US7-Store 部分的 Store 模型
- **用户故事 7（阶段 9）**: 依赖 US6 的 Listing 模型 + Store 模型（Store 模型可在基础设施阶段提前创建）
- **收尾（阶段 10）**: 依赖于所有用户故事完成

### 用户故事依赖图

```
US1 (榜单发现 P1) ────────────────────┐
                                        ├── 无强依赖，可并行开始
US2 (AI 改图 P1 🔥) ─────────────────┘
                                        ↓
US3 (一键采集 P2) ──→ US4 (1688 比价 P3) ──→ US5 (AI 翻译 P4)
                              ↓                     ↓
US7-Store (店铺绑定) ←── US6 (批量上架 P5) ←─────────┘
         ↓
US7 (店铺跟踪 P6)
```

- **US1**: 基础设施完成后即可开始，独立 MVP，不依赖任何其他故事
- **US2**: 基础设施完成后即可开始，虽然改图需要商品图片但可接受手动上传作为独立路径，不强制依赖 US3。ProcessingTask 模型在 US2 中创建供 US5 复用
- **US3**: 基础设施完成后即可开始，不依赖 US1/US2
- **US4**: 依赖 US3 的 CollectedProduct 数据模型，但可通过手动输入进价模式独立测试
- **US5**: 依赖 US2 的 ProcessingTask 模型 + US3 的 CollectedProduct 数据
- **US6**: 依赖 US3（采集数据）+ US5（翻译结果预填俄文标题描述）+ US7-Store 部分（店铺绑定）
- **US7**: Store 模型可提前在基础设施阶段创建（T115），SalesData 依赖 US6 的 Listing

### 每个用户故事内部

- 模型先于服务
- 服务先于 API 端点
- API 端点先于前端页面
- 后端先于前端（前端可基于 API 规格 mock 并行开发）
- 核心实现先于集成
- 故事完成后再进入下一个优先级

### 并行机会

- 阶段 1 中所有标记 [P] 的任务可并行（T002–T006）
- 阶段 2 中标记 [P] 的后端/前端任务可分组并行（T013-T015, T017-T018, T023-T024, T031-T037, T039, T041-T042）
- 基础设施完成后，US1 和 US2 可同时由不同开发者并行开发
- US3 与 US1/US2 也可并行（不同核心模型）
- US4 和 US5 可在 US3 完成后并行
- US7 的 Store 绑定部分（T115, T119, T124, T134）可与 US3-US6 并行提前完成
- 每个用户故事内，标记 [P] 的模型和 schemas 可并行
- 不同用户故事的前端页面可在 API 规格确定后并行开发（mock API）

---

## 并行示例: 基础设施阶段后的并行开发

```bash
# 开发者 A: 榜单发现 (US1)
T043-T045 模型 → T046 schemas → T047-T049 爬虫+服务 → T050-T052 API+任务 → T053-T057 前端

# 开发者 B: AI 改图 (US2) — 与 US1 同时进行
T058-T059 模型+schemas → T060-T062 SeedEdit+编辑服务 → T063-T064 任务+API → T065-T068 前端

# 开发者 C: 一键采集 (US3) — 与 US1/US2 同时进行
T069-T070 模型 → T071 schemas → T072-T073 服务+API → T074-T077 插件 → T078-T081 前端

# 开发者 D: 店铺管理 (US7 前置部分) — 可提前并行
T115,T119 schemas → T124 API → T134-T136 前端设置页
```

## 并行示例: 用户故事 2 (AI 改图)

```bash
# 后端同时启动独立任务:
Task T060: "在 backend/src/services/ai_processor/seededit.py 中实现 SeedEdit 3.0 API 客户端"
Task T061: "在 backend/src/services/ai_processor/image_resizer.py 中实现图片尺寸标准化工具"

# 前端组件可并行:
Task T066: "在 frontend/src/components/features/PromptEditor.tsx 中创建提示词编辑器组件"
Task T067: "在 frontend/src/components/features/ImageCompare.tsx 中创建图片对比预览组件"
```

---

## 实施策略

### MVP 优先（US1 + US2 最小可用）

1. 完成阶段 1: 环境搭建
2. 完成阶段 2: 基础设施（关键——阻塞所有故事）
3. 完成阶段 3: US1 榜单发现
4. 完成阶段 4: US2 AI 改图
5. **停下并验证**: 用户可浏览榜单+选品+AI 改图
6. 如就绪则部署/演示

### 增量交付

1. 环境搭建 + 基础设施 → 基础就绪
2. 添加 US1 (榜单发现) → 独立测试 → 部署 **(MVP 里程碑 1)**
3. 添加 US2 (AI 改图 SeedEdit 3.0) → 独立测试 → 部署 **(MVP 里程碑 2, 核心差异化)**
4. 添加 US3 (一键采集) → 独立测试 → 部署
5. 添加 US4 (1688 比价) + US5 (AI 翻译 TMT) → 独立测试 → 部署
6. 添加 US7-Store (店铺绑定) + US6 (批量上架) → 独立测试 → 部署 **(全链路闭环)**
7. 添加 US7-Tracking (销售跟踪) → 独立测试 → 部署 **(完整版)**
8. 每个故事在不破坏之前故事的前提下增加价值

### 并行团队策略

多人开发时:

1. 团队共同完成环境搭建 + 基础设施
2. 基础设施完成后分配:
   - **开发者 A**: US1 榜单发现 + US5 AI 翻译 (TMT) — 完整前端+后端
   - **开发者 B**: US2 AI 改图 (SeedEdit 3.0) + US4 1688 比价 — 完整前端+后端
   - **开发者 C**: US3 一键采集 + US7 店铺管理部分 — 含浏览器插件
3. US6 批量上架需要 US3+US5+US7-Store→先完成前置条件再开始
4. US7-Tracking 在 US6 完成后开始
5. 各故事独立完成并通过检查点验证后集成

---

## 任务统计

| 指标 | 数量 |
|------|------|
| **总任务数** | **149** |
| 环境搭建 (阶段 1) | 8 |
| 基础设施 (阶段 2) | 34 |
| US1: 榜单发现 (阶段 3) | 15 |
| US2: AI 改图 SeedEdit 3.0 (阶段 4) | 11 |
| US3: 一键采集 (阶段 5) | 13 |
| US4: 1688 比价 (阶段 6) | 14 |
| US5: AI 翻译 TMT (阶段 7) | 7 |
| US6: 批量上架 (阶段 8) | 12 |
| US7: 店铺跟踪 (阶段 9) | 23 |
| 收尾 (阶段 10) | 12 |
| **可并行任务 [P]** | **约 60** (~40%) |

## 注意事项

- [P] 任务 = 不同文件，无依赖关系，可同时执行
- [Story] 标签将任务映射到具体用户故事，方便追踪
- 每个用户故事应可独立完成和测试（通过降级模式/手动输入隔离依赖）
- 每个任务或逻辑组完成后提交（遵循 Conventional Commits）
- 后端和前端在接口规格确定后可并行开发（前端 mock API）
- 可在任何检查点停下以独立验证故事
- 避免: 模糊的任务、同文件冲突、破坏独立性的跨故事强依赖
- **SeedEdit 和 TMT 凭据绝不提交到 Git**，仅在 .env 中配置（VOLCENGINE_*、TENCENT_*）
- 所有描述和文档使用简体中文
