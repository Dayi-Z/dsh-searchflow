// Wave 1 regression: host event enrichment (durationMs / result telemetry)
// + client SearchFlow Card task store (phase transitions, progressive stream,
// cross-domain stats) — verified end-to-end through the /searchflow/poll
// unary endpoint and the __SF_DEBUG__ observability seam.
import { apply as applyHost } from './lib/index.js'

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))
let failures = 0
const check = (name, cond, extra) => {
  console.log((cond ? '✓' : '✗ FAIL') + ' ' + name + (extra !== undefined ? ' | ' + String(extra) : ''))
  if (!cond) failures++
}

// ═══ 1) Host: search completed event carries Wave-1 telemetry ═══
let routeHandler = null
const hostCtx = {
  logger: (name) => ({ info: (...a) => console.log('[host]', ...a) }),
  on: (evt, fn) => { hostCtx.listeners = hostCtx.listeners || {}; hostCtx.listeners[evt] = fn },
  effect: (fn) => { const r = fn(); return r },
  webServer: { register: (cfg) => { routeHandler = cfg.handler; return () => {} } },
}
applyHost(hostCtx)

const exec = { name: 'web_search_pro', callId: 'wave1-host', arguments: { query: 'test query' } }
const next = async () => ({ isError: false, value: {
  sources: [
    { url: 'https://a.example/1', title: 'A', snippet: 'x'.repeat(300) },
    { url: 'https://a.example/2', title: 'B', snippet: 'short' },
    { url: 'https://b.example/3', title: 'C' },
  ],
  engine: 'ddg', enginesTried: ['ddg'], fromCache: false,
}, content: [] })
await hostCtx.listeners['tools/execute'](exec, next)
await tick()

let pollEvents = []
await routeHandler({ url: '/searchflow/poll?since=0', method: 'GET' }, { writeHead: () => {}, end: (s) => { pollEvents = JSON.parse(s).events } })
const completed = pollEvents.find((e) => e.type === 'tool:completed' && e.data.tool === 'web_search_pro')
const started = pollEvents.find((e) => e.type === 'tool:start' && e.data.tool === 'web_search_pro')
check('host: start event emitted', !!started)
check('host: completed event carries durationMs', completed && typeof completed.data.durationMs === 'number' && completed.data.durationMs >= 0)
check('host: resultCount=3', completed && completed.data.resultCount === 3)
check('host: distinctDomains=2', completed && completed.data.distinctDomains === 2)
check('host: sourcesTop length 3', completed && Array.isArray(completed.data.sourcesTop) && completed.data.sourcesTop.length === 3)
check('host: snippet truncated ≤140', completed && completed.data.sourcesTop[0].snippet.length <= 140)
check('host: charCount = snippet chars (300+5)', completed && completed.data.charCount === 305)

// ═══ 2) Client: SearchFlow Card task store (stubbed browser env) ═══
let lastRendered = null
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useReducer: () => [0, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useState: () => [null, () => {}],
}
const requireStub = (id) => {
  if (id === 'react') return reactStub
  if (id === 'react-dom/client') return { createRoot: () => ({ render: (el) => { lastRendered = el }, unmount() {} }) }
  throw new Error('unexpected require: ' + id)
}
globalThis.window = {
  __ModuleLoader__: { load: (cfg) => { globalThis.__SF_EXPORTS__ = cfg.factory(requireStub); return globalThis.__SF_EXPORTS__; } },
  __SF_DEBUG__: {},
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
}
globalThis.location = { protocol: 'app:' }
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {} } }),
  documentElement: { appendChild() {} },
  body: { appendChild() {} },
  head: { appendChild() {} },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
}
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16)
globalThis.cancelAnimationFrame = () => {}
globalThis.MutationObserver = class { constructor() {} observe() {} disconnect() {} }
let fetchQueue = []
globalThis.fetch = async () => ({ ok: true, json: async () => {
  const events = fetchQueue.shift() || []
  const latest = events.length ? Number(String(events[events.length - 1].id).slice(3)) : 0
  return { events, latest }
} })

