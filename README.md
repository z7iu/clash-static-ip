# clash-fixed-ip

> 一份约 100 行的最小化覆写脚本：让 ChatGPT / Claude 等强风控服务从同一个**固定住宅 IP** 出口，其余流量不受任何影响。

<p align="center">
  <img alt="platform" src="https://img.shields.io/badge/client-Clash%20Party%20%7C%20mihomo-2b90d9">
  <img alt="script" src="https://img.shields.io/badge/override-JavaScript-f7df1e">
  <img alt="lines" src="https://img.shields.io/badge/~100-lines-success">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
</p>

```
本机 → 机场节点(负责翻墙) → 静态住宅 socks5(负责固定出口) → 目标网站
```

机场承担传输，出口由静态住宅 IP 决定：既用机场的带宽与穿透能力，出口又是固定、干净的住宅 IP。

---

## ✨ 特性

- **最小覆写**：只新增「1 个 AI 分组 + 1 条链式出口」，订阅自带的策略组与规则**原封不动**，AI 之外流量零影响。
- **链式代理**：基于 mihomo 的 `dialer-proxy`，自动串成「机场前置 → 静态住宅 IP」。
- **出口恒定**：前置用 `url-test` 自动选优、断线自愈，但网站看到的出口 IP 始终是同一个住宅 IP。
- **离线可用**：不依赖任何在线规则集，启动不拉取外部资源。
- **通用**：对任意机场订阅生效，自动识别美国节点作前置；多份订阅可共用同一脚本。
- **App 整体接管**：桌面版 AI App 用 `PROCESS-NAME` 接管，遥测/更新等附属流量不漏网。

## 🚀 快速开始

1. 准备资源：
   - 一个或多个**机场订阅**（节点多、带宽好，但 IP 是机房的、会变）；
   - 一个**海外静态住宅 IP**，形如 `socks5://用户名:密码@IP:端口`（IP 固定、干净）。
2. 打开 [`fixed-ip.js`](fixed-ip.js)，修改顶部 `STATIC_EXIT` 的 4 个值为你自己的 socks5 信息。
3. Clash Party → **订阅** → **覆写（Override）** → 添加为 **JavaScript 脚本** → **更新订阅**。
4. 面板里把 **🧠 智能服务** 组选为 **📍 静态落地** 即可。

> 完整脚本见 [`fixed-ip.js`](fixed-ip.js)，下文是背景与设计思路。

## 📑 目录

