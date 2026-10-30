/**
 * 中国联通APP(手机营业厅) - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截联通「自有 OMO 运营位/营销位」广告接口。联通广告 100% 由自家后台下发
 * （m.client.10010.com / card.10010.com / m.10010.com），混在正常功能接口里，
 * 没有第三方广告 SDK，所以不能整域 REJECT（会崩登录/商城/计费），只能逐条
 * 清空营销接口的响应体。
 *
 * 抓包依据（联通.har，1028 条请求，开 MITM 后）：
 *  - 联通广告全是「运营位/营销位」：首页弹窗、首页瀑布流、专享优惠、OMO 营销、
 *    商城 banner/品牌馆/搜索推荐、广告曝光上报(smartad.10010.com) 等。
 *  - 这些接口的「无广告」状态在抓包里都能找到合法空响应体（例如弹窗接口本身
 *    就会返回 {"status":"9999","msg":"banner弹窗返回空","data":null}），
 *    所以逐条回填空 JSON，App 拿到的就是「没有广告」的合法结果，不会报错。
 *
 * 纯广告域名（smartad.10010.com 广告上报 / m1.ad.10010.com 广告素材图）
 * 以及 H5 营销页（img.client.10010.com/homepopup/、/homejingxuan12/）
 * 走 [Rule] 直接 REJECT，不需要脚本处理。
 */

var url = $request.url || "";

// 各接口的「无广告」合法空响应体（Content-Type: application/json; charset=utf-8）
var EMPTY = {
    // 1. 首页弹窗（m.client.10010.com）
    homePopUp: '{"status":"9999","msg":"banner弹窗返回空","data":null}',
    // 2. 首页瀑布流（m.client.10010.com）
    waterfall: '{"cacheTime":"2147483647","data":{"liuCeDto":{"batchId":"","pageList":[]}}}',
    // 3. 专享优惠（m.client.10010.com）
    exclusiveOffers: '{"cacheTime":"2147483647","data":{"broadbandContent":"","largeMarket":[],"left":[],"right":[]}}',
    // 4. OMO 营销（m.client.10010.com）
    omo: '{"cacheTime":"2147483647","data":{"deviceBlackShowFlag":false,"listOMOInfo":[]}}',
    // 5. 营销位（m.client.10010.com）
    marketingBits: '{"respCode":"0000","respMessage":"返回成功","data":{"hiddenTop":true,"hiddenBottom":true,"topList":[],"bottomList":[]}}',
    // 6. 通知推广（m.client.10010.com）
    noticeProIds: '{"requireId":"0","status":"0000","data":{"ids":[]}}',
    // 7. 热门推荐（m.client.10010.com，抓包中本身已为空，兜底清空）
    hotRecommend: '{"code":"0000","data":{"value":{"hotRecommend":[]}}}',
    // 8. 商城顶部 banner（card.10010.com）
    topBanner: '{"code":"0000","msg":"ok","data":null}',
    // 9. 商城终端展示（card.10010.com）
    topTerminal: '{"code":"0000","msg":"ok","data":[]}',
    // 10. 商城瀑布流（m.10010.com）
    mallWaterfall: '{"code":"0000","msg":"ok","data":{"status":0,"msg":"成功","res":{"totalPages":"0","reqFlag":1,"pageList":[]}}}',
    // 11. 搜索推荐（card.10010.com，含 adSlotFlag）
    searchRecommend: '{"code":"0000","msg":"ok","data":[]}',
    // 12. 品牌馆（m.10010.com）
    brandFloor: '{"code":"0000","msg":"ok","data":[]}',
    // 13. 流量窗口 banner（m.10010.com）
    flowWindowBanner: '{"code":"0000","msg":"ok","data":{"flowWindow":null,"banner":null}}',
    // 14. 商城新首页（m.10010.com）
    newFirstPage: '{"code":"0000","msg":"ok","data":{}}'
};

// 回填空响应体
function done(body) {
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: body
        }
    });
}

// 逐条匹配营销接口（顺序：更具体的路径优先）
if (url.indexOf("mobileService/activity/homePopUpActivityNew.htm") !== -1) { done(EMPTY.homePopUp); return; }
if (url.indexOf("clientIndex/api/v1/index/queryIndexWaterfall") !== -1) { done(EMPTY.waterfall); return; }
if (url.indexOf("clientIndex/api/v1/index/queryIndexExclusiveOffers") !== -1) { done(EMPTY.exclusiveOffers); return; }
if (url.indexOf("clientIndex/api/v1/index/queryOMO") !== -1) { done(EMPTY.omo); return; }
if (url.indexOf("homeService/getServiceHomeMarketingBits") !== -1) { done(EMPTY.marketingBits); return; }
if (url.indexOf("mobileService/activity/getClientNoticeProIds.htm") !== -1) { done(EMPTY.noticeProIds); return; }
if (url.indexOf("navigationService/naviService/hotRecommend") !== -1) { done(EMPTY.hotRecommend); return; }
if (url.indexOf("mall-access/homePage/v25/topBanner") !== -1) { done(EMPTY.topBanner); return; }
if (url.indexOf("mall-access/homePage/v25/topTerminalShow") !== -1) { done(EMPTY.topTerminal); return; }
if (url.indexOf("mall-access/query/waterfallFlow") !== -1) { done(EMPTY.mallWaterfall); return; }
if (url.indexOf("mall-access/searchRecommend/query") !== -1) { done(EMPTY.searchRecommend); return; }
if (url.indexOf("mall-access/mall/homePage/brandFloor") !== -1) { done(EMPTY.brandFloor); return; }
if (url.indexOf("mall-access/query/FlowWindowAndBanner") !== -1) { done(EMPTY.flowWindowBanner); return; }
if (url.indexOf("mall-order/query/newFirstPage") !== -1) { done(EMPTY.newFirstPage); return; }

$done({});
