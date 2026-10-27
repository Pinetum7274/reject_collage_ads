# 校园类 App 广告屏蔽（Loon）

本仓库收集**校园类 App** 的开屏/信息流广告屏蔽插件，现覆盖两个 App：

| App | 插件文件 | 广告 SDK |
|-----|----------|----------|
| PU口袋校园 | `pu_ads.plugin` | 自有广告位 + 腾讯GDT/穿山甲/百度/TopOn/阿里妈妈/Fancy/beizi/gameley/66mobi/buluken/bridgeoos/adwangmai/hubcloud/上海灵业/掌游移动/卓飞传媒/顺昌智行 |
| 闪动校园Pro | `shandong_ads.plugin` | 顺昌智行 / 爱自由 / 杭州基准 / 华子睿 / 百通 / 雨晴云 / 广告玩机 / 穿山甲 / 快手 / Sigmob / 京东DSP / xcultur / wxcjgg / halomobi / 讯飞xfadx |

> 两个 App 共用 **顺昌智行（shunchangzhixing.com）** 广告聚合平台。

---

# 一、PU口袋校园

拦截 **PU口袋校园**（`com.tiangongwang.PocketUni`）全部广告的 Loon 插件。经过五次抓包（最后一次开了 MITM 解密 HTTPS），定位到该 App 的广告分两层：

1. **自有广告位**：`apis.pocketuni.net/apis/ad/list/{place}` —— 开屏（place=11）、插屏（place=66）、banner/运营位（place=21/34/35/103/115/116…）全部由 App 自己后台下发。
2. **第三方广告聚合**：通过 TopOn(anythink) 聚合，轮询 **15+ 家**广告 SDK（腾讯GDT、穿山甲、百度、beizi、gameley、66mobi、buluken、bridgeoos、adwangmai、hubcloud、上海灵业、阿里妈妈、Fancy、掌游移动、卓飞传媒、顺昌智行）。

## 抓包结论（开 MITM 后）

开 MITM 前只抓到 HTTP 明文（几家 SDK），开 MITM 后一次抓到 **1210 条请求、60 个域名**，广告 SDK 全貌才暴露。关键证据：

```
# 自有开屏广告位（place=11，title=开屏）
GET https://apis.pocketuni.net/apis/ad/list/11
{"code":0,"message":"成功","data":{"list":[{"id":4803,"title":"开屏26.5.21-日常taku","place":11,"jump":40,...}]}}

# 自有插屏广告位（place=66）
GET https://apis.pocketuni.net/apis/ad/list/66
{"title":"我的插屏26.5.21-日常taku",...}

# 腾讯广告 GDT/优量汇
GET https://sdk.e.qq.com/...
GET https://mi.gdt.qq.com/...

# 穿山甲（注意新域名 pangolin-sdk-toutiao*.com，不是旧的 pglstatp）
GET https://api-access.pangolin-sdk-toutiao.com/...

# TopOn 广告聚合
GET https://adx-bj.anythinktech.com/...

# beizi / gameley / 66mobi / buluken / bridgeoos / adwangmai / hubcloud / 上海灵业
GET https://sdk.beizi.biz/...
GET https://jp.ad.gameley.com/...
GET https://sdk-track.66mobi.com/...
GET https://sl.buluken.com/...
GET https://tk.bridgeoos.com/...
GET https://sdk.adx.adwangmai.com/...
GET https://sdktmp.hubcloud.com.cn/...
GET https://api.shanghailingye.cn/...

# 京东广告素材 CDN
GET https://ads-platform.s3-cache-accelerate.cn-north-1.jdcloud-oss.com/...
```

### 为什么「屏蔽完又冒出来」

该 App 用 **TopOn 广告聚合（waterfall）**，同时接入 15+ 家广告 SDK，按竞价逐个请求，谁出价高谁曝光。前几次 HTTP 抓包每次都只命中其中几家，所以「旧域名屏蔽了、新域名又冒出来」。开 MITM 解密 HTTPS 后，全量域名才一次性暴露，本插件已按最新抓包全部补齐。

### 关于「京东广告」和 HTTPDNS

- **京东广告**：经 TopOn/穿山甲/GDT 等竞价下发，素材图从 `ads-platform...jdcloud-oss.com`（京东云 OSS 广告桶）加载，本插件已单独屏蔽该 CDN。
- `119.29.29.98/d` 是腾讯云 **HTTPDNS**（DNS-over-HTTP），广告 SDK 用它把广告域名解析成 IP、绕过域名屏蔽，本插件已用 `IP-CIDR` 屏蔽。

## 文件说明

- `pu_ads.plugin` —— Loon 插件本体（可直接导入）
- `pu_ads_rule.js` —— 屏蔽脚本（拦截阿里妈妈 AMDC + 口袋校园自有广告位）

## 屏蔽原理

