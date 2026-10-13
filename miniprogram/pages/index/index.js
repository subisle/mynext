const app = getApp();
Page({
  data: { completenessText: "尚未开始", profileReady: false },
  onShow() {
    const openid = "";
    wx.cloud.callFunction({
      name: "profile",
      data: { action: "get" }
    }).then(res => {
      const p = res.result && res.result.data;
      if (!p) return;
      const c = Math.round((p.completeness || 0) * 100);
      this.setData({
        completenessText: "已完成 " + c + "%",
        profileReady: !!(p.basic && p.career && p.goals)
      });
    }).catch(() => {});
  },
  goProfile() { wx.navigateTo({ url: "/pages/profile/profile" }); },
  goSimulate() { wx.navigateTo({ url: "/pages/simulate/simulate" }); },
  goMemory() { wx.navigateTo({ url: "/pages/memory/memory" }); },
  goSurvey() { wx.navigateTo({ url: "/pages/survey/survey" }); }
});