/**
 * dsh-searchflow — host side.
 *
 * Observes ALL web/browser tool calls via the tools/execute waterfall,
 * emits lifecycle events (start / completed / error / cache-hit) to an
 * in-memory EventBus, and serves them to the client via SSE at
 * GET /searchflow/events.
 *
 * Also intercepts web_snapshot to provide snapshot cache (bypassing
 * redundant Playwright renders for URLs already snapshotted within TTL).
 * @module dsh-searchflow
 */

import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

// ─── EventBus (gitcompass pattern, scoped to searchflow) ────────────────

let _seq = 0
const MAX_HISTORY = 200

class EventBus {
  constructor() { this._subscribers = new Map(); this._history = [] }
  emit(type, data) {
    const event = { id: `sf-${++_seq}`, type, timestamp: Date.now(), data }
    this._history.push(event)
    if (this._history.length > MAX_HISTORY) this._history.shift()
    for (const fn of this._subscribers.values()) { try { fn(event) } catch {} }
    // wildcard subscribers
    for (const [key, fn] of this._subscribers) { if (key === '*') try { fn(event) } catch {} }
  }
  subscribe(key, fn) { this._subscribers.set(key, fn); return () => this._subscribers.delete(key) }
  getHistory(n = 100) { return this._history.slice(-n) }
}

// ─── Tool → Phase mapping ──────────────────────────────────────────────
// Maps DSH tool names to swimlane phases for the client renderer.

const TOOL_PHASE = {
  // search phase
  'web_search':           'search',
  'web_search_pro':       'search',
  // fetch phase
  'web_fetch':            'fetch',
  'web_fetch_pro':        'fetch',
  // snapshot / screenshot phase
  'web_snapshot':         'snapshot',
  'browser_screenshot':   'snapshot',
  // click / navigation phase
  'browser_open':         'click',
  'browser_click':        'click',
  'browser_type':         'click',
  'browser_recipe_run':   'click',
  'browser_scroll':       'click',
  // read / extraction phase
  'browser_read':         'read',
  'browser_script_run_builtin': 'read',
  'browser_userscript_run': 'read',
  // platform search — maps to search
  'web_platform_search':  'search',
  // github platform deep-read tools
  'github_issue_list':    'search',
  'github_issue_read':    'read',
  // rule / history / cache management — map to read (observational)
  'web_rule':             'read',
  'web_history':          'read',
  'web_cache_clear':      'read',
  'web_search_stats':     'read',
  'web_backend_status':   'read',
  'web_deps':             'read',
  'web_exa_contents':     'fetch',
  // dsh-browser additional tools (keep host/client maps in sync)
  'browser_hover':        'click',
  'browser_set_files':    'click',
  'browser_evaluate':     'read',
  'browser_crawl':        'fetch',
  'browser_status':       'read',
  'browser_automation_search': 'search',
  'browser_automation_develop': 'read',
  'browser_automation_run': 'click',
  'browser_opencli_catalog': 'read',
  'browser_opencli_run':   'read',
  'browser_opencli_status': 'read',
  // knowledge-base tools (dsh-learn-wiki) — carry icons only; the client
  // guards round-opening by tool identity, so these never open/advance a
  // web-search round on their own.
  'wiki_recall':  'search',  // knowledge-base search (CRAG hit/weak/miss)
  'wiki_acquire': 'fetch',   // L3 gap refill (web retrieval + distillation)
  'wiki_harvest': 'read',
  'wiki_learn':   'read',
  'wiki_commit':  'read',
  'wiki_review':  'read',
  'wiki_lint':    'read',
  'wiki_merge':   'read',
  'wiki_sessions': 'read',
  'wiki_struggle': 'read',
  // MCP tools (dsh-mcp-lens)
  'mcp_search':   'search',
  'mcp_call':     'read',
}

