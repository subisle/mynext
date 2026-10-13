Page({
  data: {
    basic: {}, career: {}, goals: {}, saving: false
  },
  onLoad() {
    wx.cloud.callFunction({ name: "profile", data: { action: "get" } }).then(res => {
      const p = (res.result && res.result.data) || {};
      this.setData({ basic: p.basic || {}, career: p.career || {}, goals: p.goals || {} });
    }).catch(() => {});
  },
  onInput(e) {
    const { path } = e.currentTarget.dataset;
    const keys = path.split(".");
    const data = JSON.parse(JSON.stringify(this.data));
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = e.detail.value;
    this.setData(data);
  },
  save() {
    // 敏感信息拦截：身份证号 / 手机号
    const all = JSON.stringify(this.data);
    if (/\b\d{17}[0-9Xx]\b/.test(all) || /\b1[3-9]\d{9}\b/.test(all)) {
      wx.showToast({ title: "请勿填写身份证号或手机号", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    wx.cloud.callFunction({
      name: "profile",
      data: { action: "save", profile: { basic: this.data.basic, career: this.data.career, goals: this.data.goals } }
    }).then(res => {
      this.setData({ saving: false });
      const c = Math.round(((res.result && res.result.data && res.result.data.completeness) || 0) * 100);
      wx.showToast({ title: "已保存，完整度 " + c + "%", icon: "success" });
      wx.cloud.callFunction({ name: "metrics", data: { action: "track", name: "profile_saved", payload: { completeness: c } } }).catch(() => {});
      setTimeout(() => wx.navigateBack(), 800);
    }).catch(() => {
      this.setData({ saving: false });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    });
  }
});