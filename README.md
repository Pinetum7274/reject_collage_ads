# 校园类 App 广告屏蔽（Loon）

本仓库收集**校园类 App** 的开屏/信息流广告屏蔽插件，现覆盖六个 App：

| App | 插件文件 | 广告 SDK |
|-----|----------|----------|
| PU口袋校园 | `pu_ads.plugin` | 自有广告位 + 腾讯GDT/穿山甲/百度/TopOn/阿里妈妈/Fancy/beizi/gameley/66mobi/buluken/bridgeoos/adwangmai/hubcloud/上海灵业/掌游移动/卓飞传媒/顺昌智行 |
| 闪动校园Pro | `shandong_ads.plugin` | 顺昌智行 / 爱自由 / 杭州基准 / 华子睿 / 百通 / 雨晴云 / 广告玩机 / 穿山甲 / 快手 / Sigmob / 京东DSP / xcultur / wxcjgg / halomobi / 讯飞xfadx |
| 学习通(超星) | `chaoxing_ads.plugin` | 百度百青藤(sofire.baidu.com) + 自有广告位(getAdsRecommend) |
| 7ma(校园骑行小程序) | `7ma_ads.plugin` | 微信官方小程序广告(wximg/wxsmw.wxs.qq.com 流量主/激励视频) + 自有广告位(banner) |
| 闲鱼 | `xianyu_ads.plugin` | 阿里妈妈AMDC(appkey=12431167) + 自有广告位(idleadv) + 穿山甲 + 阿里妈妈云视频广告CDN + 优酷广告SDK + 阿里橙盾 |

> PU口袋校园与闪动校园Pro 共用 **顺昌智行（shunchangzhixing.com）** 广告聚合平台。
>
> PU口袋校园与闲鱼 共用 **阿里妈妈（AMDC，appkey=12431167）** 开屏广告调度。

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
   https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/pu_ads.plugin
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

拦截 **闪动校园Pro**（`com.huachenjie.shandongPro`，UA `ShanDong/2.0.4`）全部广告。两次抓包（88 条 + 197 条开 MITM）定位到**十六套广告 SDK**。

## 抓包结论（开 MITM 后全量暴露）

第一版 88 条抓包只命中七套，开 MITM 的 197 条抓包暴露了另外九套——App 用**广告瀑布流**轮询多家 SDK 竞价，每次抓包看到的 SDK 组合都不同。关键证据：

```
# 广告总开关（App 主后端 api.huachenjie.com，共 28 个广告位，不能整域拦）
GET https://api.huachenjie.com/run-front/ad/getAdConfig
→ adInfoList(28 位：os/sro/srs/ct/.../sigmob/jizhun/chuangjian/...)，openScreenAdSwitch=true

# 开发者自有 DSP（扫描设备 App 列表做定向，区别于 api-cfg 配置服务器）
GET https://api-dsp.8ziben.com/v1/shares/init
→ device_app_list（taobao/weixin/alipay/douyin/jd...）

# 穿山甲 Pangle（get_ads 竞价，aid=5000546）
GET https://api-access.pangolin-sdk-toutiao-b.com/...
GET https://api-access.pangolin-sdk-toutiao1.com/...
GET https://toblog.ctobsnssdk.com/...
GET https://tnc3-alisc1.zijieapi.com/get_domains/v4
GET https://lf-cdn-tos.bytescm.com/...

# 快手联盟
GET https://open.e.kuaishou.com/rest/e/v3/open/*  (44 次)
GET https://gdfp.gifshow.com/rest/infra/gdfp

# Sigmob（appId=57891，本次实际获胜出广告）
GET https://adservice.sigmob.cn/...
GET https://rtbcallback.sigmob.cn/hb/win?...   ← 竞价获胜回调
GET https://n.sigmob.cn/rv/19/...jpeg            ← 激励视频广告图 207KB

# 京东 DSP（本次实际出广告）
GET https://im-x.jd.com/dsp/np?log=...           ← 竞价通知
GET https://img1.360buyimg.com/pop/jfs/...jpg    ← 京东广告素材图 102KB

# xcultur / wxcjgg / halomobi / 讯飞xfadx
GET https://api.ssp.xcultur.com/api/i/init/v4
GET https://api.fu.xcultur.com/water/*
GET https://api.wxcjgg.cn/app/map
GET https://adx.halomobi.com/ssp/getClientInfo
GET https://tk2.xfadx.com/imp?rd=...
```

### 广告 SDK 汇总

