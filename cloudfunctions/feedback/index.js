// cloudfunctions/feedback/index.js - 7 天行动反馈
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ALLOWED = ["done", "partial", "missed"];

exports.main = async (event) => {
  if (event.action !== "submit") return { code: 40000, msg: "unknown action" };
  const { OPENID } = cloud.getWXContext();
  const status = event.status;
  if (!ALLOWED.includes(status)) return { code: 40001, msg: "invalid status" };

  await db.collection("actionFeedbacks").add({
    data: {
      openid: OPENID, topic: String(event.topic || "").slice(0, 100),
      branchTitle: String(event.branchTitle || "").slice(0, 100),
      weekAction: String(event.weekAction || "").slice(0, 500),
      status, note: String(event.note || "").slice(0, 500),
      createdAt: db.serverDate()
    }
  });
  return { code: 0, msg: "ok" };
};
