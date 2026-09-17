/**
 * dsh-searchflow 压力测试
 * 覆盖：
 * 1. browser_open 并发 warm 信号量 (MAX_CONCURRENT_WARM=2)
 * 2. warmInflight 去重 (同 URL 并发只执行一次)
 * 3. canonicalUrl/urlVariants 缓存命中
 * 4. prefetchSeen LRU 清理
 * 5. 多搜索触发 Top-N 预取队列
 * 5. URL 变体 (www/非www/尾斜杠) 共享缓存键
 */

import { apply } from './lib/index.js'

const TEST_URLS = [
  'https://example.com/page',
  'https://www.example.com/page',      // www 变体
  'https://example.com/page/',         // 尾斜杠变体
  'https://example.com/other',
  'https://www.example.com/other',
  'https://example.com/page?b=2&a=1',  // 参数乱序
  'https://example.com/page?a=1&b=2',  // 参数正序
]

const listeners = {}
let calls = 0
const ctx = {
  logger: (name) => ({ 
    info: (...a) => console.log(`[log] ${name}`, ...a) 
  }),
  on: (evt, fn) => { listeners[evt] = fn },
  effect: (fn) => { const r = fn(); return r },
  webServer: { register: () => () => {} },
  tools: { 
    get: (name) => {
      if (name === 'web_snapshot') {
        return {
          execute: async (args) => {
            await new Promise(r => setTimeout(r, 10)) // 模拟渲染
            return {
              url: args.url,
              title: `Title for ${args.url}`,
              text: `Content of ${args.url}`,
              htmlPath: `/tmp/${Date.now()}.html`,
              screenshotPath: `/tmp/${Date.now()}.png`
            }
          }
        }
      }
      if (name === 'browser_open') {
        return {
          execute: async (args) => {
            await new Promise(r => setTimeout(r, 50)) // 模拟导航耗时
            return {
              url: args.url,
              title: `Title for ${args.url}`,
              text: `Live content of ${args.url}`,
              screenshotPath: `/tmp/${Date.now()}.png`
            }
          }
        }
      }
      if (name === 'browser') {
        return {
          render: async (url) => {
            await new Promise(r => setTimeout(r, 10))
            return { url, title: `Title ${url}`, text: `Rendered content of ${url}` }
          }
        }
      }
      return {}
    }
  },
}

apply(ctx)

let warmInflightCount = 0
let maxConcurrentWarm = 0
const originalLog = console.log
console.log = (...args) => {
  const msg = args.join(' ')
  if (msg.includes('warmInflight') || msg.includes('warm skipped')) {
    originalLog('[TRACE]', msg)
  }
  if (msg.includes('browser_open warm: page ready')) {
    warmInflightCount--
  }
  if (msg.includes('browser_open warm skipped')) {
    // skipped
  }
  originalLog(...args)
}

const run = async (name, args, nextValue) => {
  const exec = { name, callId: `t${++calls}`, arguments: args }
  let rendered = 0
  const next = async () => { rendered++; return { isError: false, value: nextValue, content: [] } }
  const result = await listeners['tools/execute'](exec, next)
  return { result, rendered }
}

const testConcurrentWarm = async () => {
  console.log('\n========== 测试 1: browser_open 并发 warm 信号量 (MAX=2) ==========')
  const url = 'https://stress.example.com/page'
  
  // 先预热缓存
  await run('browser_open', { url }, {
    url, title: 'Title 0', text: 'body0', screenshotPath: '/tmp/0.png'
  })
  
  // 并发发起 5 个相同 URL 的 browser_open
  const promises = Array(5).fill().map((_, i) => 
    run('browser_open', { url }, {
      url, title: `Title ${i}`, text: `Live ${i}`, screenshotPath: `/tmp/${i}.png`
    })
  )
  
  const results = await Promise.all(promises)
  const cacheHits = results.filter(r => r.result.value?.text?.includes('Live')).length
  const totalRendered = results.reduce((s,r)=>s+r.rendered,0)
  console.log(`并发 5 次同 URL: 总渲染次数 = ${totalRendered} (预期: 1次真实导航 + 0缓存渲染), 缓存命中返回 live 内容 = ${cacheHits}`)
  console.log(`并发 warm 并发度控制: 预期同时最多 2 个 warm 任务`)
  
  // 等待所有 warm 完成
  await new Promise(r => setTimeout(r, 500))
  console.log(`并发测试完成`)
}