| 广告 SDK | 域名 | 角色 |
|----------|------|------|
| 顺昌智行（聚合/SSP） | `shunchangzhixing.com` | 开屏广告下发 + 曝光上报，appid=190132 |
| 爱自由 | `lovefree.cc` | 广告 SDK，appid=895404 |
| 杭州基准 | `hzjizhun.cn` | 广告 SDK，appid=190132 |
| 华子睿 | `huazirc.com` | 广告 SDK |
| 百通广告 | `bwton.com` | 开屏广告图片素材 CDN |
| 雨晴云 | `yuqncloud.com` | 广告事件上报（channel=yqxy） |
| 广告玩机 | `adwanji.com` | 广告事件上报（channel=meicheng） |
| 穿山甲 Pangle | `pangolin-sdk-toutiao*.com` / `ctobsnssdk.com` / `zijieapi.com` / `bytescm.com` / `bytegoofy.com` / `pglstatp-toutiao.com` / `pangle.io` / `csjplatform.com` | get_ads 竞价，aid=5000546 |
| 快手联盟 | `e.kuaishou.com` / `gifshow.com` | 广告 SDK + 数据流 |
| Sigmob | `sigmob.cn` | 移动广告，appId=57891，激励视频 |
| 京东 DSP | `im-x.jd.com` / `360buyimg.com` | 竞价通知 + 广告素材图 |
| xcultur | `xcultur.com` | SSP init + 瀑布流 |
| wxcjgg | `wxcjgg.cn` | 平台映射 + 上报 |
| halomobi | `halomobi.com` | ADX 竞价交易所 |
| 讯飞 xfadx | `xfadx.com` | 曝光上报 |

> 广告上报还走一条 **IP 直连 `124.174.8.127/report/inner`**（channel=yqxy/meicheng）绕过域名屏蔽，已用 `IP-CIDR` 屏蔽。

### 未屏蔽的域名（避免误伤）

- `api.huachenjie.com` —— App 主后端（登录/学校/账号/广告总开关都在这里），**不能整域拦**，否则 App 无法登录。
- `socket-connect.huachenjie.com` / `oss-cdn.huachenjie.com` —— App 自己的 WebSocket / 图标 CDN。
- `api-cfg.8ziben.com` —— App 初始化配置服务器（init-cfg），**非广告**（注意与 `api-dsp.8ziben.com` 区分，后者是 DSP 已屏蔽）。
- `statistic.live.126.net` / `lbs.netease.im` / `httpdns.n.netease.com` / `nos.netease.com` —— 网易云信 IM/直播统计，App 自己的 IM 功能。
- `ir-sdk.dun.163.com` —— 网易易盾风控。
- `ulogs/errlog/utoken.umeng.com` —— 友盟统计/崩溃上报。
- `mssdk/apmplus.volces.com` —— 火山引擎 APM 监测。
- `tx-cdn.moxigame.cn` —— App 自有小游戏运营位（getCommonConfig 里的 live 入口），开发者自有。

### 安装

Loon → 配置 → 插件 → 「+」→ 输入：

```
https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/shandong_ads.plugin
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
DOMAIN-SUFFIX,pangolin-sdk-toutiao.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao1.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao-b.com,REJECT
DOMAIN-SUFFIX,ctobsnssdk.com,REJECT
DOMAIN-SUFFIX,zijieapi.com,REJECT
DOMAIN-SUFFIX,bytescm.com,REJECT
DOMAIN-SUFFIX,bytegoofy.com,REJECT
DOMAIN-SUFFIX,pglstatp-toutiao.com,REJECT
DOMAIN-SUFFIX,pangle.io,REJECT
DOMAIN-SUFFIX,csjplatform.com,REJECT
DOMAIN-SUFFIX,e.kuaishou.com,REJECT
DOMAIN-SUFFIX,gifshow.com,REJECT
DOMAIN-SUFFIX,sigmob.cn,REJECT
DOMAIN-SUFFIX,im-x.jd.com,REJECT
DOMAIN-SUFFIX,360buyimg.com,REJECT
DOMAIN-SUFFIX,xcultur.com,REJECT
DOMAIN-SUFFIX,wxcjgg.cn,REJECT
DOMAIN-SUFFIX,halomobi.com,REJECT
DOMAIN-SUFFIX,xfadx.com,REJECT
DOMAIN,api-dsp.8ziben.com,REJECT
IP-CIDR,124.174.8.127/32,REJECT
```

> **取舍提醒**：`360buyimg.com` 是京东图片 CDN，屏蔽后会连带影响**京东 App 内的商品图**（本 App 里它只用于广告素材图）；`e.kuaishou.com`/`gifshow.com` 同理可能影响快手系 App。不需要可删对应行。京东落地页 `u.jd.com` 默认不屏蔽——广告图被拦掉后根本不会触发跳转。

---

# 三、学习通（超星）

拦截 **学习通**（超星/Chaoxing，iOS 包名 `com.ssreader.ChaoXingStudy`）全部广告。一次开 MITM 抓包（185 条请求）定位到广告分两层：

1. **第三方广告 SDK**：百度百青藤（`sofire.baidu.com`）。
2. **自有广告位**：`home-yd.chaoxing.com/apis/data/getAdsRecommend` —— 开屏/轮播 banner/信息流推广全部由学习通自己后台下发。

## 抓包结论（开 MITM 后）

```
# 百度百青藤广告 SDK（媒体 id=100，广告位 slot=11467；s=广告下发，m=曝光上报）
GET  https://sofire.baidu.com/ios/6/s/100/11467/<ts>/<hash>?skey=...
POST https://sofire.baidu.com/ios/6/m/100/3/<ts>/<n>

# 学习通自有广告位（每个 session 出现 5 次：进首页/切 tab 时）
GET https://home-yd.chaoxing.com/apis/data/getAdsRecommend?token=...&_time=...&inf_enc=...
```

`getAdsRecommend` 的响应体是 **base64 编码的 JSON**，解码后结构：

