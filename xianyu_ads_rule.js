/**
 * 闲鱼(Xianyu) - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截两类请求：
 *  1. 阿里妈妈(Tanx)广告SDK的 AMDC 移动调度（appkey=12431167）→ 开屏广告无法下发
 *  2. 闲鱼自有广告位 mtop.idle.idleadv.*（开屏广告获取 + 曝光上报）→ 返回空数据
 *
 * 抓包依据（闲鱼 7.24.90，iOS 包名 com.taobao.fleamarket）：
 *  - AMDC 调度：POST http://amdc.m.taobao.com/amdc/mobileDispatch?appkey=12431167
 *    （另有直连 IP 47.246.103.9 / 59.82.113.10 / 59.82.14.161 / 59.82.113.219 绕过域名，
 *      走明文 HTTP，由 IP-CIDR 规则兜底屏蔽）
 *  - 自有开屏：POST https://acs.m.goofish.com/gw/mtop.idle.idleadv.app.launch.report/1.0
 *    正常响应 {"api":"...","data":{"attributeSuccess":"true"},"ret":["SUCCESS::调用成功"],"v":"1.0"}
 *
 * 注意：appkey=21380790 是淘宝App自身的 AMDC 请求，不要屏蔽（避免误伤淘宝）。
 */

var AD_APPKEYS = ["12431167"];
var url = $request.url || "";

// 1. 阿里妈妈 AMDC 移动调度（开屏广告下发 + 广告SDK域名 HTTPDNS 解析）
if (url.indexOf("/amdc/mobileDispatch") !== -1) {
    var isAd = false;
    for (var i = 0; i < AD_APPKEYS.length; i++) {
        if (url.indexOf("appkey=" + AD_APPKEYS[i]) !== -1) { isAd = true; break; }
    }
    if (isAd) {
        console.log("[xianyu_ads] 拦截 AMDC 调度: " + url);
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
    return;
}

// 2. 闲鱼自有广告位（mtop.idle.idleadv.* 开屏广告获取 + 曝光上报）
if (url.indexOf("mtop.idle.idleadv") !== -1) {
    console.log("[xianyu_ads] 拦截自有广告位: " + url);
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: '{"ret":["SUCCESS::调用成功"],"data":{}}'
        }
    });
    return;
}

$done({});
