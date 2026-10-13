// cloudfunctions/visitJob/index.js - 每日回访与行动提醒（定时触发器）
const cloud = require("wx-server-sdk");
const { isQuietHour, dateKey, checkMessageTone } = require("./schedule.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function alreadySent(openid, type, key) {
  const got = await db.collection("pushLogs").where({ openid: openid, type: type, dateKey: key }).limit(1).get();
  return got.data.length > 0;
}

async function send(openid, type, data) {
  const templateId = process.env.SUBSCRIBE_TEMPLATE_ID;
  if (!templateId) return { ok: false, reason: "no-template-id" };
  try {
    const res = await cloud.openapi.subscribeMessage.send({
      touser: openid, templateId: templateId, page: "pages/index/index",
      data: data, miniprogramState: "formal"
    });
    return { ok: true, errCode: res.errCode };
  } catch (e) {
    return { ok: false, reason: String(e.errCode || e.message) };
  }
}

exports.main = async (event) => {
  const force = !!(event && event.force);
  const now = new Date();
  if (!force && isQuietHour(now.getHours())) {
    return { code: 0, msg: "quiet-hours-deferred", data: { deferred: true } };
  }
  const key = dateKey(now);
  const results = { daily: 0, stale: 0, skipped: 0, failed: 0, toneBlocked: 0 };

  // ① 每日回访
  const subs = await db.collection("subscriptions").where({ dailyVisit: true, authorized: true }).limit(200).get();
  for (const s of subs.data) {
    if (await alreadySent(s.openid, "daily", key)) { results.skipped++; continue; }
    const msg = "你给自己定的行动，今天做了吗？点开记一笔，没做我们就调小一点。";
    if (!checkMessageTone(msg).ok) { results.toneBlocked++; continue; }
    const sent = await send(s.openid, "daily", {
      thing1: { value: "今日回顾" },
      thing2: { value: msg.slice(0, 20) }
    });
    await db.collection("pushLogs").add({
      data: { openid: s.openid, type: "daily", dateKey: key, ok: sent.ok, reason: sent.reason || "", createdAt: db.serverDate() }
    });
    if (sent.ok) results.daily++; else results.failed++;
  }

  // ② 7 天未反馈回顾
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const sims = await db.collection("simulations").where({ createdAt: _.lt(sevenDaysAgo) }).orderBy("createdAt", "desc").limit(200).get();
  for (const sim of sims.data) {
    const fb = await db.collection("actionFeedbacks").where({ openid: sim.openid, topic: sim.topic }).limit(1).get();
    if (fb.data.length > 0) continue;
    if (await alreadySent(sim.openid, "stale7d", key)) { results.skipped++; continue; }
    const actionText = (sim.branches && sim.branches[0] && sim.branches[0].weekAction) || "上周的行动";
    const msg = "你给自己定的行动已经过去一周，做了就记一笔，没做我们就调小一点。";
    if (!checkMessageTone(msg).ok) { results.toneBlocked++; continue; }
    const sent = await send(sim.openid, "stale7d", {
      thing1: { value: "行动回顾" },
      thing2: { value: String(actionText).slice(0, 20) },
      thing3: { value: msg.slice(0, 20) }
    });
    await db.collection("pushLogs").add({
      data: { openid: sim.openid, type: "stale7d", dateKey: key, ok: sent.ok, reason: sent.reason || "", createdAt: db.serverDate() }
    });
    if (sent.ok) results.stale++; else results.failed++;
  }

  return { code: 0, msg: "ok", data: results };
};
