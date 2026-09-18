
/**
 * dsh-searchflow — better-sidebar 集成回归测试。
 *
 * 在真实 DOM（jsdom）里用真实 React 18 装载 lib/client.js，跑遍四条宿主路径：
 *   A  better-sidebar 在场          → 注册页签，不挂浮动卡片
 *   B  better-sidebar 不在场        → 浮动卡片；随后迟到接入 → 换页签并撤卡片
 *   C  localStorage['sf.host']=dock → 手动钉住独立形态（覆盖自动探测）
 *   D  dock 形态 + 真实任务          → 浮动卡片行为与改造前一致（含收起胶囊）
 *   E  连续多次检索                  → 上一轮被归档成"检索记录"悬挂，而非被覆盖
 *   F  dock 形态连续检索             → 浮动卡片不长出记录区
 *
 * jsdom / react / react-dom **不是**本包的依赖（本包无构建步骤、无运行时依赖），
 * 因此这里从 DSH 应用运行时解析；解析不到就 SKIP 而不是失败，
 * node test-sidebar-tab.mjs 在任何地方都仍可直跑。
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('./lib/client.js', import.meta.url));

function resolveHarness() {
  const bases = [
    fileURLToPath(new URL('./package.json', import.meta.url)),
    // DSH 桌面端应用包自带 jsdom + react（它的客户端运行时要用）。
    'D:\\Harness\\dsh-desktop\\DSH Desktop\\resources\\app\\package.json',
  ];
  for (const base of bases) {
    try {
      const r = createRequire(base);
      return { JSDOM: r('jsdom').JSDOM, React: r('react'), ReactDOMClient: r('react-dom/client'), ReactDOM: r('react-dom') };
    } catch { /* 换下一个基准目录 */ }
  }
  return null;
}

const harness = resolveHarness();
if (!harness) {
  console.log('SKIP — jsdom / react / react-dom 在本机解析不到');
  console.log('       （本包无运行时依赖；请在装有 DSH 应用运行时的机器上跑）');
  process.exit(0);
}
const { JSDOM, React, ReactDOMClient, ReactDOM } = harness;

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra });
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra && !cond ? '  → ' + extra : ''));
}

async function boot({ withSidebar }) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost:43129/', pretendToBeVisual: true });
  const w = dom.window;
  for (const k of ['window','document','navigator','MutationObserver','HTMLElement','Element','Node','Event','CustomEvent','getComputedStyle','location','SVGElement']) {
    try { globalThis[k] = w[k]; }
    catch { try { Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true }); } catch {} }
  }
  globalThis.window = w;
  globalThis.localStorage = w.localStorage;
  globalThis.requestAnimationFrame = w.requestAnimationFrame ? w.requestAnimationFrame.bind(w) : (fn) => setTimeout(() => fn(Date.now()), 0);
  globalThis.cancelAnimationFrame = w.cancelAnimationFrame ? w.cancelAnimationFrame.bind(w) : clearTimeout;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = w.matchMedia;
  const esInstances = [];
  globalThis.EventSource = class { constructor(url) { this.url = url; this.readyState = 1; esInstances.push(this); } addEventListener() {} close() { this.readyState = 2; } };
  w.EventSource = globalThis.EventSource;
  globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ enabled: false }), text: () => Promise.resolve('') });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const src = readFileSync(SRC, 'utf8');
  let def = null;
  w.__ModuleLoader__ = { load: (d) => { def = d; } };
  new Function('window', src)(w);

  const mod = def.factory((name) => {
    if (name === 'react') return React;
    if (name === 'react-dom') return ReactDOM;
    throw new Error('unexpected require: ' + name);
  });

  const tabs = new Map();
  const registered = [];
  const service = {
    version: '0.19.1',
    registerTab(d) { registered.push(d); tabs.set(d.id, d); return () => { tabs.delete(d.id); }; },
    getTab(id) { return tabs.get(id); },
  };
  const injectRegs = [];
  const ctx = {
    get: (n) => (withSidebar && n === 'betterSidebar' ? service : undefined),
    inject: (deps, cb) => { injectRegs.push({ deps, cb }); },
    effect: () => {},
    logger: () => ({ info() {}, error() {} }),
  };

  new Function('window', src)(w);          // fresh definition per boot
  const mod2 = def.factory((name) => (name === 'react' ? React : (name === 'react-dom' ? ReactDOM : ReactDOMClient)));
  mod2.apply(ctx);
  await new Promise((r) => setTimeout(r, 50));

  return { dom, doc: w.document, mod: mod2, service, registered, injectRegs, tabs, esInstances, ctx, w };
}

