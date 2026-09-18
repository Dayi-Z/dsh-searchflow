// Regression suite:
//  B#1 snapshot cache interception (memory backfill → second call short-circuits)
//  B#3 URL variants share canonical cache key (www / non-www / trailing slash)
//  B#4 browser_open cache hit: returns cached state instantly AND still fires
//      the real navigation (next) in the background so the interactive page
//      session stays ready (fire-and-forget warm).
//  B#5 Top-N prefetch: search completion must not crash without a browser
//      service (ctx.get absent) — pure degrade.
// Uses exec.arguments + { value, content, isError } dispatch shape (dsh-tools).
import { apply } from './lib/index.js'

const listeners = {}
let calls = 0
const logs = []
const routes = []
const ctx = {
  logger: (name) => ({ info: (...a) => logs.push(a.map(String).join(' ')) }),
  on: (evt, fn) => { listeners[evt] = fn },
  effect: (fn) => { const r = fn(); return r },
  webServer: { register: (cfg) => { routes.push(cfg); return () => {} } },
  tools: { get: () => ({}) },
  // no `get` — prefetch warm-up must degrade silently (soft browser dep)
}
apply(ctx)

const tick = () => new Promise(r => setTimeout(r, 20))
const run = async (name, args, nextValue) => {
  const exec = { name, callId: `t${++calls}`, arguments: args }
  let rendered = 0
  let seenArgs = null
  const next = async () => {
    rendered++
    // Snapshot AT CALL TIME: the listener restores args after next() resolves,
    // so holding a reference would always show the restored (original) values.
    seenArgs = {
      query: args.query,
      queries: Array.isArray(args.queries) ? [...args.queries] : args.queries,
    }
    return { isError: false, value: nextValue, content: [] }
  }
  const result = await listeners['tools/execute'](exec, next)
  return { result, rendered, seenArgs }
}

// Route helpers: drive the registered /searchflow prefix handler
// (unary poll endpoint + deep-mode toggle) with mock req/res.
const callRoute = async (path, method = 'GET', body = '') => {
  const reg = routes.find(r => r.kind === 'prefix' && r.path === '/searchflow')
  if (!reg) throw new Error('searchflow route not registered')
  let payload = ''
  const res = {
    writeHead: () => {},
    end: (s) => { payload = s },
    flushHeaders: () => {},
    write: () => {},
  }
  const req = {
    url: path, method,
    [Symbol.asyncIterator]: async function* () { if (body) yield body },
  }
  await reg.handler(req, res)
  return payload
}
const poll = async (since = 0) => JSON.parse(await callRoute('/searchflow/poll?since=' + since))
const setDeep = async (enabled) => JSON.parse(await callRoute('/searchflow/deep', 'POST', JSON.stringify({ enabled })))

// B#1: same URL twice — first renders + backfills, second short-circuits
let f1 = await run('web_snapshot', { url: 'https://x.example/page', screenshot: true }, {
  url: 'https://x.example/page', title: 'X', text: 'body1', htmlPath: '/h1.html', screenshotPath: '/s1.png' })
let f2 = await run('web_snapshot', { url: 'https://x.example/page', screenshot: false }, {
  url: 'https://x.example/page', title: 'X', text: 'body2', htmlPath: '/h2.html', screenshotPath: '/s2.png' })
console.log('B#1 same-url  rendered:', f1.rendered, f2.rendered, '| cached text:', f2.result.value?.text)

// B#3: www-variant hits cache warmed under canonical key
let w1 = await run('web_snapshot', { url: 'https://www.deepseek.com/en/index.html', screenshot: true }, {
  url: 'https://www.deepseek.com/en/index.html', title: 'DSH', text: 'dsbody', htmlPath: '/h.html', screenshotPath: '/s.png' })
let w2 = await run('web_snapshot', { url: 'https://deepseek.com/en/index.html', screenshot: true }, {
  url: 'https://deepseek.com/en/index.html', title: 'DSH2', text: 'dsbody2', htmlPath: '/h2.html', screenshotPath: '/s2.png' })
console.log('B#3 www-variant rendered:', w1.rendered, w2.rendered, '| cached text:', w2.result.value?.text)

// B#3: trailing slash variant
let t1 = await run('web_snapshot', { url: 'http://127.0.0.1:3080', screenshot: true }, {
  url: 'http://127.0.0.1:3080', title: 'T', text: 'root1', htmlPath: '/h3.html', screenshotPath: '/s3.png' })
let t2 = await run('web_snapshot', { url: 'http://127.0.0.1:3080/', screenshot: true }, {
  url: 'http://127.0.0.1:3080/', title: 'T', text: 'root2', htmlPath: '/h4.html', screenshotPath: '/s4.png' })