```json
{"msg":{
    "sourceUrl":"https://home-yd.chaoxing.com/home/getcxHomePage?incode=recommend&v=1",
    "isSearch":1,
    "adsList":[          // 2 条显式广告
      {"title":"超星四六级直播课","url":"https://ke.chaoxing.com",...},
      {"title":"每日一书","url":"https://appcd.chaoxing.com/eb/app/book",...}
    ],
    "searchUrl":"",
    "bannerListV2":[     // 18 条轮播推广 banner
      {"channel":{"cataid":100000020,"title":"0元领3元无门槛券包...","circleName":"通通活动站"},...},
      ...
    ]
},"result":1}
```

- `adsList`：2 条显式广告 —— 「超星四六级直播课」「每日一书」。
- `bannerListV2`：18 条轮播 banner，全部来自学习通官方推广社区「通通活动站」（cataid `100000020`=话题 / `100000015`=校园），内容为 0元领券、0.01元打印、优惠券、课程推广等运营推广位。

## 文件说明

- `chaoxing_ads.plugin` —— Loon 插件本体（可直接导入）
- `chaoxing_ads_rule.js` —— 屏蔽脚本（拦截自有广告位 getAdsRecommend）

## 屏蔽原理

1. **自有广告位（开屏/轮播 banner/信息流推广）**：`http-request` 脚本拦截 `home-yd.chaoxing.com/apis/data/getAdsRecommend`，返回一个 **base64 编码的最小合法 JSON**（保留 `sourceUrl`/`isSearch`/`result`，把 `adsList` 与 `bannerListV2` 清空），App 以为没有广告，开屏/轮播 banner/信息流推广全部跳过，同时不影响首页「推荐」内容的正常加载。
2. **百度百青藤广告 SDK**：`DOMAIN,sofire.baidu.com,REJECT` 直接拦掉广告下发与曝光上报。

## 安装方法

### 方式一：导入插件（推荐）

1. 仓库设为 **Public**。
2. Loon → 配置 → 插件 → 「+」→ 输入：
   ```
   https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/chaoxing_ads.plugin
   ```
3. **开 MITM**：Loon 里把 `home-yd.chaoxing.com` 加进 MITM 域名，并在 iOS「设置 → 通用 → 关于本机 → 证书信任设置」里信任 Loon 证书（否则 HTTPS 解不出来，脚本拦不到自有广告位）。
4. 保存生效，重开 App 验证。

> 默认分支若不是 `main`，把地址里的 `main` 换成你的分支名。

### 方式二：手动添加

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `chaoxing_ads_rule.js`：

```ini
[Script]
http-request ^https?://home-yd\.chaoxing\.com/apis/data/getAdsRecommend script-path=chaoxing_ads_rule.js, requires-body=false, tag=chaoxing_ads_自有广告位拦截

[Rule]
DOMAIN,sofire.baidu.com,REJECT

[MITM]
hostname = home-yd.chaoxing.com
```

## 重要：规则顺序 + MITM

- 确认 `DOMAIN,sofire.baidu.com,REJECT` 这条 **排在 `GEOIP,CN,DIRECT` 之前**（百度广告域名解析到国内 IP，若 `GEOIP,CN,DIRECT` 在前面会先把它放行）。
- 自有广告位走 HTTPS，**必须开 MITM** 脚本才能拦到（见上文安装方法第 3 步）。

## 未屏蔽的域名（避免误伤）

学习通抓包里其余域名均为正常功能或非广告，**不要屏蔽**：

- `learn/apps/kb/useryd/noteyd/home-yd/im/notice/sso/specie/structureyd/groupyd/k/x.chaoxing.com`、`p.ananas.chaoxing.com`、`p.cldisk.com` —— 学习通自身业务/课件媒体 CDN/内容图 CDN。
- `upc/cfgc.zztfly.com`、`cdn-api-auth.zztfly.com`、`log-auth.zztfly.com` —— MobTech「秒验」一键登录 SDK（appkey=382b4432164d1），**屏蔽会破坏登录**。
- `ulogs/errlog/utoken.umeng.com` —— 友盟统计/崩溃上报。
- `none/wkrt.tingyun.com` —— 听云 APM 监测。
- `api.map.baidu.com/sdkcs/verify` —— 百度地图（课程签到定位）。
- `asr.cloud.tencent.com/server_time` —— 腾讯语音识别。
- `sentry.chaoxing.com` —— 错误上报。
- `data-xxt.aichaoxing.com/analysis/tab` —— 「爱学习通」AI tab（返回空，非广告）。

## 自定义

- **只想去掉显式广告、保留轮播 banner**：编辑 `chaoxing_ads_rule.js`，把 `EMPTY_BODY` 里的 `"bannerListV2":[]` 改回原样（保留 banner 列表），仅留 `"adsList":[]`。
- **百青藤仅去广告、不影响百度其它服务**：`sofire.baidu.com` 是百度移动广告专用域名，与搜索/地图/网盘无关，整域 REJECT 安全。

---

# 四、7ma（校园骑行小程序）

拦截 **7ma / 7mate** 校园电单车微信小程序（uni-app 应用名 `7mate.v2.uniapp`，微信 appid `wx9a6a1a8407b04c5d`）的全部广告。两次开 MITM 抓包（632 条 + 419 条请求）定位到广告分两层：

