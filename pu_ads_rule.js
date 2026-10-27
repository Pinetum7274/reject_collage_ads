/**
 * PU口袋校园 - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截两类请求：
 *  1. 阿里妈妈(Tanx)广告SDK的 AMDC 移动调度（appkey=12431167）→ 开屏广告无法下发
 *  2. 口袋校园自有广告位 /apis/ad/list/*（开屏=11、插屏=66、banner/运营位等）→ 返回空列表
 *
 * 抓包依据：
 *  - HAR#1~#4：POST /amdc/mobileDispatch?appkey=12431167
 *  - HAR#5（开 MITM）：GET https://apis.pocketuni.net/apis/ad/list/11 返回
 *    {"code":0,"message":"成功","data":{"list":[{"id":4803,"title":"开屏...","place":11,...}]}}
 *    说明开屏/插屏/banner 全部由 app 自有接口 /apis/ad/list/{place} 下发。
 *
 * 注意：appkey=21380790 是淘宝App自身的 AMDC 请求，不要屏蔽（避免误伤淘宝）。
 */

var AD_APPKEYS = ["12431167"];
var url = $request.url || "";

// 1. 阿里妈妈 AMDC 调度
if (url.indexOf("/amdc/mobileDispatch") !== -1) {
    var isAd = false;
    for (var i = 0; i < AD_APPKEYS.length; i++) {
        if (url.indexOf("appkey=" + AD_APPKEYS[i]) !== -1) { isAd = true; break; }
    }
    if (isAd) {
        console.log("[pu_ads] 拦截 AMDC 调度: " + url);
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

// 2. 口袋校园自有广告位（开屏/插屏/banner/运营位）
if (url.indexOf("apis.pocketuni.net/apis/ad/list/") !== -1) {
    console.log("[pu_ads] 拦截自有广告位: " + url);
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: '{"code":0,"message":"成功","data":{"list":[]}}'
        }
    });
    return;
}

$done({});