console.log('B#3 slash-variant rendered:', t1.rendered, t2.rendered, '| cached text:', t2.result.value?.text)

// B#4: browser_open same URL — first renders + backfills, second returns cached
// state instantly (same URL as B#1, so the snapshot cache entry is reused)
let o1 = await run('browser_open', { url: 'https://x.example/page' }, {
  url: 'https://x.example/page', title: 'X-live', text: 'live-state', screenshotPath: '/live.png' })
await tick() // let the fire-and-forget warm complete + backfill
let o2 = await run('browser_open', { url: 'https://x.example/page' }, {
  url: 'https://x.example/page', title: 'X-live-2', text: 'live-state-2', screenshotPath: '/live2.png' })
await tick()
console.log('B#4 browser_open rendered:', o1.rendered, o2.rendered, '| cached text:', o2.result.value?.text, '| has url:', !!o2.result.value?.url)

// B#5: search completion with sources must not throw when ctx.get is absent
let s1 = await run('web_search_pro', { query: 'test' }, {
  sources: [{ url: 'https://p1.example', title: 'P1' }, { url: 'https://p2.example', title: 'P2' }],
  engine: 'ddg', enginesTried: ['ddg'], fromCache: false,
})
await tick()
console.log('B#5 search+prefetch-degrade rendered:', s1.rendered, '| no throw:', s1.result.isError !== true)

// B#4b: warm dedup is CROSS-call (hoisted-scope fix; per-call sets made it a no-op).
// A second cache-hit browser_open while a warm is genuinely inflight must skip
// scheduling another warm (log 'warm skipped'), then serve the warm-refreshed entry.
let d0 = await run('browser_open', { url: 'https://dedup.example/a' }, { url: 'https://dedup.example/a', title: 'D1', text: 'dedup-body', screenshotPath: '/d.png' })
let releaseWarm = null
const gate = new Promise(r => { releaseWarm = r })
const slowExec = { name: 'browser_open', callId: 't-slow', arguments: { url: 'https://dedup.example/a' } }
const slowNext = async () => { await gate; return { isError: false, value: { url: 'https://dedup.example/a', title: 'D2', text: 'dedup-live' }, content: [] } }
await listeners['tools/execute'](slowExec, slowNext) // cache hit → warm scheduled, blocked on gate
let d3 = await run('browser_open', { url: 'https://dedup.example/a' }, { url: 'https://dedup.example/a', title: 'D3', text: 'dedup-body-3' }) // hit while inflight → warm skipped
const skipped = logs.some(l => l.includes('warm skipped'))
releaseWarm()
await tick()
let d4 = await run('browser_open', { url: 'https://dedup.example/a' }, { url: 'https://dedup.example/a', title: 'D4', text: 'dedup-body-4' }) // serves warm-refreshed cache
await tick()
console.log('B#4b warm-dedup rendered:', d0.rendered, d3.rendered, d4.rendered, '| skipped:', skipped, '| d3 text:', d3.result.value?.text, '| d4 text:', d4.result.value?.text)

// B#6: deep mode expands BOTH web_search.queries (array) and web_search_pro.query
// (string), then restores the original args after the call.
await setDeep(true)
const deepArray = ['RAG evaluation']
const d1 = await run('web_search', { queries: deepArray }, { sources: [], engine: 'ddg', fromCache: false })
const d2 = await run('web_search_pro', { query: 'deepseek' }, { sources: [], engine: 'ddg', fromCache: false })
await setDeep(false)
console.log('B#6 deep-array seen:', JSON.stringify(d1.seenArgs?.queries), '| restored:', JSON.stringify(deepArray))
console.log('B#6 deep-string seen:', JSON.stringify(d2.seenArgs?.query))

// B#7: host TOOL_PHASE covers the newly added browser tools — each run must
// produce tool:start events carrying the mapped phase.
const NEW_TOOLS = [
  ['browser_hover', 'click'],
  ['browser_set_files', 'click'],
  ['browser_evaluate', 'read'],
  ['browser_crawl', 'fetch'],
  ['browser_status', 'read'],
  ['browser_automation_search', 'search'],
  ['browser_automation_develop', 'read'],
  ['browser_automation_run', 'click'],
  ['browser_opencli_catalog', 'read'],
  ['browser_opencli_run', 'read'],
  ['browser_opencli_status', 'read'],
]
for (const [tool] of NEW_TOOLS) {
  const ev = await run(tool, {}, { text: 'ok' })
  if (ev.result.isError) throw new Error(tool + ' errored unexpectedly')
}
await tick()
const { events: allEvents } = await poll(0)
const starts = allEvents.filter(e => e.type === 'tool:start')
const phasesOk = NEW_TOOLS.every(([tool, ph]) => starts.some(e => e.data.tool === tool && e.data.phase === ph))
console.log('B#7 phase coverage:', phasesOk, '| start events:', starts.length)

