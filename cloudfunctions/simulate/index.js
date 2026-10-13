// cloudfunctions/simulate/index.js - 情景推演（注入事实账本 + 输出红线校验 + 引用留档）
const cloud = require("wx-server-sdk");
const https = require("https");
const { SYSTEM_PROMPT, buildUserPrompt, validateOutput, sanitizeInput } = require("./engine.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function callLLM(systemPrompt, userPrompt) {
  const apiKey = process.env.LLM_API_KEY; // 仅服务端环境变量
  const baseUrl = process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const model = process.env.LLM_MODEL || "deepseek-chat";
  if (!apiKey) return Promise.reject(new Error("LLM_API_KEY not configured"));
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });
  const url = new URL(baseUrl + "/v1/chat/completions");
  return new Promise(function (resolve, reject) {
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 45000
    }, function (res) {
      let d = "";
      res.on("data", function (c) { d += c; });
      res.on("end", function () {
        try {
          const j = JSON.parse(d);
          resolve(j.choices[0].message.content);
        } catch (e) { reject(new Error("bad llm response")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", function () { req.destroy(new Error("llm timeout")); });
    req.write(body);
    req.end();
  });
}

// 账本装载：仅 current 项注入；历史目标保留但标注
async function loadLedger(openid) {
  const got = await db.collection("memoryItems").where({ openid: openid }).limit(200).get();
  const items = got.data || [];
  return {
    facts: items.filter(function (i) { return i.kind === "fact" && i.status === "current" && i.source === "user_confirmed"; }),
    goals: items.filter(function (i) { return i.kind === "goal"; }),
    redlines: items.filter(function (i) { return i.kind === "redline" && i.status === "current"; }),
    inferences: items.filter(function (i) { return i.kind === "inference" || i.source === "ai_inferred"; })
  };
}

exports.main = async (event) => {
  if (event.action !== "run") return { code: 40000, msg: "unknown action" };
  const { OPENID } = cloud.getWXContext();

  // 输入消毒：提示词注入防护
  const san = sanitizeInput(event.topic);
  const topic = san.text.trim().slice(0, 100);
  if (!topic) return { code: 40001, msg: "缺少推演主题" };

  const got = await db.collection("profiles").where({ openid: OPENID }).limit(1).get();
  if (got.data.length === 0) return { code: 40002, msg: "请先完善画像" };
  const profile = got.data[0];

  const ledger = await loadLedger(OPENID);

  // 内容安全（输入）
  try {
    const sec = await cloud.openapi.security.msgSecCheck({ content: topic });
    if (sec && sec.errCode !== 0 && sec.result && sec.result.suggest !== "pass") {
      return { code: 40003, msg: "主题包含不适合的内容，请修改" };
    }
  } catch (e) { /* 安全服务异常：由输出校验兜底，不阻断主流程 */ }

  const knownFactIds = ledger.facts.concat(ledger.goals, ledger.redlines).map(function (i) { return i.id || i._id; });
  const userPrompt = buildUserPrompt(profile, ledger, topic);

  let raw;
  try {
    raw = await callLLM(SYSTEM_PROMPT, userPrompt);
  } catch (e) {
    return { code: 50001, msg: "推演服务繁忙，请稍后再试" };
  }

  const v = validateOutput(raw, { redlines: ledger.redlines, knownFactIds: knownFactIds });
  if (!v.ok) {
    return { code: 50002, msg: "推演结果未通过校验，请重试", debug: v.reason };
  }

  // 可解释性留档：画像快照 + 注入的记忆 id + prompt/模型版本
  const injectedMemoryIds = knownFactIds.filter(function (id) { return userPrompt.indexOf(id) !== -1; });
  await db.collection("simulations").add({
    data: {
      openid: OPENID,
      topic: topic,
      inputFlagged: san.flagged,
      profileSnapshot: { basic: profile.basic, career: profile.career, goals: profile.goals },
      injectedMemoryIds: injectedMemoryIds,
      factsUsed: v.data.factsUsed || [],
      promptVersion: "v1.3-adr0003-1",
      model: process.env.LLM_MODEL || "deepseek-chat",
      branches: v.data.branches,
      createdAt: db.serverDate()
    }
  });

  return { code: 0, msg: "ok", data: { branches: v.data.branches, factsUsed: v.data.factsUsed || [] } };
};
