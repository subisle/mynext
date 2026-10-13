const cloud = require("../../utils/cloud.js");

const FB_TEXT = { done: "做完了", partial: "做了一部分", missed: "没顾上" };

Page({
  data: { list: [] },
  onShow() {
    cloud.call("simulate", { action: "history" }, { silent: true })
      .then(data => {
        const list = ((data && data.list) || []).map(it => {
          const d = it.createdAt ? new Date(it.createdAt) : null;
          return Object.assign({}, it, {
            timeText: d ? (d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")) : "",
            feedbackText: FB_TEXT[it.feedback] || it.feedback
          });
        });
        this.setData({ list });
      })
      .catch(() => {});
  }
});