/** Extract a human-readable summary from tool name + args. */
function summarize(tool, args) {
  switch (tool) {
    case 'web_search': case 'web_search_pro':
      return Array.isArray(args?.queries) ? args.queries.join(' | ') : (args?.query ?? '').slice(0, 80)
    case 'web_fetch': case 'web_fetch_pro':
      return args?.url ?? ''
    case 'web_snapshot':
      return `screenshot=${args?.screenshot ? 'on' : 'off'} ${(args?.url ?? '').slice(0, 60)}`
    case 'web_rule':
      return `${args?.action ?? 'list'} ${(args?.hostname ?? '').slice(0, 40)}`
    case 'browser_open':
      return args?.url ?? ''
    case 'browser_click':
      return args?.selector ?? ''
    case 'browser_recipe_run':
      return `${args?.steps?.length ?? 0} steps`
    default:
      return ''
  }
}

/** Best-effort extract the primary URL from tool args (for cache-hit checks). */
function primaryUrl(tool, args) {
  return args?.url ?? (Array.isArray(args?.urls) ? args.urls[0] : undefined) ?? undefined
}

// ── Deep mode: query expansion + cross-language ──
let sfDeepMode = false

/** Expand a query for cross-language + broader coverage (rule-based, no LLM). */
function expandQuery(query) {
  const hasCJK = /[\u4e00-\u9fff]/.test(query)
  // Any CJK → add English academic keywords (Chinese queries often include English acronyms like RAG)
  if (hasCJK) return query + ' overview survey'
  // Any Latin → add Chinese keywords
  const hasLatin = /[a-zA-Z]{3,}/.test(query)
  if (hasLatin) return query + ' \u6700\u4f73\u5b9e\u8df5 \u7efc\u8ff0'
  return query
}

// ─── URL canonicalization cache (B#3 perf) ─────────────────────────────────
const _canonCache = new Map()
const _variantsCache = new Map()

/** Canonical cache key for a URL (www-stripped, slash-invariant, port-normalized). */
function canonicalUrl(raw) {
  const hit = _canonCache.get(raw)
  if (hit) return hit
  try {
    const u = new URL(raw)
    u.hash = ''
    u.protocol = u.protocol.toLowerCase()
    u.hostname = u.hostname.toLowerCase()
    if (u.hostname.startsWith('www.')) u.hostname = u.hostname.slice(4)
    if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) u.port = ''
    // sort query params so key is order-independent
    const params = [...u.searchParams.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
    u.search = ''
    for (const [k, v] of params) u.searchParams.append(k, v)
    // trailing slash: keep for root path only
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1)
    const canon = u.href
    _canonCache.set(raw, canon)
    return canon
  } catch { return typeof raw === 'string' ? raw : '' }
}

/** All URL spellings that should map to the same cached page (for SQL IN). */
function urlVariants(raw) {
  const hit = _variantsCache.get(raw)
  if (hit) return hit
  const set = new Set([raw])
  try {
    const u = new URL(raw)
    const host = u.hostname
    if (host.startsWith('www.')) {
      const noWww = new URL(raw)
      noWww.hostname = host.slice(4)
      set.add(noWww.href)
    } else {
      const wWww = new URL(raw)
      wWww.hostname = 'www.' + host
      set.add(wWww.href)
    }
    if (raw.endsWith('/') && raw.length > 8) set.add(raw.slice(0, -1))
  } catch { /* keep as-is */ }
  const arr = [...set]
  _variantsCache.set(raw, arr)
  return arr
}

// ─── Noise detection (B#2) ──────────────────────────────────────────────
// Cloudflare/anti-bot challenge pages and 404 pages occupy cache entries and
// waste renders with useless content. Detect them and flag the event so the
// swimlane shows a warning instead of a "successful" fetch.
// Evidence: "Just a moment..." x5, "Page not found · GitHub" x2,
// "404错误页-阿里云帮助中心" x2 in store.db queries.
const NOISE_QUERY_RE = /(just a moment|verify.*human|checking your browser|enable javascript|attention required|正在检查你的浏览器)/i
const NOISE_CONTENT_RE = /(just a moment|verify you are human|checking your browser before accessing|attention required|cf\s*browser\s*check|页面不存在|page not found|404\s*错误|not found\s*·\s*github)/i

