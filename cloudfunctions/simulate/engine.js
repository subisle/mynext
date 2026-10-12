// cloudfunctions/simulate/engine.js - 推演提示词构建与输出校验（供金样例回归测试）
"use strict";

// v1.1 设计文档 3.2 + ADR-0002 范围：七要素输出、无伪精确概率、无投资标的、无违法路径
const SYSTEM_PROMPT = [
  "你是 MyNext 的人生情景推演引擎。用户会给你他确认过的个人画像和一个推演主题。",
  "",
  "【角色】基于用户画像模拟可能的人生路径，帮助用户看见更多可能。你不是算命，不预测未来。",
  "",
  "【硬约束——违反任何一条即为无效输出】",
  "1. 只允许输出符合下方 JSON Schema 的内容，不得输出 JSON 以外的任何文字。",
  "2. 禁止出现任何精确成功率/概率（如 83%）。用条件、风险等级（低/中/高）和未知因素表达不确定性。",
  "3. 禁止推荐具体投资标的（股票代码、基金名、币种）；财务话题只给原则。",
  "4. 任何路径不得包含违法、违规或灰色行为；用户目标涉及时，引导到合规替代路径。",
  "5. 不提供医疗诊断或法律结论；相关内容引导咨询专业人士。",
  "6. 用户画像中的红线（不想做的事）必须硬排除，不得出现在任何路径中。",
  "7. 时间纪律：只描述 7 天行动与未来 1 年内的情景；不输出更远时间的具体结果断言。",
  "8. 信息不足时：在 uncertainties 中明确列出缺失信息，而不是编造细节。",
  "9. 引用用户备注原话时用『』标注，让用户感到被理解。",
  "",
  "【输出 JSON Schema】",
  '{ "branches": [ { "title": string, "narrative": string, "preconditions": string,',
  '    "keyVariables": string, "tradeoffs": string, "risks": string,',
  '    "uncertainties": string, "weekAction": string } ] }  // 恰好 2-3 条',
  "",
  "每条路径的 narrative 描述未来 1 年内的可能阶段变化（可能性，非保证）；",
  "weekAction 必须是当下就能开始、附时间成本估算的具体小步骤。"
].join("\n");

function buildUserPrompt(profile, topic) {
  const p = profile || {};
  const fmt = (label, obj) => {
    if (!obj) return "";
    const kv = Object.entries(obj).filter(([, v]) => String(v || "").trim())
      .map(([k, v]) => k + ": " + v).join("; ");
    return kv ? label + " " + kv + "\n" : "";
  };
  return [
    "【用户画像（用户已确认）】",
    fmt("基础：", p.basic),
    fmt("教育职业：", p.career),
    fmt("目标：", p.goals),
    p.goals && p.goals.redlines ? "红线（硬排除，任何路径不得包含）：『" + p.goals.redlines + "』\n" : "",
    "【推演主题】" + topic,
    "",
    "请生成 2-3 条路径，输出纯 JSON。"
  ].filter(Boolean).join("\n");
}

// 输出校验：JSON 结构 + 红线词扫描
function validateOutput(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    // 容错：剥掉可能的 markdown 代码围栏
    const m = raw && raw.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, reason: "no-json" };
    try { obj = JSON.parse(m[0]); } catch (e2) { return { ok: false, reason: "bad-json" }; }
  }
  const branches = obj && obj.branches;
  if (!Array.isArray(branches) || branches.length < 2 || branches.length > 3) {
    return { ok: false, reason: "branch-count" };
  }
  const required = ["title", "narrative", "preconditions", "keyVariables", "tradeoffs", "risks", "uncertainties", "weekAction"];
  for (const b of branches) {
    for (const k of required) {
      if (typeof b[k] !== "string" || !b[k].trim()) return { ok: false, reason: "missing:" + k };
    }
  }
  const all = JSON.stringify(branches);
  // 红线扫描：伪精确概率、具体投资标的形态、违法关键词
  if (/\d{1,3}(\.\d+)?\s*%/.test(all) && /成功率|概率|把握/.test(all)) return { ok: false, reason: "pseudo-probability" };
  if (/\b\d{6}\.\w{2}\b|SH\d{6}|SZ\d{6}|BTC|ETH\b/i.test(all)) return { ok: false, reason: "investment-target" };
  if (/刷单|代考|作弊|洗钱|逃税|偷漏税|赌博|外挂/.test(all)) return { ok: false, reason: "illegal-path" };
  return { ok: true, data: { branches } };
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt, validateOutput };