await import('./lib/client.js?wave1=' + Date.now())
const clientMod = globalThis.__SF_EXPORTS__
check('client: module exports apply', typeof clientMod.apply === 'function')

fetchQueue = [[
  { id: 'sf-1', type: 'tool:start', data: { tool: 'web_search_pro', phase: 'search', summary: 'q1', url: '' } },
  { id: 'sf-2', type: 'tool:completed', data: { tool: 'web_search_pro', phase: 'search', summary: 'q1', url: '', durationMs: 1200, resultCount: 3, distinctDomains: 2, charCount: 200, sourcesTop: [
    { url: 'https://a.example/1', title: 'A', snippet: 's1' },
    { url: 'https://a.example/2', title: 'B', snippet: 's2' },
    { url: 'https://b.example/3', title: 'C', snippet: 's3' },
  ], fromCache: false } },
  { id: 'sf-3', type: 'tool:start', data: { tool: 'web_search_pro', phase: 'search', summary: 'q2', url: '' } },
  { id: 'sf-4', type: 'tool:completed', data: { tool: 'web_search_pro', phase: 'search', summary: 'q2', url: '', durationMs: 900, resultCount: 2, distinctDomains: 2, charCount: 200, sourcesTop: [
    { url: 'https://a.example/1', title: 'A-2', snippet: 's4' },
    { url: 'https://c.example/4', title: 'D', snippet: 's5' },
  ], fromCache: false } },
]]
clientMod.apply({ effect: () => {} })
await tick(80)
const task = window.__SF_DEBUG__.task
check('client: task created', !!task)
check('client: searchCount=2 (cross-validation needs ≥2)', task && task.searchCount === 2)
check('client: results streamed=5', task && task.results.length === 5)
check('client: distinct domains=3', task && task.domains.size === 3)
check('client: validated domain tracked (a.example seen twice)', task && task.validatedDomains.has('a.example'))
check('client: charCount=400', task && task.charCount === 400)
check('client: phase=search while working', task && task.phase === 'search')

// render smoke: component body executes without throwing (full card path)
let cardTree = null
let threw = null
try { cardTree = lastRendered && lastRendered.type(); } catch (e) { threw = e && e.message }
check('client: card component renders (search phase)', !!cardTree && !threw, threw)
const flatten = (n, out) => {
  if (Array.isArray(n)) { for (const c of n) flatten(c, out); return out }
  if (!n || typeof n !== 'object') { out.push(String(n)); return out }
  out.push(typeof n.type === 'string' ? n.type : 'comp')
  if (n.props && n.props.label) out.push(String(n.props.label))
  if (n.props && n.props.title) out.push(n.props.title)
  if (n.children) { const cs = Array.isArray(n.children) ? n.children : [n.children]; for (const c of cs) flatten(c, out) }
  return out
}
const cardText = flatten(cardTree, []).join(' ')
check('client: card shows 搜索中/阅读中/撰写中 segments', ['搜索中', '阅读中', '撰写中'].every((t) => cardText.includes(t)), cardText.slice(0, 80))
check('client: live timer shows 进行中 while working', cardText.includes('进行中'))

// write timer: no more events for WRITE_IDLE_MS (3.5s) → 撰写中
await tick(3900)
check('client: phase=writing after idle', window.__SF_DEBUG__.task && window.__SF_DEBUG__.task.phase === 'writing')

// render smoke: summary line path (writing phase)
let sumTree = null
let sumThrew = null
try { sumTree = lastRendered && lastRendered.type(); } catch (e) { sumThrew = e && e.message }
const sumText = flatten(sumTree, []).join(' ')
check('client: card renders with summary chips (writing)', !!sumTree && !sumThrew && sumText.includes('总耗时') && sumText.includes('来源') && sumText.includes('验证') && sumText.includes('≈'), sumText.slice(0, 140))
check('client: elapsed time frozen after writing (no 进行中)', !!sumTree && sumText.includes('总耗时') && !sumText.includes('进行中'))
check('client: doneAt recorded + finalMs frozen', window.__SF_DEBUG__.task && typeof window.__SF_DEBUG__.task.doneAt === 'number' && window.__SF_DEBUG__.task.doneAt >= window.__SF_DEBUG__.task.startedAt)