/** Returns a noise label ('cloudflare'|'notfound'|undefined) for content text. */
function detectContentNoise(text) {
  if (typeof text !== 'string' || !text) return undefined
  if (/(just a moment|verify you are human|checking your browser|attention required|cf\s*browser\s*check)/i.test(text.slice(0, 400))) return 'cloudflare'
  if (/(page not found|页面不存在|404\s*错误页|not found\s*·)/i.test(text.slice(0, 400))) return 'notfound'
  return undefined
}

/** Returns true when a query string itself looks like noise (agent mistake). */
function isNoiseQuery(q) { return typeof q === 'string' && NOISE_QUERY_RE.test(q) }

// ─── Plugin apply ────────────────────────────────────────────────────────

export const inject = ['webServer', 'tools']
export const name = 'dsh-searchflow'

// ─── Snapshot cache ─────────────────────────────────────────────────────
// Strategy: in-memory LRU first (always available within the process), then
// read-only web-search-pro store.db (survives restarts). Intercepts
// web_snapshot calls and returns fresh cached page data instead of running
// another full Playwright render. Every successfully observed snapshot render
// auto-warms the memory cache, so even without SQLite access this works.
const SNAPSHOT_TTL_MS = 60 * 60 * 1000 // 1h, matches web-search-pro default
const MEMORY_CACHE_MAX = 200

