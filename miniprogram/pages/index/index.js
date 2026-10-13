const cloud = require("../../utils/cloud.js");

Page({
  data: { completenessText: "尚未开始", profileReady: false },
  onShow() {
    cloud.call("profile", { action: "get" }, { silent: true })
      .then(p => {
        if (!p) return;
        const c = Math.round((p.completeness || 0) * 100);
        this.setData({
          completenessText: "已完成 " + c + "%",
          profileReady: !!(p.basic && p.career && p.goals)
        });
      })
      .catch(() => {});
  },
  goProfile() { wx.navigateTo({ url: "/pages/profile/profile" }); },
  goSimulate() { wx.navigateTo({ url: "/pages/simulate/simulate" }); },
  goMemory() { wx.navigateTo({ url: "/pages/memory/memory" }); },
  goSurvey() { wx.navigateTo({ url: "/pages/survey/survey" }); },
  goHistory() { wx.navigateTo({ url: "/pages/history/history" }); },
  goSettings() { wx.navigateTo({ url: "/pages/settings/settings" }); }
});