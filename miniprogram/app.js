// MyNext - app entry
const config = require("./config.js");

App({
  globalData: { openid: "", cloudReady: false },
  onLaunch() {
    if (!wx.cloud) {
      console.error("wx.cloud 不可用，请升级基础库 >= 2.2.3");
      return;
    }
    // 未配置 cloudEnv 时使用默认环境；配置了则用指定环境
    const initOptions = { traceUser: true };
    if (config.cloudEnv) initOptions.env = config.cloudEnv;
    wx.cloud.init(initOptions);
    this.globalData.cloudReady = true;
    this.login();
  },
  login() {
    wx.cloud.callFunction({ name: "user", data: { action: "login" } })
      .then(res => {
        const r = res.result || {};
        if (r.code === 0 && r.data) this.globalData.openid = r.data.openid;
      })
      .catch(() => { /* 登录失败不阻断浏览，写操作会再次触发鉴权 */ });
  },
  // 订阅消息：在用户完成一次推演后引导，避免首次进入即弹窗
  requestSubscribe() {
    const TEMPLATE_ID = config.subscribeTemplateId;
    if (!TEMPLATE_ID) return Promise.resolve({ accepted: false, skipped: true });
    return new Promise(resolve => {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: res => {
          const accepted = res[TEMPLATE_ID] === "accept";
          wx.cloud.callFunction({
            name: "notify",
            data: { action: "save", accepted: accepted, dailyVisit: accepted, templateId: TEMPLATE_ID }
          }).then(() => resolve({ accepted: accepted })).catch(() => resolve({ accepted: accepted }));
        },
        fail: () => resolve({ accepted: false })
      });
    });
  }
});