// B#8: wiki_*/mcp_* tools are covered by TOOL_PHASE, and wiki_recall's
//      CRAG verdict (hit/weak/miss) is attached to the completed event.
const WIKI_MCP_TOOLS = [
  ['wiki_recall', 'search'],
  ['wiki_acquire', 'fetch'],
  ['wiki_harvest', 'read'],
  ['wiki_learn', 'read'],
  ['wiki_commit', 'read'],
  ['wiki_review', 'read'],
  ['wiki_lint', 'read'],
  ['wiki_merge', 'read'],
  ['wiki_sessions', 'read'],
  ['wiki_struggle', 'read'],
  ['mcp_search', 'search'],
  ['mcp_call', 'read'],
]
for (const [tool] of WIKI_MCP_TOOLS) {
  const ev = await run(tool, {}, { text: 'ok' })
  if (ev.result.isError) throw new Error(tool + ' errored unexpectedly')
}
const rMiss = await run('wiki_recall', { query: 'ragas 文档在哪' }, { bucket: 'miss', bestScore: 0.12, hit: [], weak: [], totalRecallable: 40 })
const rHit = await run('wiki_recall', { query: 'searchflow 并发' }, { bucket: 'hit', bestScore: 0.9, hit: [{ id: 'kp-1', title: 'x' }], weak: [{ id: 'kp-2', title: 'y' }], totalRecallable: 40 })
await tick()
const { events: ev8 } = await poll(0)
const starts8 = ev8.filter(e => e.type === 'tool:start')
const wikiPhasesOk = WIKI_MCP_TOOLS.every(([tool, ph]) => starts8.some(e => e.data.tool === tool && e.data.phase === ph))
const comps8 = ev8.filter(e => e.type === 'tool:completed' && e.data.tool === 'wiki_recall')
const missEv = comps8.find(e => e.data.wikiVerdict === 'miss')
const hitEv = comps8.find(e => e.data.wikiVerdict === 'hit')
console.log('B#8 wiki/mcp phase coverage:', wikiPhasesOk, '| miss:', !!missEv, '| hit + wikiHits:', hitEv?.data.wikiHits, '| wikiWeak:', hitEv?.data.wikiWeak)

const ok = f1.rendered === 1 && f2.rendered === 0 && f2.result.value?.text === 'body1'
  && w1.rendered === 1 && w2.rendered === 0 && w2.result.value?.text === 'dsbody'
  && t1.rendered === 1 && t2.rendered === 0 && t2.result.value?.text === 'root1'
  // o1 hits the t1 snapshot cache entry (text 'body1'); its background warm
  // then refreshes the cache with the LIVE navigation state ('live-state'),
  // so o2 serves the warm-refreshed entry — both still fire next() so the
  // interactive page session stays ready for click/type/scroll.
  && o1.rendered === 1 && o1.result.value?.text === 'body1'
  && o2.rendered === 1 && o2.result.value?.text === 'live-state' // warm-refreshed
  && o2.result.value?.url === 'https://x.example/page'
  && s1.rendered === 1 && s1.result.isError !== true
  // B#4b warm dedup (hoisted scope). d4 is a cache hit that schedules a NEW
  // warm — its background warm calls next() once (rendered 1), and d4's cached
  // value is the warm-refreshed 'dedup-live' text.
  && d0.rendered === 1 && d3.rendered === 0 && d3.result.value?.text === 'dedup-body'
  && skipped === true
  && d4.rendered === 1 && d4.result.value?.text === 'dedup-live'
  // B#6 deep mode: array + string expansion, args restored
  && d1.seenArgs?.queries?.[0] === 'RAG evaluation 最佳实践 综述'
  && deepArray[0] === 'RAG evaluation'
  && d2.seenArgs?.query === 'deepseek 最佳实践 综述'
  // B#7 new tool phase coverage
  && phasesOk === true
  // B#8 wiki/mcp phase coverage + wiki_recall CRAG verdict telemetry
  && wikiPhasesOk === true
  && missEv !== undefined && hitEv !== undefined && hitEv.data.wikiHits === 1 && hitEv.data.wikiWeak === 1
console.log(ok ? '✓ B#1+B#3+B#4+B#5+B#4b+B#6+B#7+B#8 VERIFIED (backfill, variants, warm refresh, prefetch degrade, cross-call warm dedup, deep array/string, tool phase coverage, wiki/mcp coverage + CRAG verdict)' : '✗ FAIL')
process.exit(ok ? 0 : 1)