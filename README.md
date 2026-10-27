# PU口袋校园 广告屏蔽（Loon）

拦截 **PU口袋校园** 全部广告的 Loon 插件。经过三次抓包，已定位该 App 使用的**三套广告 SDK**（阿里妈妈 / Fancy / 穿山甲），并针对 IP 直连、HTTPDNS 绕过做激进拦截。

## 抓包结论：App 接入了三套广告 SDK

| 广告 SDK | 域名 | 广告类型 |
|----------|------|----------|
| 阿里妈妈 Tanx（阿里） | `amdc.m.taobao.com`（appkey=12431167）、`alimama/mamasearchad/guangguang.cloudvideocdn.taobao.com`、直连 IP `59.82.x.x` | 开屏广告 |
| Fancy（美数 AdCraft） | `sdk.1rtb.net`、`ad-open2.fancydsp.com`、`t2.fancyapi.com`、`sdkg.fancyapi.com` | 开屏/信息流/插屏 |
| 穿山甲 Pangle（字节跳动） | `p3/p26-be-pack-sign.pglstatp-toutiao.com`、`snssdk.com`、`byteimg.com`、`pstatp.com` | 信息流/插屏 |

关键抓包证据：

```
# 阿里妈妈 AMDC 调度（开屏广告第一步，appkey=12431167）
POST http://59.82.14.161:80/amdc/mobileDispatch?appkey=12431167&v=6.5&appVersion=7.24.90&cv=1

# Fancy 广告请求（RTB 竞价，app_id=107522）
POST http://sdk.1rtb.net/sdk/req_ad?app_id=107522&pid=1100050&accept_ad_type=5&...

# Fancy 开屏广告素材图
GET http://ad-open2.fancydsp.com/pineapple/image/2026/10/15/184203_....jpg

# 穿山甲广告图
GET http://p26-be-pack-sign.pglstatp-toutiao.com/ad.union.api/....jpeg

# 腾讯云 HTTPDNS（广告 SDK 用它把广告域名解析成 IP，绕过域名屏蔽）
GET http://119.29.29.98/d?dn=fdc746454d9d84d6138e1ba69081c1f7&id=6192
```

### 关于「京东广告」

第三次抓包确认：**京东广告不是京东自家 SDK**，而是通过 **Fancy 广告聚合平台（sdk.1rtb.net）** 实时竞价分发下来的京东素材（京东只是 Fancy 的一个广告主）。所以屏蔽 `1rtb.net` = 屏蔽京东广告，无需单独加京东域名。

`119.29.29.98/d` 不是广告，是腾讯云的 **HTTPDNS**（DNS-over-HTTP，官方格式 `http://119.29.29.98/d?dn=<DES加密域名>&id=<业务ID>`）。广告 SDK 用它把广告域名解析成 IP、绕过域名屏蔽。本插件已把它一并屏蔽。

> 注：第二次抓包里出现的 `amdc.m.taobao.com?appkey=21380790&appVersion=10.57.20` 和 `cdn.ynuf.aliapp.org?pn=com.taobao.taobao4iphone` 是**淘宝 App** 自身的请求（抓包时混入的背景流量），不是口袋校园的，**未做屏蔽**，避免误伤淘宝。

## 文件说明

- `pu_ads.plugin` —— Loon 插件本体（可直接导入）
- `pu_ads_rule.js` —— 阿里妈妈调度拦截脚本（插件通过 `script-path` 引用）

## 屏蔽原理

