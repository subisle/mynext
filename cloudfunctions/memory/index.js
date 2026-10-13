// cloudfunctions/memory/index.js - 事实与目标账本（可追溯记忆的最小实现）
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const KINDS = ["fact", "goal", "redline", "inference"];

async function audit(openid, action, detail) {
  await db.collection("auditLog").add({
    data: { openid, action, detail, createdAt: db.serverDate() }
  });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection("memoryItems");
  const action = event.action;

  if (action === "list") {
    const got = await col.where({ openid: OPENID }).orderBy("createdAt", "desc").limit(100).get();
    return { code: 0, msg: "ok", data: { items: got.data } };
  }

  if (action === "add") {
    const kind = event.kind;
    if (KINDS.indexOf(kind) === -1) return { code: 40001, msg: "invalid kind" };
    const content = String(event.content || "").trim().slice(0, 500);
    if (!content) return { code: 40002, msg: "内容不能为空" };
    if (/\b\d{17}[0-9Xx]\b|\b1[3-9]\d{9}\b/.test(content)) {
      return { code: 40003, msg: "请勿填写身份证号或手机号" };
    }
    const now = db.serverDate();

    // 目标变更：旧目标置为 superseded（保留历史，不作为当前事实）
    if (kind === "goal") {
      const olds = await col.where({ openid: OPENID, kind: "goal", status: "current" }).get();
      for (const o of olds.data) {
        await col.doc(o._id).update({ data: { status: "superseded", supersededBy: content, updatedAt: now } });
      }
    }

    const res = await col.add({
      data: {
        openid: OPENID, kind, content,
        source: kind === "inference" ? "ai_inferred" : "user_confirmed",
        status: "current",
        evidence: String(event.evidence || content).slice(0, 500),
        createdAt: now, updatedAt: now
      }
    });
    await audit(OPENID, "memory.add", { id: res._id, kind });
    return { code: 0, msg: "ok", data: { id: res._id } };
  }

  if (action === "correct") {
    const id = event.id;
    if (!id) return { code: 40004, msg: "缺少 id" };
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    const before = got.data.content;
    const content = String(event.content || "").trim().slice(0, 500);
    await col.doc(id).update({
      data: { content, source: "user_confirmed", correctedAt: db.serverDate(), updatedAt: db.serverDate() }
    });
    await audit(OPENID, "memory.correct", { id, before, after: content });
    return { code: 0, msg: "ok", data: { id, before, after: content } };
  }

  if (action === "confirm") {
    const id = event.id;
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    await col.doc(id).update({ data: { source: "user_confirmed", confirmedAt: db.serverDate(), updatedAt: db.serverDate() } });
    await audit(OPENID, "memory.confirm", { id });
    return { code: 0, msg: "ok" };
  }

  if (action === "delete") {
    const id = event.id;
    const got = await col.doc(id).get();
    if (!got.data || got.data.openid !== OPENID) return { code: 40301, msg: "无权操作" };
    await col.doc(id).remove();
    await audit(OPENID, "memory.delete", { id, content: got.data.content });
    return { code: 0, msg: "ok" };
  }

  return { code: 40000, msg: "unknown action" };
};

// 供 simulate 复用：装载账本（仅 current 项注入）
exports.loadLedger = async function (openid) {
  const got = await db.collection("memoryItems").where({ openid }).limit(200).get();
  const items = got.data;
  return {
    facts: items.filter(function (i) { return i.kind === "fact" && i.status === "current" && i.source === "user_confirmed"; }),
    goals: items.filter(function (i) { return i.kind === "goal"; }),
    redlines: items.filter(function (i) { return i.kind === "redline" && i.status === "current"; }),
    inferences: items.filter(function (i) { return i.kind === "inference" || i.source === "ai_inferred"; })
  };
};
