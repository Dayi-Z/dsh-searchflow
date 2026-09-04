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
const ctx = {
  logger: (name) => ({ info: (...a) => console.log('[log]', ...a) }),
  on: (evt, fn) => { listeners[evt] = fn },
  effect: (fn) => { const r = fn(); return r },
  webServer: { register: () => () => {} },
  tools: { get: () => ({}) },
  // no `get` — prefetch warm-up must degrade silently (soft browser dep)
}
apply(ctx)

const tick = () => new Promise(r => setTimeout(r, 20))
const run = async (name, args, nextValue) => {
  const exec = { name, callId: `t${++calls}`, arguments: args }
  let rendered = 0
  const next = async () => { rendered++; return { isError: false, value: nextValue, content: [] } }
  const result = await listeners['tools/execute'](exec, next)
  return { result, rendered }
}

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
console.log(ok ? '✓ B#1+B#3+B#4+B#5 VERIFIED (backfill, variants, browser_open warm refresh, prefetch degrade)' : '✗ FAIL')
process.exit(ok ? 0 : 1)