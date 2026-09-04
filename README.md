# dsh-searchflow — 搜索流程动效可视 + 快照加速

DSH 实时搜索加速插件，两件事：

1. **可视化** — 把 `web_search → web_fetch → web_snapshot → browser_open/click → read` 每一步实时呈现在工具调用行内：用动效 `wb_*` 图标（运行中蓝光呼吸 / 完成绿勾 / 失败红 X）替换默认的通用图标，黑盒等待变成可见的前进。同时用 `⚠ 挑战 / ⚠ 404 / ⚠ 噪声` 徽标标记 Cloudflare 挑战页与 404 页等「假成功」结果。
2. **加速** — 在 `tools/execute` 瀑布中拦截（不改任何上游包）：
   - `web_snapshot` 命中缓存直接短路（90s 全量渲染 → 5ms）
   - `browser_open` 命中缓存立即返回已渲染内容，真实导航在后台预热（省 networkidle 8s + 全页截图）
   - 搜索结果 Top-3 自动预取预热内存缓存
   - URL 变体（www / 非 www / 尾斜杠 / 参数顺序）共享同一缓存键

## 架构

```
┌─ Host (lib/index.js) ─────────────────────────────────┐
│  ctx.on('tools/execute') ── 观察 web_*/browser_* 工具   │
│     → EventBus (start/completed/error, 含 cache/rule)   │
│  GET /searchflow/events (SSE) ── 回放 + 实时事件流       │
│  web_snapshot / browser_open 缓存拦截 + Top-N 预取      │
└────────────────────────────────────────────────────────┘
        │ EventSource
┌─ Client (lib/client.js) ──────────────────────────────┐
│  工具调用行内动态图标（搜索/抓取/快照/点击/阅读/导航）     │
│  running/done/error 实时切换 + 行级高亮 + 光晕           │
└────────────────────────────────────────────────────────┘
```

客户端采用 ModuleLoader 单文件自包含（图标内联，无相对路径依赖，无需构建步骤），与 dsh-icon-workbench / dsh-guardian 同型。

## 泳道映射

| 阶段 | 工具 | 图标 |
|---|---|---|
| search | `web_search` / `web_search_pro` / `web_platform_search` / `web_exa_search` / `github_issue_list` | 拉匣寻物 |
| fetch | `web_fetch` / `web_fetch_pro` / `web_exa_contents` | 抓取 |
| snapshot | `web_snapshot` / `browser_screenshot` | 取景·定影 |
| click | `browser_open` / `browser_click` / `browser_type` / `browser_recipe_run` / `browser_scroll` | 指尖按靶 |
| read | `browser_read` / `web_rule` / `web_history` / `web_search_stats` / `github_issue_read` 等 | 16宫格扫描 |
| navigate | 其它导航类 | 路径绘制 |

每个工具调用附带状态：`缓存`（fromCache 命中）与 `规则`（usedRule）徽标，加速效果可感可验证。

## 加速细节

| 拦截点 | 行为 | 收益 |
|---|---|---|
| `web_snapshot` | 内存 LRU(200/1h) + web-search-pro store.db（只读）双层缓存，命中短路返回 `{value}` | 90s → 5ms |
| `browser_open` | 命中缓存立即返回已渲染内容；真实导航 fire-and-forget 后台预热（active page 保持就绪，后续 click/type 语义不破坏） | ~13-18s → ~0ms 前台等待 |
| 搜索结果 Top-3 | `web_search*` 完成后对结果 URL 串行预取渲染写入内存缓存 | 后续 open/snapshot 直接命中 |
| URL 规范化 | 去 www / 尾斜杠 / 默认端口 / 参数排序，变体共享缓存键 | 变体重复渲染归零 |
| 噪声检测 | Cloudflare 挑战 / 404 页 / 噪声查询 → ⚠ 徽标 | 假成功一目了然 |

可选性：`browser` 服务通过 `ctx.get` 软依赖（未安装 dsh-browser 时预取静默降级，不影响可视化与 snapshot/browser_open 缓存）。

## 安装

```bash
dsh plugin --profile web add D:\Harness\dsh-searchflow
```

重启 profile 后生效。卸载：`dsh plugin --profile web remove dsh-searchflow`。

> 发布为即插即用插件：本包是标准 DSH bundle（`dsh.bundle.patch` + `dsh.client`），`pnpm pack` / git 地址均可用 `dsh plugin add <spec>` 安装。

## 开发

- `lib/index.js` — host：`tools/execute` 观测 + 缓存拦截 + SSE（需 `webServer`、`tools` 注入；`browser` 为可选软依赖）
- `lib/client.js` — client：ModuleLoader 单文件自包含（内联图标，相对路径 require 不解析）
- `lib/icons.js` — 共享图标源（供抽取参考；实际 client 内联）
- `preview.html` — 独立泳道预览（vendor/ 本地 React UMD），含成功/错误双流程演示脚本
- `test-realistic.mjs` — 回归测试（node 直跑，无依赖）

## 验证

```bash
node --check lib/index.js lib/client.js lib/icons.js
node test-realistic.mjs
```

覆盖：B#1 快照同 URL 短路、B#3 www/尾斜杠变体共享键、B#4 browser_open 缓存命中 + 后台 warm 刷新、B#5 无 browser 服务时预取静默降级。host 运行时以 node 模拟 cordis ctx 实测通过。

## License

MIT
