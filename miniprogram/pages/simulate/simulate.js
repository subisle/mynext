Page({
  data: { topic: "", loading: false, branches: [], adjustment: null },
  onTopic(e) { this.setData({ topic: e.detail.value }); },
  run() {
    const topic = (this.data.topic || "").trim();
    if (!topic) { wx.showToast({ title: "先写一个主题", icon: "none" }); return; }
    this.setData({ loading: true, branches: [] });
    wx.cloud.callFunction({
      name: "simulate",
      data: { action: "run", topic }
    }).then(res => {
      const r = res.result || {};
      if (r.code !== 0) {
        wx.showToast({ title: r.msg || "推演失败，请稍后再试", icon: "none" });
        this.setData({ loading: false });
        return;
      }
      this.setData({ branches: r.data.branches, loading: false });
      wx.cloud.callFunction({ name: "metrics", data: { action: "track", name: "simulation_completed", payload: { topic } } }).catch(() => {});
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    });
  },
  feedback(e) {
    const { branch, status } = e.currentTarget.dataset;
    const b = this.data.branches[branch];
    wx.cloud.callFunction({
      name: "feedback",
      data: { action: "submit", topic: this.data.topic, branchTitle: b.title, weekAction: b.weekAction, status }
    }).then(() => {
      wx.showToast({ title: "已记录", icon: "success" });
      wx.cloud.callFunction({ name: "plan", data: { action: "adjust", status, weekAction: b.weekAction } })
        .then(res => {
          const r = res.result || {};
          if (r.code !== 0) return;
          this.setData({ adjustment: r.data });
          wx.cloud.callFunction({ name: "metrics", data: { action: "track", name: "adjustment_generated", payload: { level: r.data.level } } }).catch(() => {});
        }).catch(() => {});
    }).catch(() => wx.showToast({ title: "提交失败", icon: "none" }));
  }
});