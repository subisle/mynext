// cloudfunctions/plan/index.js - 反馈驱动的计划调整（回答"7 天没完成，你改了什么"）
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 规则式降载：确定性、可测试、可解释
function adjust(status, weekAction, missedStreak) {
  const base = { done: 1, partial: 0, missed: 0 }[status] || 0;
  if (status === "done") {
    return {
      level: "up",
      reason: "你完成了上一轮行动，可以把步子加大一点。",
      actions: [weekAction + "（并在此基础上增加 1 个同类小步骤）"],
      detail: { factor: 1.5, split: false }
    };
  }
  if (status === "partial") {
    return {
      level: "keep",
      reason: "你完成了一部分，说明方向可行，但节奏需要微调。",
      actions: [weekAction + "（把剩余部分拆到两个时间段完成）"],
      detail: { factor: 1, split: true }
    };
  }
  // missed
  const severe = (missedStreak || 0) >= 1;
  return {
    level: severe ? "freeze-suggest" : "down",
    reason: severe
      ? "连续两轮没有完成，先暂停目标周期，避免把压力变成自责。"
      : "上一轮没顾上，先降低负担，把行动拆到能立刻开始的程度。",
    actions: [
      weekAction + "（拆成 2 次，每次不超过 15 分钟）",
      "若本周仍无法开始，只保留 1 次 10 分钟的最小动作"
    ],
    detail: { factor: 0.5, split: true, freezeSuggested: severe }
  };
}

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
  const missedStreak = recent.data.length;

  const adj = adjust(status, weekAction, missedStreak);

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

exports.adjust = adjust;
