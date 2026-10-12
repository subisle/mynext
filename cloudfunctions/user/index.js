// cloudfunctions/user/index.js - 登录
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const now = db.serverDate();
  const users = db.collection("users");
  try {
    const got = await users.where({ openid: OPENID }).limit(1).get();
    if (got.data.length === 0) {
      await users.add({ data: { openid: OPENID, createdAt: now, lastLoginAt: now } });
    } else {
      await users.doc(got.data[0]._id).update({ data: { lastLoginAt: now } });
    }
    return { code: 0, msg: "ok", data: { openid: OPENID } };
  } catch (e) {
    return { code: 50001, msg: "login failed", err: e.message };
  }
};
