Page({
  data: {
    saving: false,
    result: null,
    answers: {},
    questions: [
      { id: "q1", index: 1, title: "面对不确定的选择，你通常怎么做？", options: [
        { value: "a", label: "先小步试探" }, { value: "b", label: "先收集更多信息" }, { value: "c", label: "直接选一个开始做" } ] },
      { id: "q2", index: 2, title: "你更喜欢哪种安排方式？", options: [
        { value: "a", label: "清晰的计划表" }, { value: "b", label: "大致方向，随机应变" } ] },
      { id: "q3", index: 3, title: "做重要决定时，你更依赖？", options: [
        { value: "a", label: "自己的判断" }, { value: "b", label: "找人商量" } ] },
      { id: "q4", index: 4, title: "精力恢复通常靠？", options: [
        { value: "a", label: "独处" }, { value: "b", label: "和人待在一起" } ] },
      { id: "q5", index: 5, title: "现阶段你最看重的是？", options: [
        { value: "a", label: "稳定" }, { value: "b", label: "成长" }, { value: "c", label: "收入" }, { value: "d", label: "自主与自由" } ] }
    ]
  },
  pick(e) {
    const { q, v } = e.currentTarget.dataset;
    const answers = Object.assign({}, this.data.answers);
    answers[q] = v;
    this.setData({ answers });
  },
  submit() {
    if (!Object.keys(this.data.answers).length) { wx.showToast({ title: "至少回答一题", icon: "none" }); return; }
    this.setData({ saving: true });
    wx.cloud.callFunction({ name: "survey", data: { action: "submit", answers: this.data.answers } })
      .then(res => {
        this.setData({ saving: false });
        const r = res.result || {};
        if (r.code !== 0) { wx.showToast({ title: r.msg || "提交失败", icon: "none" }); return; }
        this.setData({ result: r.data });
        wx.cloud.callFunction({ name: "metrics", data: { action: "track", name: "survey_completed" } }).catch(() => {});
      })
      .catch(() => { this.setData({ saving: false }); wx.showToast({ title: "提交失败", icon: "none" }); });
  }
});
