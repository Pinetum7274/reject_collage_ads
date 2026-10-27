/**
 * PU口袋校园 - 开屏广告屏蔽脚本（Loon http-request）
 *
 * 原理：
 *   PU口袋校园的开屏广告由「阿里妈妈(Tanx)广告 SDK」下发。
 *   广告 SDK 在 App 启动后第一步会请求阿里「AMDC 移动调度中心」：
 *     POST /amdc/mobileDispatch?appkey=12431167&v=6.5&appVersion=7.24.90&cv=1
 *   该请求的返回结果里带的是广告服务器 / 广告素材 CDN 的调度配置，
 *   广告 SDK 据此去拉取开屏广告。本脚本拦截这个调度请求并返回空响应，
 *   让广告 SDK 认为「本次没有广告配置」，开屏广告自然消失。
 *
 * 抓包依据（Loon 导出的 HAR）：
 *   POST http://59.82.14.161:80/amdc/mobileDispatch
 *     ?appkey=12431167&v=6.5&appVersion=7.24.90&cv=1
 *   body: domain=...alimama.cloudvideocdn.taobao.com...&appName=Runner
 *         &machine=iphoneos&netType=5G&signType=noSec&platform=iphone...
 *
 * 适配：如果以后 App 升级换了广告 SDK 的 appkey，把新 key 加进 AD_APPKEYS 即可。
 */

// 阿里妈妈广告 SDK 使用的调度 appkey（抓包确认，可追加多个）
var AD_APPKEYS = ["12431167"];

var url = $request.url || "";

function isAdDispatch() {
    // 只认 AMDC 移动调度请求
    if (url.indexOf("/amdc/mobileDispatch") === -1) return false;
    // 且 appkey 命中广告 SDK 的 key
    for (var i = 0; i < AD_APPKEYS.length; i++) {
        if (url.indexOf("appkey=" + AD_APPKEYS[i]) !== -1) return true;
    }
    return false;
}

if (isAdDispatch()) {
    console.log("[pu_ads] 已拦截开屏广告调度请求: " + url);
    // 返回空的调度响应：广告 SDK 拿到空配置，跳过开屏广告
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": "0"
            },
            body: ""
        }
    });
} else {
    $done({}); // 放行
}
