// cloudfunctions/survey/index.js - 探索性自我反思问卷
const cloud = require("wx-server-sdk");
const { score, checkNoLabeling } = require("./score.js");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  if (event.action === "get") {
    const got = await db.collection("surveyAnswers").where({ openid: OPENID }).orderBy("createdAt", "desc").limit(1).get();
    return { code: 0, msg: "ok", data: got.data[0] || null };
  }

  if (event.action === "submit") {
    const result = score(event.answers);
    // 输出守卫
    const guard = checkNoLabeling(result.hints.join(" ") + result.disclaimer);
    if (!guard.ok) return { code: 50001, msg: "问卷结果未通过标签化检查", debug: guard.hits };

    const res = await db.collection("surveyAnswers").add({
      data: {
        openid: OPENID,
        answers: event.answers || {},
        dimensions: result.dimensions,
        hints: result.hints,
        version: "exploratory-v1",
        createdAt: db.serverDate()
      }
    });
    return { code: 0, msg: "ok", data: { id: res._id, dimensions: result.dimensions, hints: result.hints, disclaimer: result.disclaimer } };
  }

  return { code: 40000, msg: "unknown action" };
};
