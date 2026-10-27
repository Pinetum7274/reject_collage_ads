/**
 * 7ma / 7mate 校园电单车微信小程序 - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截 App「自有广告位」接口 newmapi.7mate.cn/api/v1/banner/*。
 *
 * 抓包依据（HAR 632 条请求，开 MITM 后）：
 *  - GET https://newmapi.7mate.cn/api/v1/banner/2?in_fences_school_id=94
 *    返回 {"data":{"name":"首页弹窗广告位","banners":[]}}
 *    "name" 字段明确为「首页弹窗广告位」，banners 可由后台配置填充，
 *    本次抓包为空，但为稳妥起见脚本直接返回空 banners，App 以为没有广告，
 *    首页弹窗/运营 banner 全部跳过。
 *
 * 微信官方小程序广告（流量主 banner/图片 + 激励视频）素材从微信自家 CDN
 * wximg.wxs.qq.com / wxsmw.wxs.qq.com 加载，走 [Rule] URL-REGEX 拦截，
 * 不需要脚本处理（这两个域名与微信聊天图片/视频共用，不能整域拦）。
 */

var url = $request.url || "";

// 7ma 自有广告位（首页弹窗等 banner 位）
if (url.indexOf("newmapi.7mate.cn/api/v1/banner/") !== -1) {
    console.log("[7ma_ads] 拦截自有广告位: " + url);
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: '{"data":{"name":"首页弹窗广告位","banners":[]}}'
        }
    });
    return;
}

$done({});