1. **微信官方小程序广告**：流量主 banner/图片广告 + 激励视频广告。**不是第三方 SDK**，素材直接来自微信自家 CDN `wximg.wxs.qq.com`、`wxsmw.wxs.qq.com`、`wxsnsdythumb.wxs.qq.com`。
2. **自有广告位**：`newmapi.7mate.cn/api/v1/banner/*`（首页弹窗广告位）。

## 抓包结论（开 MITM 后）

```
# 自有广告位（首页弹窗广告位，banners 当前为空、可由后台配置填充）
GET https://newmapi.7mate.cn/api/v1/banner/2?in_fences_school_id=94
{"data":{"name":"首页弹窗广告位","banners":[]}}

# 微信官方激励视频广告（视频 + 封面，URL 路径含 ads_svp_video）
GET https://wxsmw.wxs.qq.com/131/20210/snssvpdownload/SH/reserved/ads_svp_video__<hex>.mp4?...&posid=5060180989186180
GET https://wximg.wxs.qq.com/131/20204/snssvpdownload/SH/reserved/ads_svp_video__<hex>.jpeg

# 微信官方图片/信息流/banner 广告（带 posid）
GET https://wximg.wxs.qq.com/141/20204/snscosdownload/SZ/reserved/<hex>?...&posid=5060180989186180

# 微信官方图片/信息流/banner 广告（不带 posid —— 第一版规则漏拦的这批！）
GET https://wximg.wxs.qq.com/141/20204/snscosdownload/SZ/reserved/<hex>?m=...&ck=...&sha256=...
# 广告缩略图（新域名，同样不带 posid，第一版也漏拦）
GET https://wxsnsdythumb.wxs.qq.com/141/20204/snscosdownload/SZ/reserved/<hex>?m=...&ck=...&sha256=...
```

- 广告位 ID 固定为 `posid=5060180989186180`，但**不是所有广告都带 `posid=`**：第二次抓包（419 条）发现 45 条图片广告 + 6 条缩略图广告（新域名 `wxsnsdythumb.wxs.qq.com`）**不带 `posid=`**，第一版只靠 `posid=\d+` + `ads_svp_video` 两条规则漏掉了这 51 条。
- 所有广告素材（图片/视频/封面/缩略图）的共同特征：路径都经过微信 CDN 的**预留素材桶** `.../snscosdownload/<区域>/reserved/`（图片）或 `.../snssvpdownload/<区域>/reserved/`（视频），`reserved` 是广告系统预留桶标记，正常聊天/朋友圈图不走该路径。新版直接按这两条路径拦，`posid=` 带不带都能命中。

## 文件说明

- `7ma_ads.plugin` —— Loon 插件本体（可直接导入）
- `7ma_ads_rule.js` —— 屏蔽脚本（拦截自有广告位 banner）

## 屏蔽原理

1. **微信官方小程序广告素材**：`URL-REGEX` 规则按 URL 特征拦掉 `wximg.wxs.qq.com` / `wxsmw.wxs.qq.com` / `wxsnsdythumb.wxs.qq.com` 上的广告素材——`snscosdownload/<区域>/reserved/`（图片/信息流/banner + 缩略图，**含不带 posid 的**）、`snssvpdownload/<区域>/reserved/`（激励视频 mp4 + 封面 jpeg），并保留 `posid=\d+`、`ads_svp_video` 作冗余兜底。**这三个域名与微信聊天/朋友圈图片共用，不能整域拦**，只能按 URL 路径精确匹配。
2. **自有广告位（首页弹窗）**：`http-request` 脚本拦截 `newmapi.7mate.cn/api/v1/banner/*`，返回空 `{"data":{"name":"首页弹窗广告位","banners":[]}}`，App 以为没有广告，弹窗/banner 跳过。

## 安装方法

### 方式一：导入插件（推荐）

1. 仓库设为 **Public**。
2. Loon → 配置 → 插件 → 「+」→ 输入：
   ```
   https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/7ma_ads.plugin
   ```
3. **开 MITM**：Loon 里把 `wximg.wxs.qq.com`、`wxsmw.wxs.qq.com`、`wxsnsdythumb.wxs.qq.com`、`newmapi.7mate.cn` 加进 MITM 域名，并在 iOS「设置 → 通用 → 关于本机 → 证书信任设置」里信任 Loon 证书。
   - **关键**：`URL-REGEX` 要匹配到 URL 的**路径和查询参数**，前提是 HTTPS 被解密——不开 MITM，Loon 只看得到域名（SNI），看不到 `snscosdownload/.../reserved/`、`ads_svp_video`、`posid=`，广告拦不掉。
4. 保存生效，重开小程序验证。

> 默认分支若不是 `main`，把地址里的 `main` 换成你的分支名。

### 方式二：手动添加

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `7ma_ads_rule.js`：

