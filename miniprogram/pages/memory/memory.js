const KIND_LABEL = { fact: "事实", goal: "目标", redline: "红线", inference: "推断" };

Page({
  data: { items: [], kind: "fact", draft: "", placeholder: "如：明年 6 月毕业" },
  onShow() { this.load(); },
  load() {
    wx.cloud.callFunction({ name: "memory", data: { action: "list" } }).then(res => {
      const raw = (res.result && res.result.data && res.result.data.items) || [];
      const items = raw.map(it => Object.assign({}, it, { kindLabel: KIND_LABEL[it.kind] || it.kind }));
      this.setData({ items });
    }).catch(() => wx.showToast({ title: "加载失败", icon: "none" }));
  },
  setKind(e) {
    const kind = e.currentTarget.dataset.kind;
    const ph = { fact: "如：明年 6 月毕业", goal: "如：毕业后直接就业", redline: "如：不接受负债创业" };
    this.setData({ kind, placeholder: ph[kind] });
  },
  onDraft(e) { this.setData({ draft: e.detail.value }); },
  add() {
    const content = (this.data.draft || "").trim();
    if (!content) { wx.showToast({ title: "请先填写内容", icon: "none" }); return; }
    wx.cloud.callFunction({ name: "memory", data: { action: "add", kind: this.data.kind, content } })
      .then(res => {
        const r = res.result || {};
        if (r.code !== 0) { wx.showToast({ title: r.msg || "保存失败", icon: "none" }); return; }
        this.setData({ draft: "" });
        this.load();
        wx.showToast({ title: "已记住", icon: "success" });
      }).catch(() => wx.showToast({ title: "保存失败", icon: "none" }));
  },
  edit(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.filter(i => i._id === id)[0];
    wx.showModal({
      title: "纠正这条记忆", editable: true, content: item ? item.content : "",
      success: (r) => {
        if (!r.confirm) return;
        wx.cloud.callFunction({ name: "memory", data: { action: "correct", id, content: r.content } })
          .then(() => { this.load(); wx.showToast({ title: "已纠正", icon: "success" }); });
      }
    });
  },
  confirm(e) {
    const id = e.currentTarget.dataset.id;
    wx.cloud.callFunction({ name: "memory", data: { action: "confirm", id } })
      .then(() => { this.load(); wx.showToast({ title: "已确认", icon: "success" }); });
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除这条记忆？", content: "删除后 AI 将不再使用它。",
      success: (r) => {
        if (!r.confirm) return;
        wx.cloud.callFunction({ name: "memory", data: { action: "delete", id } })
          .then(() => { this.load(); wx.showToast({ title: "已删除", icon: "success" }); });
      }
    });
  }
});
