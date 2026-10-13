// cloudfunctions/account/index.js - 数据导出与删除（v1.1 §7 合规要求）
const cloud = require("wx-server-sdk");
const { USER_COLLECTIONS, AUDIT_COLLECTION, buildExportPackage, deletionNotice } = require("./scope.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function fetchAll(collection, openid) {
  const out = [];
  const PAGE = 100;
  for (let skip = 0; skip < 2000; skip += PAGE) {
    const got = await db.collection(collection).where({ openid: openid }).skip(skip).limit(PAGE).get();
    const rows = got.data || [];
    out.push.apply(out, rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  if (event.action === "notice") {
    return { code: 0, msg: "ok", data: deletionNotice() };
  }

  if (event.action === "export") {
    const data = {};
    for (const c of USER_COLLECTIONS) {
      try { data[c] = await fetchAll(c, OPENID); } catch (e) { data[c] = []; }
    }
    const pkg = buildExportPackage(OPENID, data);
    const counts = {};
    Object.keys(pkg.collections).forEach(function (k) { counts[k] = pkg.collections[k].length; });
    return { code: 0, msg: "ok", data: { package: pkg, counts: counts } };
  }

  if (event.action === "deleteAll") {
    if (event.confirm !== "DELETE_ALL_MY_DATA") {
      return { code: 40001, msg: "缺少二次确认" };
    }
    const removed = {};
    for (const c of USER_COLLECTIONS) {
      try {
        const rows = await fetchAll(c, OPENID);
        for (const r of rows) {
          try { await db.collection(c).doc(r._id).remove(); } catch (e) { /* 单条失败不阻断 */ }
        }
        removed[c] = rows.length;
      } catch (e) {
        removed[c] = -1;
      }
    }
    // 审计匿名化：保留操作留痕，但断开与账号的关联
    try {
      await db.collection(AUDIT_COLLECTION).add({
        data: {
          openid: "anonymous",
          action: "account.deleteAll",
          detail: { removed: removed, at: Date.now() },
          createdAt: db.serverDate()
        }
      });
    } catch (e) { /* 审计写入失败不影响删除结果 */ }

    return { code: 0, msg: "ok", data: { removed: removed } };
  }

  return { code: 40000, msg: "unknown action" };
};