- [一、背景](#一背景)
- [二、解决方案](#二解决方案)
- [三、结论](#三结论)

## 一、背景

用机场节点访问 ChatGPT、Claude 这类服务时，常遇到两个问题：

- 机场节点是**机房 IP**，容易被风控标记；
- 节点会随测速、负载**频繁跳变**，出口 IP 在不同地区之间切换，可能触发反复的人机验证乃至封号。

而这类服务对出口 IP 的稳定性较敏感。期望的状态是：**出口 IP 为一个住宅 IP，且保持不变**。

手上的资源是常见的两件套：

1. 一个或多个**机场订阅**（节点多、带宽好，但 IP 是机房的、会变）；
2. 一个**海外静态住宅 IP**，以 `socks5://用户名:密码@IP:端口` 形式提供（IP 固定、干净，但没有「翻墙」能力，且直连它本身在墙内不通）。

目标很明确——把两者串起来，机场承担传输、出口由静态 IP 决定。下面是用 Clash Party（mihomo 内核）实现的完整方案。

## 二、解决方案

### 2.1 思路总览

整套方案只往配置里加 **2 个代理组 + 1 个节点 + 一组规则**：

```
🧠 智能服务 (select)         ← AI 流量的入口，在面板手选；默认指向 ↓
   └─ 📍 静态落地 (socks5)    ← 静态住宅 IP，固定出口；它的 dialer-proxy 指向 ↓
        └─ 🛫 落地前置 (url-test) ← 自动从机场「美国节点」里按延迟选择，作为传输段
```

- **🧠 智能服务**：决定「AI 流量走不走固定 IP 这条链」，可手动切换（静态 IP 不可用时切回机场作备用）；
- **🛫 落地前置**：决定「这条链第一跳用哪个机场节点」，`url-test` 自动按延迟选择、节点失效时切换，日常无需手动操作；
- 关键点：无论前置切换到哪个机场节点，**网站看到的出口 IP 始终是该静态住宅 IP**。机场节点是传输段，静态 IP 是出口段。

### 2.2 验证方法

| 方式 | 操作 | 判断标准 |
| --- | --- | --- |
| 看链路 | Clash Party「连接」页搜 `claude` / `chatgpt` | 代理链显示 `🧠 智能服务 → 📍 静态落地 → 🛫 落地前置 → 某美国节点` |
| 看 IP | 浏览器访问 `ipinfo.io` 或 `ping0.cc` | 显示你的静态 IP |
| 查纯净度 / 风险分 | `scamalytics.com` 直接输入静态 IP 查询 | 风险分低、判定为住宅 IP |

### 2.3 完整覆写脚本

脚本位于 [`fixed-ip.js`](fixed-ip.js)，约 100 行，不依赖任何外部规则集。使用方式：

> Clash Party → 订阅 → 覆写（Override）→ 添加为 JavaScript 脚本 → 更新订阅。
> 多份订阅可共用同一个脚本。脚本会自动识别订阅里的美国节点作前置，不依赖特定机场。

只需修改顶部这段为你自己的 socks5 信息：

```javascript
// 更换静态 IP 服务商时只改这 4 个值（对应 socks5://USER:PASS@SERVER:PORT）
const STATIC_EXIT = {
  SERVER:   'YOUR_STATIC_IP',   // 静态住宅 IP
  PORT:     443,
  USERNAME: 'YOUR_USERNAME',
  PASSWORD: 'YOUR_PASSWORD',
  UDP:      true,   // 服务商不支持 UDP ASSOCIATE 时改为 false
  TLS:      false,  // 若 443 端口为 TLS 包裹的 socks5，改为 true
}
```

<details>
<summary>展开查看脚本核心逻辑</summary>

脚本在 `main(config)` 里依次完成：

1. 从订阅节点中筛出美国节点作为**前置候选**（没有美国节点则用全部节点）；
2. 新增 `socks5` 落地节点，并用 `dialer-proxy` 指向前置组，形成「机场 → 静态 IP」链；
3. 新增 `url-test` 前置组（自动选优、断线自愈）；
4. 新增 `select` 类型的 AI 服务组，默认走静态落地，备选订阅自带的「🚀 节点选择」与 `DIRECT`；
5. 把 AI 组放最前、AI 规则插到所有规则之前（最先匹配）。

完整实现见 [`fixed-ip.js`](fixed-ip.js)。

</details>

### 2.4 几个可调项

- **换静态 IP / 服务商**：只改顶部 `STATIC_EXIT` 四个值即可，其余不用动。
- **socks5 连不上**：服务商若是 TLS 包裹的 socks5（443 端口常见），把 `TLS` 改 `true`；视频/语音通话不通就把 `UDP` 改 `false`。
- **前置想用别的地区**：脚本默认挑美国节点（因为示例静态 IP 在美国）。如果你的静态 IP 在别的国家，把脚本第 1 步正则里的关键词换成对应地区即可。
- **想加别的 AI / 检测站**：往 `AI_RULES` 里加一行 `'DOMAIN-SUFFIX,xxx.com'` 即可。

## 三、结论

1. **方案构成**：约 100 行覆写，把「机场负责翻墙、静态 IP 负责固定出口」用 `dialer-proxy` 串成一条链，AI 流量固定从一个住宅 IP 出口，其余流量不受影响。
2. **覆写范围最小化**：只新增一个 AI 分组和一条链式出口，订阅自带的策略组与规则保持不变。
3. **固定 IP 的原理**：机场节点是链路的传输段、会变动，静态住宅 IP 是出口段、保持不变——网站看到的始终是同一个 IP。

---

> 本方案基于 Clash Party（mihomo 内核），其他 mihomo 系客户端（如 Mihomo Party / FlClash）原理通用，组名与 UI 操作略有差异。

## License

[MIT](LICENSE)
