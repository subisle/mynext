// cloudfunctions/profile/index.js - 画像存取 + 同步到记忆账本
const cloud = require("wx-server-sdk");
const { profileToLedgerItems, diffLedger } = require("./ledger.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function hasSensitiveData(obj) {
  const s = JSON.stringify(obj);
  return /\b\d{17}[0-9Xx]\b/.test(s) || /\b1[3-9]\d{9}\b/.test(s);
}

function completeness(p) {
  const groups = ["basic", "career", "goals"];
  let done = 0;
  for (const g of groups) {
    const v = p && p[g];
    if (v && Object.keys(v).length > 0 && Object.values(v).some(function (x) { return String(x || "").trim(); })) done++;
  }
  return done / 3;
}

// 画像保存后同步账本：新增缺失条目，移除画像中已删除的条目（不动用户手动的与纠错过的）
async function syncLedger(openid, profile) {
  const desired = profileToLedgerItems(profile);
  const got = await db.collection("memoryItems").where({ openid: openid }).limit(200).get();
  const exist = got.data || [];
  const d = diffLedger(exist, desired);

  for (const item of d.toAdd) {
    // 目标类新增时，旧目标置为 superseded（与 memory 云函数一致）
    if (item.kind === "goal") {
      const olds = await db.collection("memoryItems")
        .where({ openid: openid, kind: "goal", status: "current" }).get();
      for (const o of olds.data) {
        await db.collection("memoryItems").doc(o._id).update({
          data: { status: "superseded", supersededBy: item.content, updatedAt: db.serverDate() }
        });
      }
    }
    await db.collection("memoryItems").add({
      data: {
        openid: openid, kind: item.kind, content: item.content,
        source: "user_confirmed", status: "current",
        evidence: item.evidence, fromProfile: true,
        createdAt: db.serverDate(), updatedAt: db.serverDate()
      }
    });
  }

  for (const item of d.toRemove) {
    await db.collection("memoryItems").doc(item._id).remove();
  }

  return { added: d.toAdd.length, removed: d.toRemove.length };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection("profiles");

  if (event.action === "get") {
    const got = await col.where({ openid: OPENID }).limit(1).get();
    if (got.data.length === 0) return { code: 0, msg: "ok", data: null };
    const p = got.data[0];
    return { code: 0, msg: "ok", data: { basic: p.basic, career: p.career, goals: p.goals, completeness: completeness(p) } };
  }

  if (event.action === "save") {
    const p = event.profile || {};
    if (hasSensitiveData(p)) return { code: 40001, msg: "请勿填写身份证号或手机号" };
    const snapshot = {
      basic: p.basic || {}, career: p.career || {}, goals: p.goals || {},
      confirmedByUser: true, updatedAt: db.serverDate()
    };
    const got = await col.where({ openid: OPENID }).limit(1).get();
    if (got.data.length === 0) {
      await col.add({ data: Object.assign({ openid: OPENID }, snapshot, { completeness: completeness(snapshot) }) });
    } else {
      await col.doc(got.data[0]._id).update({ data: Object.assign({}, snapshot, { completeness: completeness(snapshot) }) });
    }
    const sync = await syncLedger(OPENID, snapshot);
    return { code: 0, msg: "ok", data: { completeness: completeness(snapshot), ledger: sync } };
  }

  return { code: 40000, msg: "unknown action" };
};

exports.syncLedger = syncLedger;