1. **自有广告位（开屏/插屏/banner）**：`http-request` 脚本拦截 `apis.pocketuni.net/apis/ad/list/*`，返回空列表 `{"code":0,...,"data":{"list":[]}}`，App 以为没有广告，开屏/插屏/banner 全部跳过。
2. **阿里妈妈开屏**：脚本拦截 `/amdc/mobileDispatch`，命中 `appkey=12431167` 返回空响应。
3. **第三方广告 SDK**：`DOMAIN-SUFFIX` 批量拦掉腾讯GDT（`e.qq.com`/`gdt.qq.com`/`gdtimg.com`/`ugdtimg.com`）、穿山甲（`pangolin-sdk-toutiao*.com`/`adukwai.com`/`ctobsnssdk.com`/`pglstatp-toutiao.com`/`snssdk.com`/`byteimg.com`/`pstatp.com`）、TopOn（`anythinktech.com`）、beizi、gameley、66mobi、buluken、bridgeoos、adwangmai、hubcloud、上海灵业、阿里妈妈、Fancy、掌游移动、卓飞传媒、顺昌智行等。
4. **HTTPDNS 绕过**：`IP-CIDR,119.29.29.98/32` 屏蔽腾讯云 HTTPDNS。
5. **IP 直连兜底**：`IP-CIDR,59.82.0.0/16` 屏蔽阿里妈妈/淘宝广告 CDN 直连 IP。

## 安装方法

### 方式一：导入插件（推荐）

1. 仓库设为 **Public**。
2. Loon → 配置 → 插件 → 「+」→ 输入：
   ```
   https://raw.githubusercontent.com/Pinetum7274/pu_ads/main/pu_ads.plugin
   ```
3. **开 MITM**：Loon 里把 `*.pocketuni.net` 加进 MITM 域名，并在 iOS「设置 → 通用 → 关于本机 → 证书信任设置」里信任 Loon 证书（否则 HTTPS 解不出来，脚本拦不到自有广告位）。
4. 保存生效，重开 App 验证。

> 默认分支若不是 `main`，把地址里的 `main` 换成你的分支名。

### 方式二：手动添加

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `pu_ads_rule.js`：

```ini
[Script]
http-request ^https?://[^/]+/amdc/mobileDispatch script-path=pu_ads_rule.js, requires-body=false, tag=pu_ads_阿里妈妈开屏拦截
http-request ^https?://apis\.pocketuni\.net/apis/ad/list/ script-path=pu_ads_rule.js, requires-body=false, tag=pu_ads_自有广告位拦截

[Rule]
DOMAIN,alimama.cloudvideocdn.taobao.com,REJECT
DOMAIN,mamasearchad.cloudvideocdn.taobao.com,REJECT
DOMAIN,guangguang.cloudvideocdn.taobao.com,REJECT
DOMAIN-SUFFIX,tanx.com,REJECT
DOMAIN-SUFFIX,mmstat.com,REJECT
DOMAIN-SUFFIX,e.qq.com,REJECT
DOMAIN-SUFFIX,gdt.qq.com,REJECT
DOMAIN-SUFFIX,gdtimg.com,REJECT
DOMAIN-SUFFIX,ugdtimg.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao1.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao-b.com,REJECT
DOMAIN-SUFFIX,pglstatp-toutiao.com,REJECT
DOMAIN-SUFFIX,adukwai.com,REJECT
DOMAIN-SUFFIX,ctobsnssdk.com,REJECT
DOMAIN-SUFFIX,snssdk.com,REJECT
DOMAIN-SUFFIX,byteimg.com,REJECT
DOMAIN-SUFFIX,pstatp.com,REJECT
DOMAIN-SUFFIX,1rtb.net,REJECT
DOMAIN-SUFFIX,fancydsp.com,REJECT
DOMAIN-SUFFIX,fancyapi.com,REJECT
DOMAIN-SUFFIX,anythinktech.com,REJECT
DOMAIN-SUFFIX,beizi.biz,REJECT
DOMAIN-SUFFIX,gameley.com,REJECT
DOMAIN-SUFFIX,66mobi.com,REJECT
DOMAIN-SUFFIX,buluken.com,REJECT
DOMAIN-SUFFIX,bridgeoos.com,REJECT
DOMAIN-SUFFIX,adwangmai.com,REJECT
DOMAIN-SUFFIX,hubcloud.com.cn,REJECT
DOMAIN-SUFFIX,shanghailingye.cn,REJECT
DOMAIN-SUFFIX,statisticslinks.com,REJECT
DOMAIN-SUFFIX,zhangyuyidong.cn,REJECT
DOMAIN-SUFFIX,hzzfcm.com,REJECT
DOMAIN-SUFFIX,shunchangzhixing.com,REJECT
DOMAIN,ads-platform.s3-cache-accelerate.cn-north-1.jdcloud-oss.com,REJECT
IP-CIDR,119.29.29.98/32,REJECT
IP-CIDR,59.82.0.0/16,REJECT

[MITM]
hostname = *.pocketuni.net, pocketuni.net, amdc.m.taobao.com, amdcopen.m.taobao.com, amdc.wapa.taobao.com, acs.m.taobao.com
```