```ini
[Script]
http-request ^https?://newmapi\.7mate\.cn/api/v1/banner/ script-path=7ma_ads_rule.js, requires-body=false, tag=7ma_ads_自有广告位拦截

[Rule]
URL-REGEX,snscosdownload/[^/]+/reserved/,REJECT
URL-REGEX,snssvpdownload/[^/]+/reserved/,REJECT
URL-REGEX,posid=\d+,REJECT
URL-REGEX,ads_svp_video,REJECT

[MITM]
hostname = newmapi.7mate.cn, wximg.wxs.qq.com, wxsmw.wxs.qq.com, wxsnsdythumb.wxs.qq.com
```

## 重要：规则顺序 + MITM

- 确认这几条 `URL-REGEX ... REJECT` **排在 `GEOIP,CN,DIRECT` 之前**（`wxs.qq.com` 解析到国内 IP，若 `GEOIP,CN,DIRECT` 在前面会先把它们放行）。
- `URL-REGEX` 只对 **MITM 域名** 生效——只有开了 MITM 的域名，Loon 才能拿到完整 URL（含路径/查询参数）做正则匹配。所以 `wximg.wxs.qq.com` / `wxsmw.wxs.qq.com` / `wxsnsdythumb.wxs.qq.com` 必须在 MITM 列表里（见安装方法第 3 步）。
- 自有广告位走 HTTPS，同样依赖 MITM（脚本才能拦到）。

## 未屏蔽的域名（避免误伤）

7ma 抓包里其余域名均为正常功能或非广告，**不要屏蔽**：

- `newmapi.7mate.cn` —— App 主后端（登录/车辆/订单/地图点位全在这里），**不能整域拦**（只脚本拦 `/api/v1/banner/`）。
- `ws1.7mate.cn` —— App 自己的 WebSocket（/ws2 订单状态推送、/health 健康检查）。
- `h5.7mate.cn` —— App 自己的 H5 页面（信用分/排行榜等）。
- `tongji-collector.dcloud.net.cn` —— DCloud uni-app 官方统计（WebTrack.gif），非广告。
- `vectorsdk-cn.map.qq.com` 等 `map.qq.com` 系 —— 腾讯地图 SDK（找车地图瓦片），非广告。
- `wxa.wxs.qq.com` —— 小程序 UI 图标（feedback_icon.png 等），非广告。
- `wxsnsdythumb.wxs.qq.com` —— 微信 CDN 的图片缩略图域名。**本次抓包中它只承载广告缩略图**（`/141/20204/snscosdownload/SZ/reserved/<hex>`，image/png ~7.5KB），已按 `snscosdownload/.../reserved/` 路径精确拦截；但该域名理论上也是微信通用缩略图 CDN，若日后发现正常小程序缩略图也被误拦，删掉 MITM 里的 `wxsnsdythumb.wxs.qq.com` 即可。
- `szminorshort.weixin.qq.com/mmtls/*`、`szextshort.weixin.qq.com/mmtls/*` —— 微信加密传输（mmtls，广告竞价请求也在其中），**无法选择性拦截**，也不要拦（会破坏小程序所有网络）。

## 自定义与取舍提醒

- **`wximg.wxs.qq.com` / `wxsmw.wxs.qq.com` / `wxsnsdythumb.wxs.qq.com` 是微信图片/视频共用 CDN**：对这三个域名开 MITM，意味着 Loon 会解密所有走这三个域名的微信图片/视频流量（含正常聊天/朋友圈图片）。广告 URL 用 `snscosdownload/.../reserved/`、`snssvpdownload/.../reserved/` 精确识别（`reserved` 是微信广告系统的预留素材桶，正常聊天/朋友圈图不走该路径），再叠加 `posid=`、`ads_svp_video` 兜底，误伤概率很低；但如果你介意「微信图片/视频流量被本机 Loon 解密」这件事，可只保留 `newmapi.7mate.cn` 的 MITM + 脚本拦自有广告位，删掉四条 `URL-REGEX` 规则（代价是微信官方流量主/激励视频广告拦不掉）。
- **`posid=` 是微信广告系统的「广告位 ID」参数**：在 `wximg/wxsmw.wxs.qq.com` 上出现即代表广告素材；但**新版不能只靠 `posid=`**——第二次抓包确认有 51 条广告素材不带 `posid=`（这也是「广告问题持续出现」的根因），所以必须以 `reserved` 预留桶路径为主。若想更保守，可删掉 `snscosdownload/[^/]+/reserved/` 这条（代价是那批不带 posid 的图片/缩略图广告会漏拦，广告会继续出现）。

# 五、中国联通

拦截 **中国联通APP**（`com.chinaunicom.mobilebusiness`，手机营业厅）全部广告的 Loon 插件。抓包 **1028 条请求、27 个域名**，确认联通广告 **100% 是「自有 OMO 运营位/营销位」**，由联通自家后台（`m.client.10010.com` / `card.10010.com` / `m.10010.com`）下发，混在正常功能接口里，**没有任何第三方广告 SDK**（无 GDT/穿山甲/百青藤）。

## 抓包结论

联通广告分三类，处理方式各不相同：

1. **纯广告域（整域 REJECT）**：
   - `smartad.10010.com` —— 广告曝光/点击上报（`/msupport/count/businessLogRecords.htm`、`.gif`，上报参数 `remark1` 含「广告位置」）。
   - `m1.ad.10010.com` —— 广告素材图（`/uniAdms_3.0/*.jpg`）。