// ═══ 3) Deep mode: endpoint + query expansion ═══
// Mock POST request body (async iterable for for-await-of)
function mockPost(body) {
  const data = Buffer.from(JSON.stringify(body))
  return { [Symbol.asyncIterator]: async function*() { yield data } }
}
function mockRes() {
  let payload = null
  return {
    writeHead: () => {},
    end: (s) => { try { payload = JSON.parse(s) } catch {} },
    get payload() { return payload }
  }
}

// 3a) GET returns false (default off)
let dr = mockRes()
await routeHandler({ url: '/searchflow/deep', method: 'GET' }, dr)
check('deep: default is off', dr.payload && dr.payload.enabled === false)

// 3b) POST enables deep mode
dr = mockRes()
await routeHandler({ url: '/searchflow/deep', method: 'POST', ...mockPost({ enabled: true }) }, dr)
check('deep: POST enables', dr.payload && dr.payload.enabled === true)

// 3c) GET confirms ON
dr = mockRes()
await routeHandler({ url: '/searchflow/deep', method: 'GET' }, dr)
check('deep: GET confirms ON', dr.payload && dr.payload.enabled === true)

// 3d) CJK-only query gets expanded
let capturedQ = null
const cjkExec = { name: 'web_search_pro', callId: 'deep-cjk', arguments: { query: 'RAG 评估方法' } }
await hostCtx.listeners['tools/execute'](cjkExec, async () => { capturedQ = cjkExec.arguments.query; return { isError: false, value: { sources: [] }, content: [] } })
check('deep: CJK query expanded (contains overview)', capturedQ && capturedQ.includes('overview survey'), capturedQ)

// 3e) Latin-only query gets expanded
const latExec = { name: 'web_search_pro', callId: 'deep-lat', arguments: { query: 'RAG evaluation best practices' } }
await hostCtx.listeners['tools/execute'](latExec, async () => { capturedQ = latExec.arguments.query; return { isError: false, value: { sources: [] }, content: [] } })
check('deep: Latin query expanded (contains Chinese)', capturedQ && capturedQ.includes('\u6700\u4f73\u5b9e\u8df5'), capturedQ)

// 3f) Mixed query NOT expanded
const mixExec = { name: 'web_search_pro', callId: 'deep-mix', arguments: { query: 'RAG 评估 evaluation' } }
await hostCtx.listeners['tools/execute'](mixExec, async () => { capturedQ = mixExec.arguments.query; return { isError: false, value: { sources: [] }, content: [] } })
check('deep: Mixed query (CJK+Latin) expanded', capturedQ && capturedQ.includes('overview survey'), capturedQ)

// 3g) Query restored after handler
check('deep: original query restored after handler', cjkExec.arguments.query === 'RAG 评估方法', cjkExec.arguments.query)

// 3h) Start event has original query (not expanded)
dr = mockRes()
await routeHandler({ url: '/searchflow/poll?since=0', method: 'GET' }, dr)
const deepStart = dr.payload.events.find(e => e.type === 'tool:start' && e.data.callId === 'deep-cjk')
check('deep: start event summary = original query', deepStart && deepStart.data.summary === 'RAG 评估方法', deepStart && deepStart.data.summary)

// 3i) Toggle off → no expansion
dr = mockRes()
await routeHandler({ url: '/searchflow/deep', method: 'POST', ...mockPost({ enabled: false }) }, dr)
const offExec = { name: 'web_search_pro', callId: 'deep-off', arguments: { query: 'RAG 评估方法' } }
await hostCtx.listeners['tools/execute'](offExec, async () => { capturedQ = offExec.arguments.query; return { isError: false, value: { sources: [] }, content: [] } })
check('deep: OFF → no expansion', capturedQ === 'RAG 评估方法', capturedQ)


console.log(failures === 0 ? '\nALL WAVE-1 CHECKS PASSED' : '\n' + failures + ' CHECKS FAILED')
process.exit(failures === 0 ? 0 : 1)
