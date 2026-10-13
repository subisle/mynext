// cloudfunctions/plan/index.js - 反馈驱动的计划调整（回答"7 天没完成，你改了什么"）
const cloud = require("wx-server-sdk");
const { adjust, checkTone } = require("./adjust.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (event.action !== "adjust") return { code: 40000, msg: "unknown action" };

  const status = String(event.status || "");
  if (["done", "partial", "missed"].indexOf(status) === -1) return { code: 40001, msg: "invalid status" };
  const weekAction = String(event.weekAction || "").slice(0, 500);
  if (!weekAction) return { code: 40002, msg: "缺少行动内容" };

  const recent = await db.collection("actionFeedbacks")
    .where({ openid: OPENID, status: "missed" })
    .orderBy("createdAt", "desc").limit(3).get();
  const missedStreak = (recent.data || []).length;

  const adj = adjust(status, weekAction, missedStreak);

  // 话术门禁：任何文案不得出现说教措辞
  const tone = checkTone(adj.reason + " " + adj.actions.join(" "));
  if (!tone.ok) return { code: 50001, msg: "调整文案未通过话术门禁", debug: tone.hits };

  const res = await db.collection("adjustments").add({
    data: {
      openid: OPENID, trigger: status, missedStreak,
      before: weekAction, after: adj.actions,
      level: adj.level, reason: adj.reason, detail: adj.detail,
      createdAt: db.serverDate()
    }
  });

  return { code: 0, msg: "ok", data: { adjustmentId: res._id, level: adj.level, reason: adj.reason, actions: adj.actions } };
};