2. **营销接口（MITM 脚本清空响应体）**：联通把营销位当成正常功能接口下发，**不能整域拦**（否则崩登录/商城/计费），只能脚本逐条回填空 JSON，让 App 拿到「没有广告」的合法结果：
   - `m.client.10010.com`：首页弹窗 `homePopUpActivityNew.htm`、首页瀑布流 `queryIndexWaterfall`、专享优惠 `queryIndexExclusiveOffers`、OMO 营销 `queryOMO`、营销位 `getServiceHomeMarketingBits`、通知推广 `getClientNoticeProIds.htm`、热门推荐 `hotRecommend`。
   - `card.10010.com`：商城顶部 banner `topBanner`、终端展示 `topTerminalShow`、搜索推荐 `searchRecommend/query`。
   - `m.10010.com`：商城瀑布流 `waterfallFlow`、品牌馆 `brandFloor`、流量窗口 banner `FlowWindowAndBanner`、商城新首页 `newFirstPage`。
3. **H5 营销页（URL-REGEX REJECT）**：`img.client.10010.com` 是共用 CDN（还承载 `mslab/libs/msJSBridge-*` 等正常 H5 资源），不能整域拦，按路径精确拦：
   - `img.client.10010.com/homepopup/` —— 首页弹窗 H5。
   - `img.client.10010.com/homejingxuan12/` —— 首页精选 OMO H5（**激进**：清空首页「精选」tab，不需要可删）。

## 安装方法

### 方式一：插件订阅（推荐）

1. 复制本仓库 raw 地址：`https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/unicom_ads.plugin`
2. Loon → 配置 → 插件 → 添加插件，粘贴地址即可（脚本 `unicom_ads_rule.js` 会自动下载）。

### 方式二：手动添加

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `unicom_ads_rule.js`：

```ini
[Script]
http-request ^https?://m\.client\.10010\.com/ script-path=unicom_ads_rule.js, requires-body=false, tag=unicom_ads_客户端运营位拦截
http-request ^https?://card\.10010\.com/ script-path=unicom_ads_rule.js, requires-body=false, tag=unicom_ads_商城banner拦截
http-request ^https?://m\.10010\.com/ script-path=unicom_ads_rule.js, requires-body=false, tag=unicom_ads_商城运营位拦截

[Rule]
DOMAIN,smartad.10010.com,REJECT
DOMAIN,m1.ad.10010.com,REJECT
URL-REGEX,^https?://img\.client\.10010\.com/homepopup/,REJECT
URL-REGEX,^https?://img\.client\.10010\.com/homejingxuan12/,REJECT

[MITM]
hostname = m.client.10010.com, card.10010.com, m.10010.com, img.client.10010.com
```

## 重要：必须开 MITM

- 联通营销接口全走 HTTPS，**不开 MITM，Loon 只看得到域名（SNI），脚本拿不到响应体、拦不到营销位**。
- 安装后需把 `m.client.10010.com`、`card.10010.com`、`m.10010.com`、`img.client.10010.com` 加进 Loon MITM 域名，并在 iOS「设置 → 通用 → 关于本机 → 证书信任设置」信任 Loon 证书。
- `URL-REGEX` 的 H5 路径规则同样依赖 MITM（不开 MITM 看不到路径）。

## 未屏蔽的域名（避免误伤）

联通抓包里其余域名均为正常功能或非广告 SDK，**不要屏蔽**：

- `m.client.10010.com` / `card.10010.com` / `m.10010.com` —— 联通主后端（登录/账户/计费/商城订单全在这），**不能整域拦**，只脚本拦上面的营销接口。
- `loginxx.10010.com` —— 登录/短信验证码，勿拦。
- `pushservice.10010.com` —— 服务推送（话费余额/订单状态等），非广告。
- `oss.newbuy.chinaunicom.cn` / `playback.newbuy.chinaunicom.cn` / `m1.img.10010.com` —— 商品/图片/视频 CDN，非广告。
- `zztfly.com`（`upc` / `cfgc` / `devc` 三个子域）—— **设备指纹采集 SDK**（`appkey=2abd574cd684`，`/v5/gcl` `/v6/gcf` `/dinfo` `/dgen` `/dm` `/privacy/policy/*`），用于广告定向与风控；拦截可能触发风控/影响登录，**默认不拦**。
- `dusee.baidu.com` —— 百度 DuSee AR/视觉 SDK（`/artrack-bos/content/authentication` 返回 `{"errorNum":0,"data":{"features":[]}}`），非广告。
- `api.meishesdk.com` —— 美摄视频 SDK license；`mssdk.volces.com` —— 火山 APM；`api.share.mob.com` —— MobTech ShareSDK；`api.map.baidu.com` —— 百度地图。
- `112.253.54.120:5007` / `157.255.132.25:5010`（`/rest2/client/license/download`）—— 听云 APM license 直连（header `x-tingyun`），非广告。

## 取舍提醒

- `queryIndexExclusiveOffers`（专享优惠）和 `newFirstPage`（商城新首页）属于「营销位但和商城主入口耦合」：清空后专享 tab 与商城首页会变空，若觉得影响正常使用，删掉脚本里对应两行即可（其余广告不受影响）。
- `img.client.10010.com` 开 MITM 意味着 Loon 会解密该域名的图片/H5 流量；该域名主要承载图片（非敏感），但若介意可删掉两条 `URL-REGEX` H5 规则 + MITM 里的 `img.client.10010.com`（代价是首页弹窗/精选 H5 拦不掉，需靠脚本拦的弹窗接口兜底）。