function mkMemoryCache() {
  const map = new Map() // url -> { ts, value }
  return {
    get(url) {
      const e = map.get(url)
      if (!e) return undefined
      if (Date.now() - e.ts > SNAPSHOT_TTL_MS) { map.delete(url); return undefined }
      return e.value
    },
    set(url, value) {
      map.delete(url)
      map.set(url, { ts: Date.now(), value })
      while (map.size > MEMORY_CACHE_MAX) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
  }
}

function candidateDbPaths() {
  const home = process.env.DSH_HOME
    || process.env.USERPROFILE
    || process.env.HOME
    || ''
  return [
    process.env.DSH_SEARCHFLOW_DB,
    path.join(home, '.dsh', 'data', 'web-search-pro', 'store.db'),
  ].filter(Boolean)
}

function openSnapshotStore() {
  for (const p of candidateDbPaths()) {
    try {
      if (!fs.existsSync(p)) continue
      const db = new DatabaseSync(p, { readOnly: true })
      db.prepare('SELECT 1 FROM pages LIMIT 1').get() // sanity: pages table exists
      return { db, dbPath: p }
    } catch (e) {
      openSnapshotStore.reason = String(e?.message ?? e)
    }
  }
  return undefined
}

/** Look up a fresh cached page snapshot by URL (variant-aware).
 *  Returns undefined when stale/missing. Also reports which stored URL hit. */
function findCachedSnapshot(db, url) {
  try {
    const variants = urlVariants(url)
    const placeholders = variants.map(() => '?').join(',')
    const row = db.prepare(
      `SELECT url, title, text, html_path AS htmlPath, screenshot_path AS screenshotPath, fetched_at AS fetchedAt
       FROM pages WHERE url IN (${placeholders}) AND fetched_at > ?
       ORDER BY fetched_at DESC LIMIT 1`
    ).get(...variants, new Date(Date.now() - SNAPSHOT_TTL_MS).toISOString())
    return row ?? undefined
  } catch { return undefined }
}

/** Build a snapshot-result-shaped object from a cache entry (memory or DB). */
function snapshotFromCache(url, entry, wantScreenshot) {
  const r = { url, ...(entry.title ? { title: entry.title } : {}), text: entry.text || '' }
  if (entry.htmlPath) r.htmlPath = entry.htmlPath
  if (wantScreenshot && entry.screenshotPath) r.screenshotPath = entry.screenshotPath
  return r
}

export function apply(ctx) {
  const logger = ctx.logger?.(name)
  const log = (msg, ...args) => { if (logger) logger.info(msg, ...args); else console.log(msg, ...args) }
  const eventBus = new EventBus()

  // Snapshot cache: in-memory LRU first (always available within process),
  // web-search-pro store.db as persistent backing (survives restarts).
  const snapStore = openSnapshotStore()
  const memory = mkMemoryCache()
  if (snapStore) log(`snapshot cache store open (read-only): ${snapStore.dbPath}`)
  else log('snapshot cache store not found (' + (openSnapshotStore.reason ?? 'no candidates') + ') — memory cache only')

  // ── Top-N prefetch warm-up (B layer) ──
  // After a search, the model will most likely open/snapshot the top results.
  // Warm the memory cache for the top N http(s) result URLs so a follow-up
  // web_snapshot / browser_open on the same URL short-circuits. Soft dependency
  // on the `browser` service via ctx.get — when dsh-browser is absent this
  // silently does nothing (no inject change, no hard dependency).
  // Serialized: only one prefetch render in flight at a time, so a burst of
  // search results cannot stack transientContext launches (each costs a fresh
  // browser context) and starve the model's own browser calls.
  const PREFETCH_TOP_N = 3
  const prefetchSeen = new Map() // canonical url -> last attempt ts (debounce 60s)
  const PREFETCH_SEEN_TTL = 5 * 60 * 1000 // 5 min TTL for prefetchSeen LRU cleanup
  let prefetchBusy = false
  const prefetchQueue = []
  const tryPrefetch = (candUrl) => {
    try {
      const ck = canonicalUrl(candUrl ?? '')
      if (!ck || !/^https?:/i.test(ck)) return
      if (memory.get(ck)) return // already cached — nothing to warm
      const now = Date.now()
      const last = prefetchSeen.get(ck)
      if (last && now - last < 60_000) return // attempted recently — skip
      prefetchSeen.set(ck, now)
      prefetchQueue.push(ck)
      drainPrefetch()
    } catch { /* best-effort */ }
  }
  const drainPrefetch = async () => {
    if (prefetchBusy) return
    prefetchBusy = true
    try {
      while (prefetchQueue.length) {
        const ck = prefetchQueue.shift()
        if (memory.get(ck)) continue
        try {
          const browser = ctx.get?.('browser')
          if (!browser?.render) return // no browser service — stop queue
          const r = await browser.render(ck, [], { maxChars: 20_000 })
          if (r && r.text) {
            memory.set(ck, { title: r.title, text: r.text })
            log(`prefetch warmed memory cache: ${ck} (${r.text.length} chars)`)
          }
        } catch (e) {
          log(`prefetch failed ${ck}: ${String(e instanceof Error ? e.message : e)}`)
        }
      }
    } finally {
      prefetchBusy = false
    }
  }
  // Periodic LRU cleanup for prefetchSeen (prevents unbounded growth)
  const prefetchSeenCleanup = setInterval(() => {
    const now = Date.now()
    for (const [url, ts] of prefetchSeen.entries()) {
      if (now - ts > PREFETCH_SEEN_TTL) prefetchSeen.delete(url)
    }
  }, 60_000) // run every minute

  // ── browser_open warm dedup + concurrency control (max 2 concurrent) ──
  // MUST live at apply() scope, not inside the tools/execute callback:
  // a per-execution scope would recreate the sets on every tool call,
  // silently disabling same-URL dedup and the concurrency cap.
  const warmInflight = new Set()
  const MAX_CONCURRENT_WARM = 2
  let warmRunning = 0
  const warmQueue = []
  const runWarmQueue = () => {
    while (warmRunning < MAX_CONCURRENT_WARM && warmQueue.length) {
      const task = warmQueue.shift()
      warmRunning++
      task().finally(() => {
        warmRunning--
        runWarmQueue()
      })
    }
  }
  const scheduleWarm = (task) => {
    warmQueue.push(task)
    runWarmQueue()
  }

  // ── tools/execute observer + snapshot cache interception ──
  ctx.on('tools/execute', async (exec, next) => {
    const phase = TOOL_PHASE[exec.name]
    if (!phase) return next() // not a web-flow tool — pass through

    // NOTE: dsh-tools passes parsed args as `exec.arguments` (ToolExecutionInput),
    // NOT `exec.args`. Reading the wrong key silently yields undefined.
    const args = exec.arguments ?? exec.args ?? {}
    const callId = exec.callId ?? `call-${Date.now()}`
    const summary = summarize(exec.name, args)
    const url = primaryUrl(exec.name, args)
    const ckey = canonicalUrl(url ?? '')
    const startedAt = Date.now()

    eventBus.emit('tool:start', { tool: exec.name, callId, phase, summary, url })

    // ── web_snapshot cache interception ──
    // Avoid redundant full Playwright renders for URLs already snapshotted
    // within TTL. Lookup order: memory (canonical key) → SQLite (variant-aware).
    // Short-circuits before next().
    if (exec.name === 'web_snapshot' && ckey && !args.fresh) {
      const wantShot = args.screenshot !== false
      const mem = memory.get(ckey)
      const entry = mem ?? (snapStore ? findCachedSnapshot(snapStore.db, url) : undefined)
      if (entry) {
        const cachedValue = snapshotFromCache(url, entry, wantShot)
        eventBus.emit('tool:completed', {
          tool: exec.name, callId, phase, summary, url,
          fromCache: true, source: mem ? 'cache:memory' : 'cache:store', cacheUrl: url,
        })
        log(`snapshot cache HIT ${url} (${mem ? 'memory' : 'store'}) — skipped render (${callId})`)
        // tools/execute wrappers return a dispatch result: { value, content, isError }.
        // DSH re-runs normalizeDispatchResult(url, { value }) → createSuccessResult,
        // so a bare { value } is enough and the tool's own output.render re-renders.
        return { value: cachedValue }
      }
    }

    // ── browser_open cache interception (B layer) ──
    // Reuse the same snapshot cache: if we already have a fresh rendered page
    // (from web_snapshot or a previous browser_open), return it directly and
    // skip the full Playwright navigation + networkidle + fullPage screenshot.
    // browser_open returns {url, title, text, screenshotPath}.
    // NOTE: browser_open is the entry into the ONE persistent interactive
    // session — later browser_click/type/scroll depend on its active page
    // being navigated. A cache hit must therefore still fire the real
    // navigation in the background (fire-and-forget) so the interactive
    // session is ready when the model follows up; only the model-facing
    // wait (networkidle 8s + fullPage screenshot) is skipped.
    if (exec.name === 'browser_open' && ckey && !args.fresh) {
      const mem = memory.get(ckey)
      const entry = mem ?? (snapStore ? findCachedSnapshot(snapStore.db, url) : undefined)
      if (entry) {
        // Build browser_open-shaped result from snapshot cache entry
        const cachedValue = {
          url,
          ...(entry.title ? { title: entry.title } : {}),
          text: entry.text || '',
          ...(entry.screenshotPath ? { screenshotPath: entry.screenshotPath } : {}),
        }
        eventBus.emit('tool:completed', {
          tool: exec.name, callId, phase, summary, url,
          fromCache: true, source: mem ? 'cache:memory' : 'cache:store', cacheUrl: url,
        })
        log(`browser_open cache HIT ${url} (${mem ? 'memory' : 'store'}) — serving cached state, warming page (${callId})`)
        // Fire-and-forget the real navigation with concurrency control:
        // active page must be ready for follow-up click/type/scroll.
        // Limit to MAX_CONCURRENT_WARM concurrent warms; deduplicate same-URL warms.
        if (!warmInflight.has(ckey)) {
          warmInflight.add(ckey)
          scheduleWarm(async () => {
            try {
              const warmResult = await next()
              const wr = warmResult && typeof warmResult === 'object' ? warmResult : {}
              const wv = wr.value && typeof wr.value === 'object' ? wr.value : {}
              if (wv.text) {
                memory.set(ckey, {
                  title: wv.title ?? entry.title, text: wv.text,
                  htmlPath: wv.htmlPath, screenshotPath: wv.screenshotPath ?? entry.screenshotPath,
                })
                log(`browser_open warm: page ready + cache refreshed ${url}`)
              }
            } catch (warmErr) {
              log(`browser_open warm failed ${url}: ${String(warmErr instanceof Error ? warmErr.message : warmErr)} — click/type on this page may fail; use web_snapshot/fresh open to retry`)
            } finally {
              warmInflight.delete(ckey)
            }
          })
        } else {
          log(`browser_open warm skipped (already inflight): ${url}`)
        }
        return { value: cachedValue }
      }
    }

    // Deep mode: expand query before search, restore after. Handles both
    // web_search_pro's single-string query and web_search's queries array.
    const _origQuery = args.query
    const _origQueries = args.queries
    let _expanded = false
    if (sfDeepMode && phase === 'search' && !callId.includes('-exp')) {
      if (typeof args.query === 'string' && args.query) {
        const expanded = expandQuery(args.query)
        if (expanded !== args.query) { args.query = expanded; _expanded = true }
      } else if (Array.isArray(args.queries) && args.queries.length) {
        const expanded = args.queries.map((q) => (typeof q === 'string' && q ? expandQuery(q) : q))
        if (expanded.some((q, i) => q !== args.queries[i])) { args.queries = expanded; _expanded = true }
      }
      if (_expanded) log('deep mode: expanded query (original: ' + String(_origQuery ?? _origQueries?.[0]).slice(0, 50) + ')')
    }

    try {
      const result = await next()
      // next() resolves to a normalized dispatch result:
      //   { isError:false, value:<tool raw return>, content:[rendered blocks] }
      const r = result && typeof result === 'object' ? result : {}
      const rv = r.value && typeof r.value === 'object' ? r.value : {}

      // Warm memory cache from a freshly rendered snapshot so a second call
      // for the same URL (or a variant) within TTL short-circuits.
      // Also warm from browser_open (returns {url, title, text, screenshotPath}).
      if ((exec.name === 'web_snapshot' || exec.name === 'browser_open') && ckey && rv.text) {
        memory.set(ckey, {
          title: rv.title, text: rv.text,
          htmlPath: rv.htmlPath, screenshotPath: rv.screenshotPath,
        })
      }

      // ── Top-N prefetch trigger ──
      // After a search completes, warm the memory cache for the top result
      // URLs (the model will likely open/snapshot them next). Runs
      // fire-and-forget and is fully best-effort.
      if ((exec.name === 'web_search' || exec.name === 'web_search_pro' || exec.name === 'web_platform_search') && Array.isArray(rv.sources)) {
        const topUrls = rv.sources.slice(0, PREFETCH_TOP_N)
          .map(s => s && typeof s === 'object' ? s.url : undefined)
          .filter(Boolean)
        for (const u of topUrls) tryPrefetch(u)
      }

      // B#2: flag polluted results (Cloudflare challenge / 404 pages) so the
      // swimlane shows a warning instead of a "successful" fetch.
      const contentNoise = detectContentNoise(rv.text ?? rv.content)
      const queryNoise = isNoiseQuery(summary) ? 'noise-query' : undefined
      const noise = contentNoise ?? queryNoise

      // Search-flow enrichment (Wave 1): timing + result telemetry so the
      // client can render the phase progress bar, progressive result stream
      // and completion summary line — without any engine attribution.
      const isSearchTool = exec.name === 'web_search' || exec.name === 'web_search_pro' || exec.name === 'web_platform_search' || exec.name === 'github_issue_list'
      const searchMeta = isSearchTool && Array.isArray(rv.sources) ? (() => {
        const domains = new Set()
        const top = []
        let chars = 0
        for (const s of rv.sources) {
          if (!s || typeof s !== 'object') continue
          let host = ''
          try { host = new URL(s.url || '').hostname } catch { /* keep '' */ }
          if (host) domains.add(host)
          if (top.length < 6) {
            const snip = typeof s.snippet === 'string' ? s.snippet : ''
            chars += snip.length
            top.push({ url: s.url, ...(s.title ? { title: s.title } : {}), ...(snip ? { snippet: snip.slice(0, 140) } : {}) })
          }
        }
        return { resultCount: rv.sources.length, distinctDomains: domains.size, sourcesTop: top, charCount: chars }
      })() : undefined

      eventBus.emit('tool:completed', {
        tool: exec.name, callId, phase, summary, url,
        usedRule: rv.usedRule,
        fromCache: rv.fromCache,
        source: rv.source,
        durationMs: Date.now() - startedAt,
        ...(searchMeta ? searchMeta : {}),
        ...(noise ? { noise } : {}),
        // wiki_recall CRAG verdict — makes "checked the knowledge base first"
        // visible and transparently feeds the refill loop: a miss is the
        // signal that external web search was actually needed.
        ...(exec.name === 'wiki_recall' && rv && (rv.bucket === 'hit' || rv.bucket === 'weak' || rv.bucket === 'miss')
          ? { wikiVerdict: rv.bucket, wikiHits: Array.isArray(rv.hit) ? rv.hit.length : 0, wikiWeak: Array.isArray(rv.weak) ? rv.weak.length : 0 } : {}),
      })
      if (noise) log(`NOISE ${noise} in ${exec.name} (${callId}): ${summary.slice(0, 60)}`)
      if (_expanded) { args.query = _origQuery; args.queries = _origQueries }
      return result
    } catch (error) {
      if (_expanded) { args.query = _origQuery; args.queries = _origQueries }
      eventBus.emit('tool:error', {
        tool: exec.name, callId, phase, summary, url,
        durationMs: Date.now() - startedAt,
        error: String(error instanceof Error ? error.message : error),
      })
      throw error
    }
  })

  // ── SSE route ──
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'prefix',
      path: '/searchflow',
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://dsh')
        // 桌面端（Electron app:// 载体，零网络端口）SSE 流式响应不可用：
        // 提供 unary JSON 轮询端点，客户端以 since=id 增量拉取。
        if (url.pathname === '/searchflow/poll' && req.method === 'GET') {
          const since = Number(url.searchParams.get('since') ?? '0') || 0
          const hist = eventBus.getHistory(200)
          const events = hist.filter((e) => Number(String(e.id).slice(3)) > since)
          res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache', 'access-control-allow-origin': '*' })
          res.end(JSON.stringify({ events, latest: hist.length ? Number(String(hist[hist.length - 1].id).slice(3)) : since }))
          return
        }
        if (url.pathname === '/searchflow/deep') {
          if (req.method === 'GET') {
            res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
            res.end(JSON.stringify({ enabled: sfDeepMode }))
            return
          }
          if (req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            try {
              const data = JSON.parse(body)
              if (typeof data.enabled === 'boolean') sfDeepMode = data.enabled
            } catch {}
            res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
            res.end(JSON.stringify({ enabled: sfDeepMode }))
            return
          }
        }
        if (url.pathname !== '/searchflow/events' || req.method !== 'GET') {
          res.writeHead(404, { 'content-type': 'text/plain' })
          res.end('not found')
          return
        }
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          'access-control-allow-origin': '*',
        })
        res.flushHeaders?.()
        try { res.write(': connected\n\n') } catch {}
        const send = (evt) => { try { res.write(`data: ${JSON.stringify(evt)}\n\n`) } catch {} }
        // replay recent history
        for (const evt of eventBus.getHistory(100)) send(evt)
        const unsub = eventBus.subscribe('*', send)
        const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 25_000)
        req.on('close', () => { clearInterval(ping); unsub() })
      },
    })
    log('SSE route /searchflow/events + unary /searchflow/poll registered')
    return dispose
  }, 'searchflow: /searchflow/events SSE')

  // Cleanup prefetchSeen periodic cleanup on plugin unload
  ctx.effect(() => () => { clearInterval(prefetchSeenCleanup) }, 'searchflow: prefetchSeen cleanup')

  log('dsh-searchflow host loaded — observing web tool lifecycle')
}
