// Regression suite:
//  B#1 snapshot cache interception (memory backfill → second call short-circuits)
//  B#3 URL variants share canonical cache key (www / non-www / trailing slash)
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
}
apply(ctx)

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

const ok = f1.rendered === 1 && f2.rendered === 0 && f2.result.value?.text === 'body1'
  && w1.rendered === 1 && w2.rendered === 0 && w2.result.value?.text === 'dsbody'
  && t1.rendered === 1 && t2.rendered === 0 && t2.result.value?.text === 'root1'
console.log(ok ? '✓ B#1 + B#3 VERIFIED (backfill, www/non-www, trailing slash)' : '✗ FAIL')
process.exit(ok ? 0 : 1)