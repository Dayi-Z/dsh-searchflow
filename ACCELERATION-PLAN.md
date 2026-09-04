# 网络搜索加速策略与方法（2026-09-03 源码审计版）

> 基于 dsh-web-search-pro@0.1.8 真实源码 + store.db 真实数据，非理论推测。

## 一、已存在的加速能力（不要重复造轮子）

| 能力 | 位置 | 说明 |
|---|---|---|
| 查询归一化 | `lib/cache-key.js` | trim + 折叠空白 + lowercase，sha256 指纹 |
| 搜索双层缓存 | `lib/router.js` search() | LruCache(128) → SQLite `getCachedQuery`，TTL 3600s |
| 平台搜索缓存 | `lib/router.js` platformSearch() | 同上 |
| 页面抓取缓存 | `lib/fetch.js` fetchPage() | LruCache + `getPage(url, ttl)`，pages 表 url 索引 |
| 规则系统 | `lib/fetch.js` mergedRules() | 用户规则(DB)优先 + 18 个内置站点规则 |
| 引擎回退 | `lib/router.js` BackendRegistry | cooldown 30s，ddg→bing→exa→seam→jina |

## 二、真实加速缺口（按 ROI 排序）

### 🥇 #1 web_snapshot 完全没有缓存检查（最大浪费）
`lib/tools.js:254-280` — execute 直接 `browser.snapshot()` 全量渲染
（timeoutMs = 30s + 60s = 90s 预算），**即使同一 URL 1 小时内刚快照过**。
`store.savePage` 已保存 html_path/screenshot_path/text 但从不复用。

**实证**：`deepseek.com/en/index.html` 在 02:33 和 02:54 被 playwright 快照 2 次
（20 分钟内重复全量渲染）；juejin.cn/post/7345811975990804489 同样。

**修复**（最小 diff）：execute 开头加 `store.getPage(url, ttlSeconds)` 检查，
命中则返回 `{url, title, text, htmlPath, screenshotPath, fromCache:true}`，跳过渲染。

### 🥈 #2 「Just a moment...」污染缓存
store.db top 重复查询第 2 名 = Cloudflare 挑战页标题（5 次），污染查询表与缓存键。

### 🥉 #3 同查询不同参数 → 缓存 miss
「DeepSeek Harness」查询 11 次，但 cache_key 复用仅 1 条 ——
engines/count/multi/exa 参数全部进 cache_key，参数一变化就重搜。

### #4 URL 变体重复渲染
`deepseek.com/en/index.html` vs `www.deepseek.com/en/index.html` 是两个缓存键
（pages 表按精确 url 匹配）。需 URL 规范化（去 www/协议归一）。

### #5 parallelEngines 默认 false
引擎串行回退，每次失败叠加 cooldown 等待。

### #6 store 未注册为可注入服务
第三方插件无法优雅复用其查询 API，只能直接读 SQLite 文件。

## 三、落地路线（三层）

### A. 配置层（零代码，立即生效）
- settings.yaml `web-search-pro:` 段调 `ttlSeconds` / `parallelEngines`
- web_rule 覆盖高频域名（cnblogs/deepseek 已建，可加 juejin/docs 站）

### B. 宿主插件层（dsh-searchflow 增强，✅ 全部实现并验证）
不改第三方包，在 tools/execute 瀑布中拦截：
1. ✅ **拦截 web_snapshot**（2026-09-03 已实现，端到端实测 CACHE-HIT）
   - 内存 LRU（200 条 / TTL 1h）优先 + store.db（只读）兜底；渲染后自动回填内存
   - 短路返回 `{ value }` 形状，由 DSH normalizeDispatchResult 重跑 output.render
   - **关键坑**：瀑布 exec 参数在 `exec.arguments`（NOT `exec.args`）；next() 返回 `{value, content}`
   - 实测：同 URL 连续快照全部 CACHE-HIT，最近 2 分钟零新快照文件（修复前每次生成新文件）
2. ✅ **缓存命中可视化** — SSE 事件带 `CACHE-HIT src=cache:store/memory`，泳道图「缓存」徽标
3. ✅ **URL 变体共享缓存键（B#3）** — `canonicalUrl()` 去 www/斜杠/默认端口/参数排序，
   `urlVariants()` 生成 SQL IN 变体集；store.db 实测 deepseek www/非 www 变体共享命中
4. ✅ **噪声过滤标记（B#2）** — `detectContentNoise()` 识别 Cloudflare 挑战（"Just a moment…"）
   与 404 页，`isNoiseQuery()` 识别挑战文本被误当查询；泳道图「⚠ 挑战/⚠ 404/⚠ 噪声」橙色徽标
5. ⏳ 后续可加：Top-N 预取预热、查询级缓存键归一（cache_key 对 count 归一化）

### C. 上游 PR（社区贡献）
- web_snapshot 加 getPage 检查（一行级 diff）
- store 注册为 ctx 服务
- cache_key 对 count 归一化
- URL 变体缓存键

## 四、关键 API 事实（拦截实现）
- `ctx.on('tools/execute', async (exec, next) => ...)` — next() 执行真实工具；
  可短路返回 ToolExecutionResult `{content, isError?}` 实现缓存
- 参考实现：`dsh-tool-call-timeout-policy/lib/index.js`（替换 signal、await next、按条件换结果）
- store.db：`C:\Users\HP\.dsh\data\web-search-pro\store.db`（node:sqlite 只读安全）
- 分析脚本：`analyze-store.mjs`

## 五、预期收益量化（估）
| 策略 | 场景 | 收益 |
|---|---|---|
| snapshot 缓存 | 同一 URL 重复快照（实测 20min 内 2 次） | 90s → 5ms |
| 参数归一化 | 高频查询（11 次变体） | 搜索从 2-8s → 0ms |
| 规则覆盖 | 高频站点提取 | 抓取文本质量↑ + 重试↓ |
| 并行引擎 | 多引擎场景 | 串行回退 → 并行+RRF |
