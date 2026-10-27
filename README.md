# PU口袋校园 开屏广告屏蔽（Loon）

拦截 **PU口袋校园** 开屏广告的 Loon 插件。核心思路：开屏广告由**阿里妈妈(Tanx)广告 SDK** 下发，App 启动后第一步会请求阿里「AMDC 移动调度中心」拿广告配置；拦掉这个调度请求，SDK 就认为没有广告，开屏广告直接跳过。

## 抓包依据

Loon 导出的 HAR 里只有这一条请求（就是开屏广告的触发点）：

```
POST http://59.82.14.161:80/amdc/mobileDispatch
     ?appkey=12431167&v=6.5&appVersion=7.24.90&cv=1

body: domain=pingjia.alicdn.com img.alicdn.com ... alimama.cloudvideocdn.taobao.com
      mamasearchad.cloudvideocdn.taobao.com guangguang.cloudvideocdn.taobao.com ...
      &appName=Runner&machine=iphoneos&netType=5G&signType=noSec&platform=iphone...
```

关键标识：

| 字段 | 含义 |
|------|------|
| `appkey=12431167` | 阿里妈妈广告 SDK 的调度 key（屏蔽依据） |
| `/amdc/mobileDispatch` | 阿里 AMDC 移动调度中心接口 |
| `alimama.cloudvideocdn.taobao.com` | 阿里妈妈 = 阿里广告平台，开屏广告素材 CDN |
| `mamasearchad.cloudvideocdn.taobao.com` | 搜索广告 CDN |
| `guangguang.cloudvideocdn.taobao.com` | 逛逛/推广 CDN |
| `appName=Runner` | App 内部代号 |

> 备注：请求的 User-Agent 显示为「闲鱼」，这是阿里系广告 SDK 复用/伪装了闲鱼的 UA（或抓包时混入了其他流量），不影响屏蔽——真正起标识作用的是 `appkey=12431167` 和 `/amdc/mobileDispatch` 路径。

## 文件说明

- `pu_ads.plugin` —— Loon 插件本体（可直接导入）
- `pu_ads_rule.js` —— 拦截脚本（插件通过 `script-path` 引用，需与插件同仓托管）

## 安装方法

### 方式一：导入插件（推荐）

1. 把这两个文件推到 `https://github.com/Pinetree7274/pu_ads`（`main` 分支）。
2. Loon → 配置 → 插件 → 右上角「+」→ 输入插件地址：
   ```
   https://raw.githubusercontent.com/Pinetree7274/pu_ads/main/pu_ads.plugin
   ```
3. 保存后生效，重新打开 PU口袋校园验证。

> 如果你用的是 `master` 分支，把上面两处 URL 里的 `main` 改成 `master`。

### 方式二：手动添加（不用仓库托管）

把下面的配置粘进 Loon 配置文本的对应段落，并手动新建 `pu_ads_rule.js`（内容即本仓库的脚本文件）放到 Loon 的脚本目录：

```ini
[Script]
http-request ^https?://[^/]+/amdc/mobileDispatch script-path=pu_ads_rule.js, requires-body=false, tag=pu_ads_开屏广告拦截

[Rule]
DOMAIN,alimama.cloudvideocdn.taobao.com,REJECT
DOMAIN,mamasearchad.cloudvideocdn.taobao.com,REJECT
DOMAIN,guangguang.cloudvideocdn.taobao.com,REJECT

[MITM]
hostname = amdc.m.taobao.com, amdcopen.m.taobao.com, amdc.wapa.taobao.com, acs.m.taobao.com
```

## 工作原理

1. `http-request` 脚本匹配所有 `/amdc/mobileDispatch` 请求（无论域名还是 IP 直连都能命中）。
2. 脚本检查 URL 里是否带 `appkey=12431167`，命中才拦截，避免误伤其他 App 的正常调度。
3. 拦截时返回一个空的 `200` 响应，广告 SDK 拿到空配置 → 跳过开屏广告（而不是报错卡住启动）。
4. 三条 `DOMAIN,REJECT` 规则是兜底：就算调度请求漏网，广告素材 CDN 也被拦掉，图片/视频加载不出来。

## 自定义

- **换了 appkey**：编辑 `pu_ads_rule.js`，把新 key 加进 `AD_APPKEYS` 数组：
  ```js
  var AD_APPKEYS = ["12431167", "新appkey"];
  ```
- **想更彻底**：在 `[Rule]` 里继续追加 `DOMAIN,xxx,REJECT`（抓包里其它广告域名：`video-zb/nt/sh.cloudvideocdn.taobao.com`、`tbsvideo.cloudvideocdn.taobao.com`、`dorangesource.alicdn.com` 等）。注意这些域名可能与正常内容共用，建议按需逐条加、加完验证 App 正常功能。

## 免责声明

本脚本仅用于个人学习与去除广告，请勿用于其他用途。