function feed(es, evt) { es.onmessage({ data: JSON.stringify(evt) }); }

// ── Case A: better-sidebar present ──────────────────────────────────────────
{
  const b = await boot({ withSidebar: true });
  const d = b.doc;
  check('A1 host marked tab', d.body.dataset.sfHost === 'tab', 'saw ' + d.body.dataset.sfHost);
  check('A2 exactly one tab registered', b.registered.length === 1, 'n=' + b.registered.length);
  const desc = b.registered[0];
  check('A3 tab id namespaced', desc && desc.id === 'searchflow:panel', desc && desc.id);
  check('A4 single-instance', desc.single === true);
  check('A5 component/icon/badge/description present', typeof desc.component === 'function' && typeof desc.icon === 'function' && typeof desc.badge === 'function' && typeof desc.description === 'string');
  check('A6 no floating card mounted', d.getElementById('sf-card-mount') === null);
  check('A7 tab is discoverable via getTab', b.service.getTab('searchflow:panel') === desc);
  check('A8 inline icon farm still mounted (ambient layer intact)', d.getElementById('sf-iconfarm') !== null);

  // render the tab: empty state
  const host = d.createElement('div');
  d.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(desc.component({ visible: true })); });
  const txt0 = host.textContent || '';
  check('A9 tab renders empty state (not blank)', txt0.includes('还没有搜索流程'), JSON.stringify(txt0.slice(0, 60)));
  const card0 = host.querySelector('[data-sf-card]');
  check('A10 tab variant marked', card0 && card0.getAttribute('data-sf-variant') === 'tab', card0 && card0.getAttribute('data-sf-variant'));
  check('A11 tab root is not float-positioned', card0 && card0.style.position !== 'fixed', card0 && card0.style.position);

  // drive a real search flow through the SSE path
  const es = b.esInstances[0];
  check('A12 SSE connected to /searchflow/events', es && es.url === '/searchflow/events', es && es.url);
  await React.act(async () => {
    feed(es, { id: 'e1', type: 'tool:start', data: { tool: 'web_search_pro', phase: 'search', callId: 'c1', summary: 'q' } });
    feed(es, { id: 'e2', type: 'tool:completed', data: { tool: 'web_search_pro', phase: 'search', callId: 'c1', durationMs: 1200, resultCount: 3, charCount: 600,
      sourcesTop: [{ url: 'https://a.example/x', title: 'Alpha', snippet: 'a' }, { url: 'https://b.example/y', title: 'Beta', snippet: 'b' }] } });
  });
  await React.act(async () => { root.render(desc.component({ visible: true })); });
  const t1 = host.textContent || '';
  check('A13 live tab shows phase rail', t1.includes('搜索中') && t1.includes('阅读中') && t1.includes('撰写中'), JSON.stringify(t1.slice(0, 90)));
  check('A14 live tab lists results', t1.includes('Alpha') && t1.includes('Beta'), JSON.stringify(t1.slice(0, 140)));
  check('A15 badge reports live count', Number(desc.badge()) >= 1, String(desc.badge()));
  const resultsBox = host.querySelector('[data-sf-card] > div:nth-of-type(3)');
  check('A16 results area flexes instead of 150px cap', resultsBox ? (resultsBox.style.maxHeight === '' || resultsBox.style.maxHeight === 'none') : true, resultsBox && resultsBox.style.maxHeight);

  await React.act(async () => { root.unmount(); });
}

