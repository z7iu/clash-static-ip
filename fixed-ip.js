// 最小覆写：仅新增「🧠 智能服务」组，走 机场前置 → socks5 静态住宅 IP（出口固定）
// 订阅自带的策略组与规则全部保留，AI 之外的流量不受任何影响。
// 适用：Clash Party / mihomo，对任意机场订阅通用（自动识别美国节点做前置）。

// 更换静态 IP 服务商时只改这 4 个值（对应 socks5://USER:PASS@SERVER:PORT）
const STATIC_EXIT = {
  SERVER:   'YOUR_STATIC_IP',
  PORT:     443,
  USERNAME: 'YOUR_USERNAME',
  PASSWORD: 'YOUR_PASSWORD',
  UDP:      true,   // 服务商不支持 UDP ASSOCIATE 时改为 false
  TLS:      false,  // 若 443 端口为 TLS 包裹的 socks5，改为 true
}

const AI    = '🧠 智能服务'      // AI 服务
const EXIT  = '📍 静态落地'      // socks5 落地节点（69.3.141.65）
const FRONT = '🛫 落地前置'      // 机场前置（自动测速选优）

// 风控严的 AI 服务域名（不依赖任何外部规则集，离线可用）
const AI_RULES = [
  // ---- AI 桌面应用按进程整体接管（macOS 进程名），遥测/更新等附属域名不再漏网 ----
  'PROCESS-NAME,Claude',
  'PROCESS-NAME,Claude Helper',
  'PROCESS-NAME,Claude Helper (Renderer)',
  'PROCESS-NAME,Claude Helper (GPU)',
  'PROCESS-NAME,Claude Helper (Plugin)',
  'PROCESS-NAME,ChatGPT',
  'PROCESS-NAME,ChatGPT Helper',
  // OpenAI / ChatGPT / Sora
  'DOMAIN-SUFFIX,openai.com',
  'DOMAIN-SUFFIX,chatgpt.com',
  'DOMAIN-SUFFIX,oaistatic.com',
  'DOMAIN-SUFFIX,oaiusercontent.com',
  'DOMAIN-SUFFIX,sora.com',
  // Anthropic / Claude
  'DOMAIN-SUFFIX,anthropic.com',
  'DOMAIN-SUFFIX,claude.ai',
  'DOMAIN-SUFFIX,claude.com',
  // Google Gemini（只圈 AI 子域，不影响其他谷歌流量）
  'DOMAIN,gemini.google.com',
  'DOMAIN,aistudio.google.com',
  'DOMAIN-SUFFIX,generativelanguage.googleapis.com',
  // xAI / Grok
  'DOMAIN-SUFFIX,x.ai',
  'DOMAIN-SUFFIX,grok.com',
  // Perplexity
  'DOMAIN-SUFFIX,perplexity.ai',
  'DOMAIN-SUFFIX,pplx.ai',
  // Meta AI / Mistral
  'DOMAIN-SUFFIX,meta.ai',
  'DOMAIN-SUFFIX,mistral.ai',
  // Microsoft Copilot
  'DOMAIN,copilot.microsoft.com',
  // IP 检测站
  'DOMAIN-SUFFIX,ping0.cc',          // IP 类型/原生检测（中文，含风控值）
  'DOMAIN-SUFFIX,scamalytics.com',   // 欺诈风险评分（AI 风控参考的同类数据源）
  'DOMAIN-SUFFIX,browserleaks.com',  // IP/DNS/WebRTC 泄漏全套检测
  'DOMAIN-SUFFIX,whoer.net',         // 匿名度综合评分
  'DOMAIN-SUFFIX,ipinfo.io',         // IP 归属/ASN 权威数据库 https://ipinfo.io/what-is-my-ip
]

function main(config) {
  if (!config || !Array.isArray(config.proxies) || config.proxies.length === 0) return config
  if (!Array.isArray(config['proxy-groups'])) config['proxy-groups'] = []
  if (!Array.isArray(config.rules)) config.rules = []

  // 1. 前置候选：优先美国节点（落地 69.3.141.65 在美国，延迟最优），没有则用全部节点
  var allNames = config.proxies.map(function(p) { return p && p.name }).filter(Boolean)
  var usNames  = allNames.filter(function(n) { return /美国|USA|\bUS\b|🇺🇸/i.test(n) })

  // 2. socks5 落地节点，dialer-proxy 实现「机场 → 静态IP」链式
  var exitNode = {
    name: EXIT,
    type: 'socks5',
    server: STATIC_EXIT.SERVER,
    port: STATIC_EXIT.PORT,
    username: STATIC_EXIT.USERNAME,
    password: STATIC_EXIT.PASSWORD,
    udp: STATIC_EXIT.UDP,
    'dialer-proxy': FRONT,
  }
  if (STATIC_EXIT.TLS) { exitNode.tls = true; exitNode['skip-cert-verify'] = true }
  config.proxies.push(exitNode)

  // 3. 前置组（url-test 自动选优、断线自愈，出口 IP 始终不变）
  var frontGroup = {
    name: FRONT, type: 'url-test',
    url: 'https://www.gstatic.com/generate_204', interval: 300, tolerance: 50,
    proxies: (usNames.length > 0 ? usNames : allNames).slice(),
  }

  // 4. AI 服务组：默认走静态落地；备选订阅自带的「🚀 节点选择」和 DIRECT
  var existingNames = new Set(config['proxy-groups'].map(function(g) { return g && g.name }))
  var aiProxies = [EXIT]
  if (existingNames.has('🚀 节点选择')) aiProxies.push('🚀 节点选择')
  aiProxies.push('DIRECT')
  var aiGroup = { name: AI, type: 'select', proxies: aiProxies }

  // 5. AI 组放最前面方便操作；AI 规则插到所有规则之前（最先匹配）
  config['proxy-groups'] = [aiGroup, frontGroup].concat(config['proxy-groups'])
  config.rules = AI_RULES.map(function(r) { return r + ',' + AI }).concat(config.rules)

  console.log('[ai-fixed-ip] exit=' + STATIC_EXIT.SERVER + ' front=' + (usNames.length || allNames.length) + ' nodes, +' + AI_RULES.length + ' rules')
  return config
}
