// cloudfunctions/profile/index.js - 画像存取与完整度
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 敏感信息拦截：身份证 / 手机号
function hasSensitiveData(obj) {
  const s = JSON.stringify(obj);
  return /\b\d{17}[0-9Xx]\b/.test(s) || /\b1[3-9]\d{9}\b/.test(s);
}

function completeness(p) {
  const groups = ["basic", "career", "goals"];
  let done = 0;
  for (const g of groups) {
    const v = p && p[g];
    if (v && Object.keys(v).length > 0 && Object.values(v).some(x => String(x || "").trim())) done++;
  }
  return done / 3;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection("profiles");
  const now = db.serverDate();

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
      confirmedByUser: true, updatedAt: now
    };
    const got = await col.where({ openid: OPENID }).limit(1).get();
    if (got.data.length === 0) {
      await col.add({ data: { openid: OPENID, ...snapshot, completeness: completeness(snapshot) } });
    } else {
      await col.doc(got.data[0]._id).update({ data: { ...snapshot, completeness: completeness(snapshot) } });
    }
    return { code: 0, msg: "ok", data: { completeness: completeness(snapshot) } };
  }

  return { code: 40000, msg: "unknown action" };
};
