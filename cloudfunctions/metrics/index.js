// cloudfunctions/metrics/index.js - 埋点最小集（ADR-0003 三指标）
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ALLOWED = [
  "profile_saved",             // 画像保存
  "simulation_completed",      // 完成一次推演
  "feedback_submitted",        // 提交行动反馈
  "adjustment_generated",      // 计划调整生成
  "memory_corrected",          // 用户纠正记忆
  "memory_deleted",            // 用户删除记忆
  "memory_summary_confirmed",  // 确认 AI 理解摘要
  "survey_completed"           // 完成探索性问卷
];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  if (event.action === "track") {
    const name = String(event.name || "");
    if (ALLOWED.indexOf(name) === -1) return { code: 40001, msg: "unknown metric" };
    await db.collection("metricsEvents").add({
      data: {
        openid: OPENID, name,
        payload: event.payload || {},
        createdAt: db.serverDate()
      }
    });
    return { code: 0, msg: "ok" };
  }

  if (event.action === "report") {
    const names = ALLOWED;
    const out = {};
    for (const n of names) {
      const c = await db.collection("metricsEvents").where({ name: n }).count();
      out[n] = c.total;
    }
    // 历史引用准确率 = 确认数 / (确认数 + 纠正数)
    const confirmed = out["memory_summary_confirmed"] || 0;
    const corrected = out["memory_corrected"] || 0;
    const denom = confirmed + corrected;
    out.citationAccuracy = denom > 0 ? Number((confirmed / denom).toFixed(2)) : null;
    return { code: 0, msg: "ok", data: out };
  }

  return { code: 40000, msg: "unknown action" };
};
