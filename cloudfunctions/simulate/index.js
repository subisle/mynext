// cloudfunctions/simulate/index.js - 情景推演
const cloud = require("wx-server-sdk");
const https = require("https");
const { SYSTEM_PROMPT, buildUserPrompt, validateOutput } = require("./engine.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function callLLM(systemPrompt, userPrompt) {
  const apiKey = process.env.LLM_API_KEY; // 仅服务端
  const baseUrl = process.env.LLM_BASE_URL || "https://open.deepseek.com";
  const model = process.env.LLM_MODEL || "deepseek-chat";
  if (!apiKey) return Promise.reject(new Error("LLM_API_KEY not configured"));
  const body = JSON.stringify({
    model, messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], temperature: 0.7, response_format: { type: "json_object" }
  });
  const url = new URL(baseUrl + "/v1/chat/completions");
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey, "Content-Length": Buffer.byteLength(body) },
      timeout: 50000
    }, res => {
      let d = "";
      res.on("data", c => (d += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(d);
          resolve(j.choices[0].message.content);
        } catch (e) { reject(new Error("bad llm response: " + d.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("llm timeout")));
    req.write(body);
    req.end();
  });
}

exports.main = async (event) => {
  if (event.action !== "run") return { code: 40000, msg: "unknown action" };
  const { OPENID } = cloud.getWXContext();
  const topic = String(event.topic || "").trim().slice(0, 100);
  if (!topic) return { code: 40001, msg: "缺少推演主题" };

  const got = await db.collection("profiles").where({ openid: OPENID }).limit(1).get();
  if (got.data.length === 0) return { code: 40002, msg: "请先完善画像" };
  const profile = got.data[0];

  // 输入内容安全（提交到推演前）
  try {
    const sec = await cloud.openapi.security.msgSecCheck({ content: topic });
    if (sec && sec.errCode !== 0 && sec.result && sec.result.suggest !== "pass") {
      return { code: 40003, msg: "主题包含不适合的内容，请修改" };
    }
  } catch (e) { /* 安全接口异常时放行，由输出校验兜底 */ }

  const userPrompt = buildUserPrompt(profile, topic);
  let raw;
  try {
    raw = await callLLM(SYSTEM_PROMPT, userPrompt);
  } catch (e) {
    return { code: 50001, msg: "推演服务繁忙，请稍后再试" };
  }

  const v = validateOutput(raw);
  if (!v.ok) return { code: 50002, msg: "推演结果未通过校验，请重试", debug: v.reason };

  // 留档：画像快照 + 模型与提示词版本（v1.1 第 6.2 节可解释性要求）
  await db.collection("simulations").add({
    data: {
      openid: OPENID, topic,
      profileSnapshot: { basic: profile.basic, career: profile.career, goals: profile.goals },
      promptVersion: "v1.1-adr0002-1", model: process.env.LLM_MODEL || "deepseek-chat",
      branches: v.data.branches, createdAt: db.serverDate()
    }
  });

  return { code: 0, msg: "ok", data: { branches: v.data.branches } };
};