// ── Case B: better-sidebar absent, then arriving late ───────────────────────
{
  const b = await boot({ withSidebar: false });
  const d = b.doc;
  check('B1 host marked dock', d.body.dataset.sfHost === 'dock', 'saw ' + d.body.dataset.sfHost);
  check('B2 no tab registered yet', b.registered.length === 0);
  check('B3 floating card mounted', d.getElementById('sf-card-mount') !== null);
  check('B4 late-adoption inject registered', b.injectRegs.length === 1 && b.injectRegs[0].deps[0] === 'betterSidebar', JSON.stringify(b.injectRegs.map(r => r.deps)));

  const scope = { get: (n) => (n === 'betterSidebar' ? b.service : undefined) };
  b.injectRegs[0].cb(scope);
  await new Promise((r) => setTimeout(r, 30));
  check('B5 late sidebar adopt switches to tab', b.registered.length === 1 && b.service.getTab('searchflow:panel') !== undefined);
  check('B6 late adopt marks tab-late', d.body.dataset.sfHost === 'tab-late', d.body.dataset.sfHost);
  check('B7 late adopt removes the floating card', d.getElementById('sf-card-mount') === null);
}

// ── Case C: manual override pins the dock even when better-sidebar exists ───
{
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost:43129/', pretendToBeVisual: true });
  const w = dom.window;
  for (const k of ['window','document','navigator','MutationObserver','HTMLElement','Element','Node','Event','CustomEvent','getComputedStyle','location','SVGElement']) {
    try { globalThis[k] = w[k]; }
    catch { try { Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true }); } catch {} }
  }
  globalThis.window = w;
  globalThis.localStorage = w.localStorage;
  w.localStorage.setItem('sf.host', 'dock');
  globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
  globalThis.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = w.matchMedia;
  globalThis.EventSource = class { constructor() { this.readyState = 1; } addEventListener() {} close() {} };
  globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  let def = null;
  w.__ModuleLoader__ = { load: (x) => { def = x; } };
  const src = readFileSync(SRC, 'utf8');
  new Function('window', src)(w);
  const mod = def.factory((n) => (n === 'react' ? React : (n === 'react-dom' ? ReactDOM : ReactDOMClient)));
  const registered = [];
  const service = { registerTab(d) { registered.push(d); return () => {}; }, getTab: () => undefined };
  mod.apply({ get: (n) => (n === 'betterSidebar' ? service : undefined), inject: () => {}, effect: () => {}, logger: () => ({ info() {}, error() {} }) });
  await new Promise((r) => setTimeout(r, 40));
  check('C1 sf.host=dock pins the floating card', w.document.body.dataset.sfHost === 'dock', w.document.body.dataset.sfHost);
  check('C2 pinned dock registers no tab', registered.length === 0);
  check('C3 pinned dock keeps the card', w.document.getElementById('sf-card-mount') !== null);
}

