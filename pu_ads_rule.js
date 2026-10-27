/**
 * PU口袋校园 - 广告屏蔽脚本（Loon http-request）
 *
 * 用途：拦截「阿里妈妈(Tanx)广告SDK」的 AMDC 移动调度请求，
 *       使广告SDK拿不到调度配置，开屏广告无法下发。
 *
 * 抓包依据（Loon 导出 HAR）：
 *   POST /amdc/mobileDispatch?appkey=12431167&v=6.5&appVersion=7.24.90&cv=1
 *   该 appkey=12431167 是 PU口袋校园 广告SDK 的调度key。
 *
 * 说明：
 *   第二次抓包里还出现 appkey=21380790&appVersion=10.57.20，
 *   那是淘宝App自身的 AMDC 请求（pn=com.taobao.taobao4iphone），
 *   不是口袋校园的，不要屏蔽，否则会误伤淘宝。
 */

// 口袋校园广告SDK使用的调度 appkey（抓包确认，可追加）
var AD_APPKEYS = ["12431167"];

var url = $request.url || "";

function isAdDispatch() {
    if (url.indexOf("/amdc/mobileDispatch") === -1) return false;
    for (var i = 0; i < AD_APPKEYS.length; i++) {
        if (url.indexOf("appkey=" + AD_APPKEYS[i]) !== -1) return true;
    }
    return false;
}

if (isAdDispatch()) {
    console.log("[pu_ads] 已拦截开屏广告调度请求: " + url);
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
    $done({});
}