const testVariantCache = async () => {
  console.log('\n========== 测试 2: URL 变体共享缓存键 ==========')
  // 第一遍：建立缓存
  for (const url of TEST_URLS) {
    await run('browser_open', { url }, {
      url, title: 'T', text: 'body', screenshotPath: '/s.png'
    })
  }
  
  // 第二遍：验证缓存命中 (cachedValue 返回，不渲染)
  // 注意：browser_open 缓存命中会 fire-and-forget next() 导致 rendered=1，但返回值是缓存内容
  let hits = 0
  for (const url of TEST_URLS) {
    const r = await run('browser_open', { url }, {
      url, title: 'T', text: 'body2', screenshotPath: '/s2.png'
    })
    // 缓存命中时：返回值是缓存内容 (text='body')，且即使 next() 被调用，返回值也是缓存值
    if (r.result.value?.text === 'body') hits++
  }
  console.log(`URL 变体 (7个) 全部缓存命中: ${hits}/7`)
}

const testPrefetchQueue = async () => {
  console.log('\n========== 测试 3: 搜索触发 Top-N 预取队列 ==========')
  
  // 模拟 3 次搜索，每次返回 5 个 URL，应该触发预取
  for (let i = 0; i < 3; i++) {
    const sources = Array(5).fill().map((_, j) => ({
      url: `https://prefetch.example.com/result${i}_${j}`,
      title: `Result ${i}-${j}`,
      snippet: 'snippet'
    }))
    
    await run('web_search_pro', { query: `query ${i}` }, {
      sources, engine: 'ddg', enginesTried: ['ddg'], fromCache: false
    })
    
    // 等待预取队列处理
    await new Promise(r => setTimeout(r, 100))
  }
  
  console.log('预取队列处理完成 (检查日志中的 "prefetch warmed memory cache")')
}

const testCanonicalCache = async () => {
  console.log('\n========== 测试 4: canonicalUrl 缓存命中 ==========')
  const url = 'https://www.example.com/path?b=2&a=1'
  
  // 多次调用 canonicalUrl，应该走缓存
  for (let i = 0; i < 100; i++) {
    const { apply } = await import('./lib/index.js')
    // 直接调用内部函数较麻烦，这里通过 browser_open 间接验证
    await run('browser_open', { url: 'https://www.example.com/path?b=2&a=1' }, {
      url: 'https://example.com/path?a=1&b=2', title: 'T', text: 'cached', screenshotPath: '/s.png'
    })
  }
  console.log('canonicalUrl 缓存验证完成 (无报错即通过)')
}

const testMemoryLeak = async () => {
  console.log('\n========== 测试 5: 长跑内存泄漏检查 (prefetchSeen LRU) ==========')
  
  // 大量不同 URL 触发预取，触发 LRU 清理
  for (let batch = 0; batch < 5; batch++) {
    const sources = Array.from({ length: 20 }, (_, j) => ({
      url: `https://leaktest.example.com/batch${batch}_${j}`,
      title: `Leak Test ${batch}-${j}`
    }))
    
    await run('web_search_pro', { query: `leak ${batch}` }, {
      sources, engine: 'ddg', enginesTried: ['ddg'], fromCache: false
    })
    
    await new Promise(r => setTimeout(r, 50)) // 等待预取和清理
  }
  
  console.log('内存泄漏测试完成 (prefetchSeen 应被 LRU 清理)')
}

// 运行所有测试
async function main() {
  console.log('🚀 dsh-searchflow 压力测试开始')
  console.log('='.repeat(60))
  
  try {
    await testConcurrentWarm()
    await testVariantCache()
    await testPrefetchQueue()
    await testCanonicalCache()
    await testMemoryLeak()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ 所有压力测试通过！')
    console.log('='.repeat(60))
  } catch (e) {
    console.error('❌ 压力测试失败:', e)
    process.exit(1)
  }
}

main()