1. **阿里妈妈开屏**：`http-request` 脚本拦截所有 `/amdc/mobileDispatch` 请求，命中 `appkey=12431167` 就返回空响应，广告 SDK 拿不到配置，开屏广告跳过。
2. **Fancy（含京东）**：`DOMAIN-SUFFIX` 拦掉 `1rtb.net`（广告竞价请求）、`fancydsp.com`（广告素材图）、`fancyapi.com`（上报/网关）。
3. **穿山甲**：`DOMAIN-SUFFIX` 拦掉 `pglstatp-toutiao.com` 及字节跳动系广告域名。
4. **阿里妈妈素材 CDN**：`DOMAIN` 拦掉 `alimama/mamasearchad/guangguang.cloudvideocdn.taobao.com`，`DOMAIN-SUFFIX` 拦 `tanx.com`、`mmstat.com`。
5. **HTTPDNS 绕过**：`IP-CIDR,119.29.29.98/32` 拦掉腾讯云 HTTPDNS，广告 SDK 无法把广告域名解析成 IP 绕过屏蔽。
6. **IP 直连兜底**：`IP-CIDR,59.82.0.0/16` 拦掉阿里妈妈/淘宝广告 CDN 直连 IP。

## 安装方法

### 方式一：导入插件（推荐）

1. 仓库设为 **Public**（Settings → Danger Zone → Change visibility）。
2. Loon → 配置 → 插件 → 「+」→ 输入：
   ```
   https://raw.githubusercontent.com/Pinetum7274/pu_ads/main/pu_ads.plugin
   ```
3. 保存生效，重开 App 验证。

> 默认分支若不是 `main`，把地址里的 `main` 换成你的分支名。
> 若 raw 超时，改用 jsDelivr：`https://cdn.jsdelivr.net/gh/Pinetum7274/pu_ads@main/pu_ads.plugin`

### 方式二：手动添加（不依赖仓库/网络，最稳）

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `pu_ads_rule.js`（内容见本仓库脚本文件）：

```ini
[Script]
http-request ^https?://[^/]+/amdc/mobileDispatch script-path=pu_ads_rule.js, requires-body=false, tag=pu_ads_阿里妈妈开屏拦截

[Rule]
DOMAIN,alimama.cloudvideocdn.taobao.com,REJECT
DOMAIN,mamasearchad.cloudvideocdn.taobao.com,REJECT
DOMAIN,guangguang.cloudvideocdn.taobao.com,REJECT
DOMAIN-SUFFIX,tanx.com,REJECT
DOMAIN-SUFFIX,mmstat.com,REJECT
DOMAIN-SUFFIX,1rtb.net,REJECT
DOMAIN-SUFFIX,fancydsp.com,REJECT
DOMAIN-SUFFIX,fancyapi.com,REJECT
DOMAIN-SUFFIX,pglstatp-toutiao.com,REJECT
DOMAIN-SUFFIX,snssdk.com,REJECT
DOMAIN-SUFFIX,byteimg.com,REJECT
DOMAIN-SUFFIX,pstatp.com,REJECT
IP-CIDR,119.29.29.98/32,REJECT
IP-CIDR,59.82.0.0/16,REJECT

[MITM]
hostname = amdc.m.taobao.com, amdcopen.m.taobao.com, amdc.wapa.taobao.com, acs.m.taobao.com
```

## 重要：规则顺序

如果插件导入后广告仍在，先确认 Loon 里这几条 `REJECT` 规则**排在 `GEOIP,CN,DIRECT` 之前**（广告域名都解析到国内 IP，若 `GEOIP,CN,DIRECT` 在前面会先把它们放行）。插件规则默认插在规则列表前部，一般没问题；若你手动改过规则顺序，把广告 REJECT 规则上移即可。

## 自定义

- **换 appkey**：编辑 `pu_ads_rule.js`，把新 key 加进 `AD_APPKEYS`：
  ```js
  var AD_APPKEYS = ["12431167", "新appkey"];
  ```
- **激进 vs 温和**：`IP-CIDR,59.82.0.0/16,REJECT` 会连带影响**淘宝 App**（阿里妈妈 CDN 与淘宝共用 59.82 网段）。若你要正常用淘宝，删掉这一行；只想屏蔽口袋校园广告、不在乎淘宝，则保留。

## 免责声明

本脚本仅用于个人学习与去除广告，请勿用于其他用途。
