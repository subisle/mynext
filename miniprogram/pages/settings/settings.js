const cloud = require("../../utils/cloud.js");

Page({
  data: { frozen: false, state: null, exporting: false, exportCounts: null, exportLines: [] },
  onShow() {
    cloud.call("plan", { action: "state" }, { silent: true })
      .then(d => this.setData({ frozen: !!(d && d.frozen), state: (d && d.state) || null }))
      .catch(() => {});
  },
  resume() {
    cloud.call("plan", { action: "resume" }, { loading: "处理中" })
      .then(() => { this.setData({ frozen: false }); wx.showToast({ title: "已恢复提醒", icon: "success" }); })
      .catch(() => {});
  },
  doExport() {
    this.setData({ exporting: true });
    cloud.call("account", { action: "export" }, { silent: true })
      .then(d => {
        const counts = (d && d.counts) || {};
        const lines = Object.keys(counts).filter(k => counts[k] > 0).map(k => k + "：" + counts[k] + " 条");
        this.setData({ exporting: false, exportCounts: counts, exportLines: lines.length ? lines : ["暂无可导出的数据"] });
        const text = JSON.stringify((d && d.package) || {}, null, 2);
        wx.setClipboardData({
          data: text,
          success: () => wx.showToast({ title: "已复制到剪贴板", icon: "none" })
        });
      })
      .catch(() => this.setData({ exporting: false }));
  },
  doDelete() {
    cloud.call("account", { action: "notice" }, { silent: true })
      .then(n => {
        const detail = (n && n.detail) || [];
        wx.showModal({
          title: (n && n.title) || "删除我的全部数据",
          content: detail.join("\n"),
          confirmText: "继续",
          success: r => {
            if (!r.confirm) return;
            wx.showModal({
              title: "再次确认",
              content: "删除后无法恢复，确定继续吗？",
              confirmText: "确认删除",
              success: r2 => {
                if (!r2.confirm) return;
                cloud.call("account", { action: "deleteAll", confirm: "DELETE_ALL_MY_DATA" }, { loading: "删除中" })
                  .then(() => {
                    this.setData({ exportCounts: null, exportLines: [] });
                    wx.showToast({ title: "已删除", icon: "success" });
                  })
                  .catch(() => {});
              }
            });
          }
        });
      })
      .catch(() => {});
  }
});