---

# 六、闲鱼

拦截 **闲鱼**（Xianyu，iOS 包名 `com.taobao.fleamarket`，`appVersion 7.24.90`）开屏/信息流广告的 Loon 插件。一次开 MITM 抓包（34 条请求）定位到闲鱼广告分三层：

1. **阿里妈妈 AMDC 开屏调度**：`/amdc/mobileDispatch?appkey=12431167`（与 PU 口袋校园同一个 appkey）。AMDC 请求 body 里的 `domain=` 列表顺带泄露了全部广告 SDK 域名。
2. **第三方广告 SDK**：穿山甲（Pangle）、阿里妈妈云视频广告 CDN、优酷广告 SDK、阿里橙盾（广告风控）。
3. **自有广告位**：`mtop.idle.idleadv.*`（开屏广告获取 + 曝光上报）。

## 抓包结论（开 MITM 后）

```
# 阿里妈妈 AMDC 开屏调度（明文 HTTP，另有直连 IP 绕过域名屏蔽）
POST http://amdc.m.taobao.com/amdc/mobileDispatch?appkey=12431167&appVersion=7.24.90
POST http://47.246.103.9/amdc/mobileDispatch?appkey=12431167         ← 直连 IP
POST http://59.82.113.10/amdc/mobileDispatch?appkey=12431167        ← 直连 IP
POST http://59.82.14.161:80/amdc/mobileDispatch?appkey=12431167     ← 直连 IP
POST http://59.82.113.219/amdc/mobileDispatch?appkey=12431167       ← 直连 IP

# AMDC 请求 body 里的 domain= 列表（HTTPDNS 解析列表，泄露广告 SDK 域名）
domain=api-access.pangolin-sdk-toutiao.com sf3-fe-tos.pglstatp-toutiao.com toblog.ctobsnssdk.com \
       video-zb/guangguang/alimama/video-sh.cloudvideocdn.taobao.com \
       sealine.youku.com mum.alibabachengdun.com ...

# 闲鱼自有开屏广告上报
POST https://acs.m.goofish.com/gw/mtop.idle.idleadv.app.launch.report/1.0
{"api":"mtop.idle.idleadv.app.launch.report","data":{"attributeSuccess":"true"},"ret":["SUCCESS::调用成功"],"v":"1.0"}
```

### 广告 SDK 汇总

| 广告 SDK | 域名 | 角色 |
|----------|------|------|
| 阿里妈妈 AMDC | `amdc.m.taobao.com` + 直连 IP `59.82.x.x` / `47.246.103.9` | 开屏广告调度（appkey=12431167） |
| 穿山甲 Pangle | `pangolin-sdk-toutiao.com` / `pglstatp-toutiao.com` / `ctobsnssdk.com` | 广告竞价 + 统计上报 |
| 阿里妈妈云视频广告 CDN | `cloudvideocdn.taobao.com`（alimama/mamasearchad/guangguang/video-zb/video-sh/video-nt/tbsvideo 子域） | 开屏/信息流广告视频素材 |
| 优酷广告 SDK | `sealine.youku.com` | 广告下发 |
| 阿里橙盾 | `mum.alibabachengdun.com` | 广告反作弊/风控上报 |
| 闲鱼自有广告位 | `mtop.idle.idleadv.*`（走 `acs.m.goofish.com`） | 开屏广告获取 + 曝光上报 |

> 信息流广告由 `mtop.taobao.idlehome.home.circle.list` / `home.nextfresh` / `idle.item.wind.recommend.list` 响应注入（feed 项带 `idleAdsPositionId` / `idleAdsMaterialId` / `idleAdsTaskId` 标记）。这些是闲鱼核心信息流接口，**不能整域拦**；本插件靠拦掉上游广告 SDK（穿山甲/cloudvideocdn 等）切断第三方信息流广告素材，闲鱼自营推广位（带 `idleAds*` 标记）与 feed 同接口、无法单独去除。

## 文件说明

- `xianyu_ads.plugin` —— Loon 插件本体（可直接导入）
- `xianyu_ads_rule.js` —— 屏蔽脚本（拦截 AMDC + 自有广告位 idleadv）

## 屏蔽原理

1. **阿里妈妈 AMDC 开屏调度**：`http-request` 脚本拦截 `/amdc/mobileDispatch`，命中 `appkey=12431167` 返回空响应 → 开屏广告无法下发（与 PU 口袋校园同机制）。
2. **自有广告位**：脚本拦截 `acs.m.goofish.com/gw/mtop.idle.idleadv.*`，返回 `{"ret":["SUCCESS::调用成功"],"data":{}}` → App 以为没有广告。
3. **第三方广告 SDK**：`DOMAIN-SUFFIX` 拦穿山甲（`pangolin-sdk-toutiao.com` / `pglstatp-toutiao.com` / `ctobsnssdk.com`）、阿里妈妈云视频广告 CDN（`cloudvideocdn.taobao.com`）、优酷（`sealine.youku.com`）、阿里橙盾（`mum.alibabachengdun.com`）。
4. **直连 IP 兜底**：`IP-CIDR,59.82.0.0/16` + `IP-CIDR,47.246.103.9/32` 屏蔽 AMDC 绕过域名的明文 HTTP 直连。