## 重要：规则顺序 + MITM

- 确认这几条 `REJECT` 规则**排在 `GEOIP,CN,DIRECT` 之前**（广告域名都解析到国内 IP，若 `GEOIP,CN,DIRECT` 在前面会先把它们放行）。
- 自有广告位走 HTTPS，**必须开 MITM** 脚本才能拦到（见上文安装方法第 3 步）。

## 自定义

- **换 appkey**：编辑 `pu_ads_rule.js`，把新 key 加进 `AD_APPKEYS`。
- **激进 vs 温和**：`IP-CIDR,59.82.0.0/16,REJECT` 会连带影响**淘宝 App**（阿里妈妈 CDN 与淘宝共用 59.82 网段），不需要可删。`e.qq.com`/`snssdk.com`/`byteimg.com` 等与腾讯/字节系 App 共用，若影响其他 App 可单独删对应行。

---

# 二、闪动校园Pro

拦截 **闪动校园Pro**（`com.huachenjie.shandongPro`，UA `ShanDong/2.0.4`）全部广告。一次抓包（88 条）定位到**七套广告 SDK**。

## 抓包结论：App 接入了七套广告 SDK

| 广告 SDK | 域名 | 角色 |
|----------|------|------|
| 顺昌智行（聚合/SSP） | `inner/ad/report/static.shunchangzhixing.com` | 开屏广告下发（getAd）+ 曝光/点击上报，appid=190132 |
| 爱自由 | `ad.lovefree.cc`（checkCd/infoConfig/setGInfo，appid=895404） | 广告 SDK |
| 杭州基准 | `admin.hzjizhun.cn`（checkCd/infoConfig/setGInfo，appid=190132） | 广告 SDK |
| 华子睿 | `inner-hw.huazirc.com`（ad2/init2） | 广告 SDK |
| 百通广告 | `adimage.bwton.com`（*.png） | 开屏广告图片素材 CDN |
| 雨晴云 | `e.api.yuqncloud.com`（event/v5，channel=yqxy） | 广告事件上报 |
| 广告玩机 | `e.api.adwanji.com`（event/v5，channel=meicheng） | 广告事件上报 |

关键证据——`ad.shunchangzhixing.com/getAd` 返回的开屏广告内容（解码后）：

```json
{
  "ldp": "https://u.jd.com/xawEwSj",           // 落地页：京东短链
  "img": "https://adimage.bwton.com/TempZhikeMaterial/...png",  // 开屏广告图
  "icon": "https://adimage.bwton.com/mdemo/...png",
  "displayReport": ["http://ad.shunchangzhixing.com/report/2/.../display", ...],
  "clickReport":   ["http://ad.shunchangzhixing.com/report/2/.../click", ...]
}
```

即：**闪动校园的开屏广告 = 顺昌智行下发 → 百通 CDN 出图 → 点进去跳京东**。广告上报还走了一条 **IP 直连 `124.174.8.127/report/inner`**（channel=yqxy/meicheng）绕过域名屏蔽。

### 未屏蔽的域名（避免误伤）

- `statistic.live.126.net` —— 网易直播统计，是 App 自己的直播/点播功能，**非广告**。
- `api-cfg.8ziben.com` —— 闪动校园Pro 自己的初始化配置服务器（init-cfg），**非广告**。

### 安装

Loon → 配置 → 插件 → 「+」→ 输入：

```
https://raw.githubusercontent.com/Pinetum7274/pu_ads/main/shandong_ads.plugin
```

或手动添加（纯规则，无脚本）：

```ini
[Rule]
DOMAIN-SUFFIX,shunchangzhixing.com,REJECT
DOMAIN-SUFFIX,lovefree.cc,REJECT
DOMAIN-SUFFIX,hzjizhun.cn,REJECT
DOMAIN-SUFFIX,huazirc.com,REJECT
DOMAIN-SUFFIX,bwton.com,REJECT
DOMAIN-SUFFIX,yuqncloud.com,REJECT
DOMAIN-SUFFIX,adwanji.com,REJECT
IP-CIDR,124.174.8.127/32,REJECT
```

> 京东落地页 `u.jd.com` **默认不屏蔽**——它只在点进广告时才用到，广告图被拦掉后根本不会触发；若你要一并屏蔽京东短链，加一行 `DOMAIN-SUFFIX,jd.com,REJECT` 即可（会连带影响京东 App 内跳转）。

## 免责声明

本脚本仅用于个人学习与去除广告，请勿用于其他用途。
