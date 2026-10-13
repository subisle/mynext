// cloudfunctions/notify/index.js - 订阅消息授权记录与状态查询
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection("subscriptions");

  if (event.action === "save") {
    // 客户端 wx.requestSubscribeMessage 的结果
    const accepted = !!event.accepted;
    const dailyVisit = !!event.dailyVisit;
    const got = await col.where({ openid: OPENID }).limit(1).get();
    const data = {
      authorized: accepted,
      dailyVisit: dailyVisit,
      templateId: String(event.templateId || "").slice(0, 128),
      updatedAt: db.serverDate()
    };
    if (got.data.length === 0) {
      await col.add({ data: Object.assign({ openid: OPENID, createdAt: db.serverDate() }, data) });
    } else {
      await col.doc(got.data[0]._id).update({ data: data });
    }
    return { code: 0, msg: "ok", data: { authorized: accepted, dailyVisit: dailyVisit } };
  }

  if (event.action === "status") {
    const got = await col.where({ openid: OPENID }).limit(1).get();
    if (got.data.length === 0) return { code: 0, msg: "ok", data: { authorized: false, dailyVisit: false } };
    return { code: 0, msg: "ok", data: { authorized: !!got.data[0].authorized, dailyVisit: !!got.data[0].dailyVisit } };
  }

  if (event.action === "disable") {
    const got = await col.where({ openid: OPENID }).limit(1).get();
    if (got.data.length) {
      await col.doc(got.data[0]._id).update({ data: { dailyVisit: false, updatedAt: db.serverDate() } });
    }
    return { code: 0, msg: "ok" };
  }

  return { code: 40000, msg: "unknown action" };
};