// ── Case D: dock mode drives a task — the floating card must be unchanged ───
{
  const b = await boot({ withSidebar: false });
  const d = b.doc;
  const es = b.esInstances[0];
  await React.act(async () => {
    feed(es, { id: 'e1', type: 'tool:start', data: { tool: 'web_search', phase: 'search', callId: 'c1' } });
    feed(es, { id: 'e2', type: 'tool:completed', data: { tool: 'web_search', phase: 'search', callId: 'c1', durationMs: 900, resultCount: 2, charCount: 400,
      sourcesTop: [{ url: 'https://a.example/x', title: 'Alpha', snippet: 'a' }] } });
  });
  await new Promise((r) => setTimeout(r, 60));
  const mount = d.getElementById('sf-card-mount');
  const card = mount && mount.querySelector('[data-sf-card]');
  check('D1 card renders in dock mode', !!card);
  check('D2 card variant tagged', card && card.getAttribute('data-sf-variant') === 'card', card && card.getAttribute('data-sf-variant'));
  check('D3 card keeps fixed positioning', card && card.style.position === 'fixed', card && card.style.position);
  check('D4 card keeps 368px width', card && card.style.width === '368px', card && card.style.width);
  check('D5 card keeps results + summary', !!card && (card.textContent || '').includes('Alpha') && (card.textContent || '').includes('搜索流程'), (card && card.textContent || '').slice(0, 80));
  const closeBtn = Array.from(card.querySelectorAll('button')).find((x) => x.getAttribute('aria-label') === '收起');
  check('D6 card still offers the collapse button', !!closeBtn);
  await React.act(async () => { closeBtn.dispatchEvent(new b.w.MouseEvent('click', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 40));
  // the collapsed pill is marked by role, not data-sf-card (unchanged markup)
  const pill = mount.querySelector('[role="button"]');
  check('D7 collapse still yields the pill', !!pill && (pill.textContent || '').includes('搜索流程'), pill && pill.textContent);
}

// ── Case E: completed searches HANG as records instead of being replaced ────
{
  const realNow = Date.now;
  let clockMs = realNow();
  Date.now = () => clockMs;
  const advance = (ms) => { clockMs += ms; };

  const b = await boot({ withSidebar: true });
  const d = b.doc;
  const es = b.esInstances[0];
  const desc = b.registered[0];
  const host = d.createElement('div');
  d.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);

  const search = async (id, query, urls) => {
    await React.act(async () => {
      feed(es, { id: id + '-a', type: 'tool:start', data: { tool: 'web_search_pro', phase: 'search', callId: id, summary: query } });
      feed(es, { id: id + '-b', type: 'tool:completed', data: { tool: 'web_search_pro', phase: 'search', callId: id, durationMs: 800, resultCount: urls.length, charCount: 200,
        sourcesTop: urls.map((u) => ({ url: u, title: u.replace('https://', '') })) } });
    });
  };

  await search('c1', '第一个查询', ['https://a.example/1', 'https://b.example/1']);
  await React.act(async () => { root.render(desc.component({ visible: true })); });
  check('E1 first search archives nothing yet', (b.w.__SF_DEBUG__.history || []).length === 0, 'n=' + (b.w.__SF_DEBUG__.history || []).length);

  advance(31000);                       // > TASK_IDLE_MS: the next search starts a new task
  await search('c2', '第二个查询', ['https://c.example/1']);
  await React.act(async () => { root.render(desc.component({ visible: true })); });

  const hist = b.w.__SF_DEBUG__.history;
  check('E2 the previous search is archived, not replaced', hist.length === 1, 'n=' + hist.length);
  check('E3 the record keeps the query it searched', !!hist[0] && hist[0].queries[0] === '第一个查询', JSON.stringify(hist[0] && hist[0].queries));
  check('E4 the record keeps its results', !!hist[0] && hist[0].results.length === 2, hist[0] && hist[0].results.length);

  const txt = host.textContent || '';
  check('E5 the hanging record is rendered', txt.includes('第一个查询'), JSON.stringify(txt.slice(0, 100)));
  check('E6 the live panel still shows the current search', txt.includes('c.example'), JSON.stringify(txt.slice(0, 140)));
  check('E7 a history section exists in the tab', host.querySelector('[data-sf-history]') !== null);

  const rowBtn = host.querySelector('[data-sf-history] button');
  await React.act(async () => { rowBtn.dispatchEvent(new b.w.MouseEvent('click', { bubbles: true })); });
  const expanded = host.textContent || '';
  check('E8 expanding a record reveals its own results', expanded.includes('a.example') && expanded.includes('b.example'), JSON.stringify(expanded.slice(0, 160)));

  for (let i = 0; i < 24; i++) { advance(31000); await search('x' + i, 'q' + i, ['https://z' + i + '.example/1']); }
  check('E9 history is capped at SF_HISTORY_MAX (20)', b.w.__SF_DEBUG__.history.length === 20, 'n=' + b.w.__SF_DEBUG__.history.length);

  // a task that never searched must not become a record
  advance(31000);
  await React.act(async () => { feed(es, { id: 'n1', type: 'tool:start', data: { tool: 'browser_open', phase: 'click', callId: 'n1' } }); });
  advance(31000);
  await search('n2', '只带查询', ['https://q.example/1']);
  // the browser_open-only task must not have taken a slot: the newest record is
  // still the last real search from the loop ('q23'), and the count is unchanged.
  const lastRec = b.w.__SF_DEBUG__.history[0];
  check('E10 a search-less task is not archived as a record',
    b.w.__SF_DEBUG__.history.length === 20 && !!lastRec && lastRec.queries[0] === 'q23',
    'n=' + b.w.__SF_DEBUG__.history.length + ' newest=' + JSON.stringify(lastRec && lastRec.queries));

  await React.act(async () => { root.unmount(); });
  Date.now = realNow;
}

// ── Case F: the floating card never grows a history section ─────────────────
{
  const realNow = Date.now;
  let clockMs = realNow();
  Date.now = () => clockMs;
  const b = await boot({ withSidebar: false });
  const d = b.doc;
  const es = b.esInstances[0];
  const two = async (id, query, url) => React.act(async () => {
    feed(es, { id: id + 'a', type: 'tool:start', data: { tool: 'web_search', phase: 'search', callId: id, summary: query } });
    feed(es, { id: id + 'b', type: 'tool:completed', data: { tool: 'web_search', phase: 'search', callId: id, durationMs: 300, resultCount: 1, charCount: 50, sourcesTop: [{ url, title: 'T' }] } });
  });
  await two('f1', '卡片里的第一次', 'https://card.example/1');
  clockMs += 31000;
  await two('f2', '卡片里的第二次', 'https://card2.example/1');
  await new Promise((r) => setTimeout(r, 80));
  check('F1 the card still archives into the shared record list', b.w.__SF_DEBUG__.history.length === 1, 'n=' + b.w.__SF_DEBUG__.history.length);
  check('F2 the card renders no history section', d.querySelector('[data-sf-history]') === null);
  check('F3 the card is still the card', d.querySelector('[data-sf-card][data-sf-variant="card"]') !== null);
  Date.now = realNow;
}

// ── Case G: what counts as a search, and records across a session switch ─────
{
  const b = await boot({ withSidebar: true });
  const d = b.doc;
  const es = b.esInstances[0];
  const desc = b.registered[0];
  const host = d.createElement('div');
  d.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const render = () => React.act(async () => { root.render(desc.component({ visible: true })); });
  const dbg = () => b.w.__SF_DEBUG__;

  // G1/G2 — browsing is not searching: browser_open / web_fetch alone must not
  //          open a "搜索流程" panel reading "0 次搜索".
  await React.act(async () => {
    feed(es, { id: 'g1a', type: 'tool:start', data: { tool: 'browser_open', phase: 'click', callId: 'g1' } });
    feed(es, { id: 'g1b', type: 'tool:completed', data: { tool: 'browser_open', phase: 'click', callId: 'g1', durationMs: 900 } });
    feed(es, { id: 'g1c', type: 'tool:completed', data: { tool: 'web_fetch', phase: 'fetch', callId: 'g1c', durationMs: 400 } });
  });
  await render();
  check('G1 browsing alone opens no search task', dbg().task === null, JSON.stringify(dbg().task && dbg().task.phase));
  check('G2 the tab stays on its empty state', (host.textContent || '').includes('还没有搜索流程'), JSON.stringify((host.textContent || '').slice(0, 40)));

  // G3..G6 — a real search that came back with nothing is still ONE search: the
  //          count follows the tool, not the presence of telemetry.
  await React.act(async () => {
    feed(es, { id: 'g3a', type: 'tool:start', data: { tool: 'web_search_pro', phase: 'search', callId: 'g3', summary: '零结果的真实搜索' } });
    feed(es, { id: 'g3b', type: 'tool:completed', data: { tool: 'web_search_pro', phase: 'search', callId: 'g3', durationMs: 500 } });
  });
  await render();
  check('G3 a search without sourcesTop still counts as one search', !!dbg().task && dbg().task.searchCount === 1, dbg().task && dbg().task.searchCount);
  check('G4 the search task records its query', !!dbg().task && dbg().task.queries[0] === '零结果的真实搜索', JSON.stringify(dbg().task && dbg().task.queries));
  check('G5 the panel reads 1 次搜索, not 0', (host.textContent || '').includes('1 次搜索'), JSON.stringify((host.textContent || '').slice(0, 30)));
  check('G6 no event path throws (announce is module-scope)', dbg().lastErr === undefined || dbg().lastErr === null, String(dbg().lastErr));

  // G7..G10 — a session switch (a NEW flow column) must archive the running
  //           search rather than dropping it. The scheduler notices on its tick.
  const flowA = d.createElement('div'); flowA.setAttribute('data-chat-flow', 'a'); d.body.appendChild(flowA);
  await new Promise((r) => setTimeout(r, 420));            // let the boot tick set lastFlow
  const flowB = d.createElement('div'); flowB.setAttribute('data-chat-flow', 'b'); d.body.appendChild(flowB); flowA.remove();
  await new Promise((r) => setTimeout(r, 260));            // observer -> tick -> resetFlow
  await render();
  check('G7 the session switch archives the running search', dbg().history.length === 1, 'n=' + dbg().history.length);
  check('G8 the archived record keeps its query across the switch', !!dbg().history[0] && dbg().history[0].queries[0] === '零结果的真实搜索', JSON.stringify(dbg().history[0] && dbg().history[0].queries));
  check('G9 the live task is cleared by the switch', dbg().task === null, JSON.stringify(dbg().task && dbg().task.phase));
  const afterSwitch = host.textContent || '';
  check('G10 the record is still rendered after the switch', afterSwitch.includes('零结果的真实搜索') && afterSwitch.includes('当前没有进行中的检索'), JSON.stringify(afterSwitch.replace(/\s+/g, ' ').slice(0, 90)));

  // G11/G12 — knowledge/MCP search is NOT web search: wiki_recall / mcp_search
  // carry the 'search' phase for their row icon, but the SEARCH_TOOLS identity
  // guard must keep them from opening a search-flow round or touching history.
  await React.act(async () => {
    feed(es, { id: 'g11a', type: 'tool:start', data: { tool: 'wiki_recall', phase: 'search', callId: 'g11', summary: '搜索流程并发控制' } });
    feed(es, { id: 'g11b', type: 'tool:completed', data: { tool: 'wiki_recall', phase: 'search', callId: 'g11', durationMs: 12, wikiVerdict: 'miss' } });
    feed(es, { id: 'g11c', type: 'tool:start', data: { tool: 'mcp_search', phase: 'search', callId: 'g11c', summary: 'confluence' } });
    feed(es, { id: 'g11d', type: 'tool:completed', data: { tool: 'mcp_search', phase: 'search', callId: 'g11d', durationMs: 300 } });
  });
  await render();
  check('G11 wiki_recall/mcp_search (search phase) open no search round', dbg().task === null, JSON.stringify(dbg().task && dbg().task.phase));
  check('G12 history still holds exactly the one real search', dbg().history.length === 1, 'n=' + dbg().history.length);

  await React.act(async () => { root.unmount(); });
}

const failed = results.filter((r) => !r.ok);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
if (failed.length) console.log('FAILURES: ' + failed.map((f) => f.name).join(', '));

// Exit explicitly. Booting the client module starts timers that outlive the
// assertions (the icon farm's animation loop, the panel's repaint interval),
// so the event loop never drains and node would hang here instead of finishing
// — which the shell reports as a failed run whichever way the checks went.
process.exit(failed.length > 0 ? 1 : 0);
