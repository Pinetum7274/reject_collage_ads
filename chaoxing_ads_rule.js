/**
 * 学习通(超星) - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截「自有广告位」接口 home-yd.chaoxing.com/apis/data/getAdsRecommend。
 *
 * 抓包依据（HAR 185 条请求，开 MITM 后）：
 *  - GET https://home-yd.chaoxing.com/apis/data/getAdsRecommend?token=...&_time=...&inf_enc=...
 *    每个 session 出现 5 次（进入首页/切换 tab 时）。
 *  - 响应体是 base64 编码的 JSON，解码后结构为：
 *      {"msg":{"sourceUrl":"https://home-yd.chaoxing.com/home/getcxHomePage?incode=recommend&v=1",
 *              "isSearch":1,
 *              "adsList":[...2 条显式广告...],
 *              "searchUrl":"",
 *              "bannerListV2":[...18 条轮播推广 banner...]},
 *       "result":1}
 *    - adsList：2 条显式广告
 *        「超星四六级直播课」→ https://ke.chaoxing.com
 *        「每日一书」        → https://appcd.chaoxing.com/eb/app/book
 *    - bannerListV2：18 条轮播 banner，全部来自超星官方推广社区「通通活动站」
 *      （cataid 100000020=话题 / 100000015=校园），内容为 0元领券 / 0.01元打印 /
 *       优惠券 / 课程推广等运营推广位。
 *
 * 处理方式：返回一个 base64 编码的最小合法 JSON，保留 sourceUrl / isSearch / result
 * （不影响首页「推荐」内容的正常加载），仅把 adsList 与 bannerListV2 清空，
 * 这样 App 以为没有广告，开屏/轮播 banner/信息流推广全部跳过。
 *
 * 第三方广告 SDK「百度百青藤」(sofire.baidu.com) 走 [Rule] 直接 REJECT，
 * 不需要脚本处理。
 */

// 最小无广告响应体（base64 编码后回填）
var EMPTY_BODY =
    "eyJtc2ciOnsic291cmNlVXJsIjoiaHR0cHM6Ly9ob21lLXlkLmNoYW94aW5nLmNvbS9ob21lL2dldGN4SG9tZVBhZ2U/aW5jb2RlPXJlY29tbWVuZCZ2PTEiLCJpc1NlYXJjaCI6MSwiYWRzTGlzdCI6W10sInNlYXJjaFVybCI6IiIsImJhbm5lckxpc3RWMiI6W119LCJyZXN1bHQiOjF9";

var url = $request.url || "";

// 学习通自有广告位（开屏/轮播 banner/信息流推广）
if (url.indexOf("home-yd.chaoxing.com/apis/data/getAdsRecommend") !== -1) {
    console.log("[chaoxing_ads] 拦截自有广告位 getAdsRecommend: " + url);
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=UTF-8"
            },
            body: EMPTY_BODY
        }
    });
    return;
}

$done({});
