// cloudfunctions/memory/index.js - 事实与目标账本 + 理解摘要
const cloud = require("wx-server-sdk");
const { buildSummary, checkNoLabeling } = require("./summary.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const KINDS = ["fact", "goal", "redline", "inference"];

async function audit(openid, action, detail) {
  await db.collection("auditLog").add({ data: { openid: openid, action: action, detail: detail, createdAt: db.serverDate() } });
}

async function trackMetric(openid, name, payload) {
  try {
    await db.collection("metricsEvents").add({
      data: { openid: openid, name: name, payload: payload || {}, createdAt: db.serverDate() }
    });
  } catch (e) { /* 埋点失败不影响主流程 */ }
}

function isSensitive(s) {
  return /\b\d{17}[0-9Xx]\b|\b1[3-9]\d{9}\b/.test(String(s || ""));
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection("memoryItems");
  const action = event.action;

  if (action === "list") {
    const got = await col.where({ openid: OPENID }).orderBy("createdAt", "desc").limit(100).get();
    return { code: 0, msg: "ok", data: { items: got.data } };
  }

  if (action === "summary") {
    const got = await col.where({ openid: OPENID }).limit(200).get();
    const s = buildSummary(got.data || []);
    const guard = checkNoLabeling(s.text);
    if (!guard.ok) return { code: 50001, msg: "摘要未通过标签化检查", debug: guard.hits };
    return { code: 0, msg: "ok", data: s };
  }

  if (action === "summaryFeedback") {
    // 用户对理解摘要的确认或纠正 → 支撑"理解摘要确认率"指标
    const verdict = event.verdict === "correct" ? "correct" : "confirm";
    await trackMetric(OPENID, verdict === "confirm" ? "memory_summary_confirmed" : "memory_corrected", { refs: event.refs || [] });
    await audit(OPENID, "memory.summaryFeedback", { verdict: verdict, refs: event.refs || [] });
    return { code: 0, msg: "ok" };
  }

  if (action === "add") {
    const kind = event.kind;
    if (KINDS.indexOf(kind) === -1) return { code: 40001, msg: "invalid kind" };
    const content = String(event.content || "").trim().slice(0, 500);
    if (!content) return { code: 40002, msg: "内容不能为空" };
    if (isSensitive(content)) return { code: 40003, msg: "请勿填写身份证号或手机号" };
    const now = db.serverDate();

    if (kind === "goal") {
      const olds = await col.where({ openid: OPENID, kind: "goal", status: "current" }).get();
      for (const o of olds.data) {
        await col.doc(o._id).update({ data: { status: "superseded", supersededBy: content, updatedAt: now } });
      }
    }

    const res = await col.add({
      data: {
        openid: OPENID, kind: kind, content: content,
        source: kind === "inference" ? "ai_inferred" : "user_confirmed",
        status: "current",
        evidence: String(event.evidence || content).slice(0, 500),
        createdAt: now, updatedAt: now
      }
    });
    await audit(OPENID, "memory.add", { id: res._id, kind: kind });
    return { code: 0, msg: "ok", data: { id: res._id } };
  }

  if (action === "correct") {
    const id = event.id;
    if (!id) return { code: 40004, msg: "缺少 id" };
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    if (isSensitive(event.content)) return { code: 40003, msg: "请勿填写身份证号或手机号" };
    const before = got.data.content;
    const content = String(event.content || "").trim().slice(0, 500);
    await col.doc(id).update({ data: { content: content, source: "user_confirmed", correctedAt: db.serverDate(), updatedAt: db.serverDate() } });
    await audit(OPENID, "memory.correct", { id: id, before: before, after: content });
    await trackMetric(OPENID, "memory_corrected", { id: id });
    return { code: 0, msg: "ok", data: { id: id, before: before, after: content } };
  }

  if (action === "confirm") {
    const id = event.id;
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    await col.doc(id).update({ data: { source: "user_confirmed", confirmedAt: db.serverDate(), updatedAt: db.serverDate() } });
    await audit(OPENID, "memory.confirm", { id: id });
    return { code: 0, msg: "ok" };
  }

  if (action === "delete") {
    const id = event.id;
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    await col.doc(id).remove();
    await audit(OPENID, "memory.delete", { id: id, content: got.data.content });
    await trackMetric(OPENID, "memory_deleted", { id: id });
    return { code: 0, msg: "ok" };
  }

  return { code: 40000, msg: "unknown action" };
};