## 安装方法

### 方式一：导入插件（推荐）

1. 仓库设为 **Public**。
2. Loon → 配置 → 插件 → 「+」→ 输入：
   ```
   https://raw.githubusercontent.com/Pinetum7274/reject_collage_ads/main/xianyu_ads.plugin
   ```
3. **开 MITM**：Loon 里把 `acs.m.goofish.com` 加进 MITM 域名，并在 iOS「设置 → 通用 → 关于本机 → 证书信任设置」里信任 Loon 证书（否则 HTTPS 解不出来，脚本拦不到自有广告位 idleadv）。
4. 保存生效，重开 App 验证。

> 默认分支若不是 `main`，把地址里的 `main` 换成你的分支名。

### 方式二：手动添加

把下面配置贴进 Loon 配置文本，脚本内容新建为本地脚本 `xianyu_ads_rule.js`：

```ini
[Script]
http-request ^https?://[^/]+/amdc/mobileDispatch script-path=xianyu_ads_rule.js, requires-body=false, tag=xianyu_ads_阿里妈妈开屏拦截
http-request ^https?://acs\.m\.goofish\.com/gw/mtop\.idle\.idleadv\. script-path=xianyu_ads_rule.js, requires-body=false, tag=xianyu_ads_自有广告位拦截

[Rule]
DOMAIN-SUFFIX,cloudvideocdn.taobao.com,REJECT
DOMAIN-SUFFIX,pangolin-sdk-toutiao.com,REJECT
DOMAIN-SUFFIX,pglstatp-toutiao.com,REJECT
DOMAIN-SUFFIX,ctobsnssdk.com,REJECT
DOMAIN-SUFFIX,sealine.youku.com,REJECT
DOMAIN,mum.alibabachengdun.com,REJECT
IP-CIDR,59.82.0.0/16,REJECT
IP-CIDR,47.246.103.9/32,REJECT

[MITM]
hostname = amdc.m.taobao.com, amdcopen.m.taobao.com, amdc.wapa.taobao.com, acs.m.goofish.com
```

## 重要：规则顺序 + MITM

- 确认这几条 `REJECT` 规则**排在 `GEOIP,CN,DIRECT` 之前**（广告域名解析到国内 IP，若 `GEOIP,CN,DIRECT` 在前面会先把它们放行）。
- 自有广告位 `idleadv` 走 HTTPS，**必须开 MITM** 脚本才能拦到（见上文安装方法第 3 步）。
- AMDC 调度走**明文 HTTP**（含直连 IP），脚本和 `IP-CIDR` 都能直接命中，无需 MITM。

## 未屏蔽的域名（避免误伤）

闲鱼抓包里其余域名均为正常功能或非广告，**不要屏蔽**：

- `acs.m.goofish.com` —— 闲鱼主 API（登录/首页/详情/信息流全在这里），**不能整域拦**，只脚本拦 `mtop.idle.idleadv.*`。
- `acs.m.taobao.com` / `msgacs.m.taobao.com` / `guide-acs.m.taobao.com` / `adashx.m.taobao.com` —— 淘宝 MTOP 网关/消息/引导/统计，非广告。
- `mobilegw.alipay.com` / `loggw-ex.alipay.com` —— 支付宝 SDK 网关/日志。
- `atoken.m.taobao.com` —— 淘宝 token 服务。
- `h-adashx.ut.taobao.com` —— 淘宝 UT 埋点统计（非广告）。
- `px.ucweb.com` —— UC 统计。
- `apmplus.volces.com` / `mssdk.volces.com` —— 火山引擎 APM。
- `abtest.alibaba.com` —— A/B 实验配置。
- `vod.cn-shanghai.aliyuncs.com` —— 阿里云视频点播。
- `cloud-config-service.rtc.aliyuncs.com` —— 阿里云 RTC 配置。
- `gw.alipayobjects.com` / `dypnsapi.aliyuncs.com` / `vpp-license-proxy.aliyuncs.com` —— 支付宝静态资源/号码认证/license。
- `alilang-intranet.alibaba-inc.com` —— 阿里内网域名（外网不解析）。
- `wwc.alicdn.com` / `ossgw.alicdn.com` / `gw.alicdn.com` / `img.alicdn.com` / `g.alicdn.com` / `zres.alicdn.com` 等 `*.alicdn.com` —— 阿里 CDN（图片/JS/静态资源），非广告，勿拦。

## 取舍提醒

- `IP-CIDR,59.82.0.0/16,REJECT` 会连带影响**淘宝 App**（阿里妈妈广告 CDN 与淘宝共用 59.82 网段），不需要可删；`47.246.103.9/32` 是精确 IP，无影响。
- `sealine.youku.com` / `cloudvideocdn.taobao.com` 是广告专用子域，整域 REJECT 安全，不影响优酷/淘宝正常功能。

---

## 免责声明

本脚本仅用于个人学习与去除广告，请勿用于其他用途。
