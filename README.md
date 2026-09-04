# dsh-searchflow — 搜索加速泳道

实时可视化 web 搜索流程的 DSH 插件：用 **泳道图 + wb_* 动效图标**，把「搜索 → 抓取 → 快照 → 点击 → 阅读 → 完成/失败」的每一步实时呈现，让黑盒等待变成可见的前进。

## 架构

```
┌─ Host (lib/index.js) ─────────────────────────────────┐
│  ctx.on('tools/execute') ── 观察 web_*/browser_* 工具   │
│     → EventBus (start/completed/error, 含 cache/rule)   │
│  GET /searchflow/events (SSE) ── 回放 + 实时事件流       │
└────────────────────────────────────────────────────────┘
        │ EventSource
┌─ Client (lib/client.js) ──────────────────────────────┐
│  泳道图（6 阶段 + 完成/失败终态）                        │
│  内嵌卡 + 右下角悬浮气泡（sf.viewMode 切换）             │
│  wb_* 动效图标：搜索/快照/点击/阅读/导航/完成/失败       │
└────────────────────────────────────────────────────────┘
```

## 泳道映射

| 阶段 | 工具 | 图标 |
|---|---|---|
| search | `web_search` / `web_search_pro` / `web_platform_search` | 拉匣寻物 |
| fetch | `web_fetch` / `web_fetch_pro` / `web_exa_contents` | 抓取 |
| snapshot | `web_snapshot` / `browser_screenshot` | 取景·定影 |
| click | `browser_open/click/type/recipe_run/scroll` | 指尖按靶 |
| read | `browser_read` / `web_rule` / `web_history` 等 | 16宫格扫描 |
| navigate | 其它导航类 | 路径绘制 |
| done / error | — | 勾选 / 抖动X |

每个泳道带状态标记：`规则`（usedRule 命中）与 `缓存`（fromCache）徽标，加速效果可感可验证。

## 安装

```bash
dsh plugin --profile web add D:\Harness\dsh-searchflow
```

重启 profile 后生效。卸载：`dsh plugin --profile web remove dsh-searchflow`。

## 开发

- `lib/index.js` — host：`tools/execute` 观测 + SSE（需 `webServer`、`tools` 注入）
- `lib/client.js` — client：ModuleLoader 单文件自包含（含内联图标，因 ModuleLoader require 不解析相对路径）
- `lib/icons.js` — 共享图标源（供抽取参考；实际 client 内联）
- `preview.html` — 独立预览（vendor/ 本地 React UMD），含成功/错误双流程演示脚本

## 验证

- `node --check` 三个模块语法通过
- host 运行时：tools/execute 钩子 + SSE 事件流 + cache/rule 元数据（node 模拟 cordis ctx 实测）
- preview：Playwright 渲染成功/错误流程，6 阶段全部流转，error 终态 X 正确显示
