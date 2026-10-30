/**
 * 7ma / 7mate 校园电单车微信小程序 - 广告屏蔽脚本（Loon http-request）
 *
 * 拦截 App「自有广告位」接口 newmapi.7mate.cn/api/v1/banner/*。
 *
 * 抓包依据（三次开 MITM 抓包，632 条 + 419 条 + 257 条请求）：
 *  - GET https://newmapi.7mate.cn/api/v1/banner/2?in_fences_school_id=94
 *    返回 {"data":{"name":"首页弹窗广告位","banners":[]}}
 *    "name" 字段明确为「首页弹窗广告位」，banners 可由后台配置填充，
 *    三次抓包均为空，但为稳妥起见脚本直接返回空 banners，App 以为没有广告，
 *    首页弹窗/运营 banner 全部跳过。
 *  - 三次抓包中 newmapi.7mate.cn 上除 /api/v1/banner/ 外，其余接口
 *    （/api/v1/atoperationAreas 运营区、/api/v1/user 用户信息、
 *    /frontend/log/config 日志配置、/api/fence/nearbyCars 附近车辆）均非广告，无需脚本处理。
 *
 * 微信官方小程序广告（流量主 banner/图片 + 激励视频）素材从微信自家 CDN
 * wximg.wxs.qq.com / wxsmw.wxs.qq.com / wxsnsdythumb.wxs.qq.com 加载，
 * 走 [Rule] URL-REGEX 拦截，不需要脚本处理（这些域名与微信聊天/朋友圈图片
 * 共用，不能整域拦）。
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
