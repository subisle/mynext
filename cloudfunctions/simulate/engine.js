// cloudfunctions/simulate/engine.js
// 推演引擎：提示词构建 + 输入消毒 + 输出校验（金样例回归对象）
"use strict";

// ===== L1：系统提示词（9 条硬约束 + 历史引用规则）=====
const SYSTEM_PROMPT = [
  "你是 MyNext 的人生情景推演引擎。用户会给你他确认过的个人画像、事实账本和一个推演主题。",
  "",
  "【角色】基于用户确认的事实模拟可能的人生路径，帮助用户看见更多可能。你不是算命，不预测未来。",
  "",
  "【硬约束——违反任何一条即为无效输出】",
  "1. 只允许输出符合下方 JSON Schema 的内容，不得输出 JSON 以外的任何文字。",
  "2. 禁止出现任何精确成功率/概率（如 83%）。用条件、风险等级（低/中/高）和未知因素表达不确定性。",
  "3. 禁止推荐具体投资标的（股票代码、基金名、币种）；财务话题只给原则。",
  "4. 任何路径不得包含违法、违规或灰色行为；用户目标涉及时，引导到合规替代路径。",
  "5. 不提供医疗诊断或法律结论；相关内容引导咨询专业人士。",
  "6. 【红线】用户标注的红线为硬排除项，任何路径的标题、描述、行动都不得包含红线行为。",
  "   如因红线排除了某类选项，在 uncertainties 中说明「已按你的红线排除 X」，不得将其作为候选路径。",
  "7. 时间纪律：只描述 7 天行动与未来 1 年内的情景；不输出更远时间的具体结果断言。",
  "8. 信息不足时：在 uncertainties 中明确列出缺失信息，而不是编造细节。",
  "9. 引用用户事实时用『』标注原话，并在 factsUsed 中列出你引用的记忆 id。",
  "",
  "【历史引用规则】",
  "- 标注为「历史，已变更」的目标只能作为背景说明，不得作为当前事实或当前推演前提。",
  "- 标注为「待用户确认」的推断不得当作事实使用，如需使用请在 uncertainties 中说明。",
  "- 不得编造用户从未说过的话；引用必须是账本中真实存在的条目。",
  "",
  "【输出 JSON Schema】",
  '{ "branches": [ { "title": string, "narrative": string, "preconditions": string,',
  '    "keyVariables": string, "tradeoffs": string, "risks": string,',
  '    "uncertainties": string, "weekAction": string } ],',
  '  "factsUsed": [ string ] }   // 恰好 2-3 条路径；factsUsed 为账本 id 数组，可空',
  "",
  "每条路径的 narrative 描述未来 1 年内的可能阶段变化（可能性，非保证）；",
  "weekAction 必须是当下就能开始、附时间成本估算的具体小步骤。"
].join("\n");

// ===== 输入消毒：提示词注入防护 =====
const INJECTION_PATTERNS = [
  /忽略(以上|上述|之前|前面)(所有)?(指令|规则|要求)/g,
  /(无视|不要理会|忘掉)(以上|上述|之前|前面)?(所有)?(指令|规则|要求)/g,
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)/gi,
  /(system|assistant|developer)\s*[:：]/gi,
  /你现在是|现在开始你是|扮演一个没有限制/g
];

function sanitizeInput(text) {
  const original = String(text == null ? "" : text);
  let cleaned = original;
  const removed = [];
  for (const re of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(re, function (m) { removed.push(m); return "[已过滤]"; });
  }
  return {
    text: cleaned,
    flagged: removed.length > 0,
    removed: removed
  };
}

// ===== L2：提示词构建（注入账本：事实/目标史/红线/待确认推断）=====
function buildUserPrompt(profile, ledger, topic) {
  const p = profile || {};
  const L = ledger || {};
  const lines = [];

  const fmtGroup = function (label, obj) {
    if (!obj) return;
    const kv = Object.keys(obj)
      .filter(function (k) { return String(obj[k] || "").trim(); })
      .map(function (k) { return k + ": " + obj[k]; })
      .join("; ");
    if (kv) lines.push(label + " " + kv);
  };

  lines.push("【用户画像（用户已确认）】");
  fmtGroup("基础：", p.basic);
  fmtGroup("教育职业：", p.career);
  fmtGroup("目标：", p.goals);
  lines.push("");

  const facts = (L.facts || []).filter(function (f) { return f.status !== "expired"; });
  if (facts.length) {
    lines.push("【已确认事实（可作为推演依据）】");
    facts.forEach(function (f) {
      lines.push("- [" + f.id + "] " + f.content + "（来源：用户确认" + (f.evidence ? "，原话『" + f.evidence + "』" : "") + "）");
    });
    lines.push("");
  }

  const goals = L.goals || [];
  if (goals.length) {
    lines.push("【目标与变更史】");
    goals.forEach(function (g) {
      const mark = g.status === "superseded" ? "（历史，已变更）" : "（当前）";
      lines.push("- [" + g.id + "] " + mark + " " + g.content);
    });
    lines.push("");
  }

  const redlines = L.redlines || [];
  if (redlines.length) {
    lines.push("【红线（硬排除，任何路径不得包含）】");
    redlines.forEach(function (r) {
      lines.push("- [" + r.id + "] 『" + r.content + "』");
    });
    lines.push("");
  }

  const inferences = L.inferences || [];
  if (inferences.length) {
    lines.push("【AI 推断（待用户确认，不得当作事实）】");
    inferences.forEach(function (i) {
      lines.push("- [" + i.id + "] " + i.content + "（待用户确认）");
    });
    lines.push("");
  }

  lines.push("【推演主题】" + topic);
  lines.push("");
  lines.push("请生成 2-3 条路径，输出纯 JSON。");
  return lines.join("\n");
}

// ===== L2：输出校验（结构 + 红线 + 合规扫描）=====
function tryParseJson(raw) {
  if (typeof raw !== "string") return null;
  try { return JSON.parse(raw); } catch (e) { /* 继续 */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

const REQUIRED_FIELDS = ["title", "narrative", "preconditions", "keyVariables", "tradeoffs", "risks", "uncertainties", "weekAction"];

// 红线违反检测：关键词出现且附近无否定/排除语义 → 违反
const NEGATION_MARKERS = ["排除", "不考虑", "不推荐", "不选", "避开", "不做", "不包含", "已按你的红线", "不符合"];

// 从红线原文提取可检测的关键词组：
// "不接受负债创业" -> ["负债创业"]；"不想考公" -> ["考公"]；"不离开杭州" -> ["离开杭州"]
const NEGATION_PREFIX = /(不接受|不愿意|不同意|不想要|不想|不要|不能|不会|绝不|拒绝|反对|不)/g;
const FILLER_VERBS = /(接受|同意|考虑|进行|选择|做)/g;

function redlineKeywords(content) {
  const raw = String(content || "");
  const stripped = raw.replace(NEGATION_PREFIX, "").replace(/[，,。；;、\s「」『』"]/g, "");
  const out = [];
  const push = function (s) {
    if (s && s.length >= 2 && out.indexOf(s) === -1) out.push(s);
  };
  push(stripped);
  stripped.split(FILLER_VERBS).forEach(push);
  return out;
}

function redlineViolation(text, redlines) {
  const t = String(text || "");
  for (const r of redlines || []) {
    const kws = redlineKeywords(r.content);
    for (const kw of kws) {
      let idx = t.indexOf(kw);
      while (idx !== -1) {
        const win = t.slice(Math.max(0, idx - 12), idx + kw.length + 12);
        const negated = NEGATION_MARKERS.some(function (m) { return win.indexOf(m) !== -1; });
        if (!negated) return { violated: true, keyword: kw, context: win };
        idx = t.indexOf(kw, idx + 1);
      }
    }
  }
  return { violated: false };
}

function validateOutput(raw, opts) {
  const options = opts || {};
  const obj = tryParseJson(raw);
  if (!obj) return { ok: false, reason: "invalid-json" };

  const branches = obj.branches;
  if (!Array.isArray(branches) || branches.length < 2 || branches.length > 3) {
    return { ok: false, reason: "branch-count" };
  }
  for (const b of branches) {
    for (const k of REQUIRED_FIELDS) {
      if (typeof b[k] !== "string" || !b[k].trim()) return { ok: false, reason: "missing:" + k };
    }
  }

  const all = JSON.stringify(branches);

  if (/\d{1,3}(\.\d+)?\s*%/.test(all) && /成功率|概率|把握|几率/.test(all)) {
    return { ok: false, reason: "pseudo-probability" };
  }
  if (/\b\d{6}\.(SH|SZ|sh|sz)\b|SH\d{6}|SZ\d{6}|\bBTC\b|\bETH\b/.test(all)) {
    return { ok: false, reason: "investment-target" };
  }
  if (/刷单|代考|作弊|洗钱|逃税|偷漏税|赌博|外挂|套现/.test(all)) {
    return { ok: false, reason: "illegal-path" };
  }

  // 红线硬校验（ADR-0003）
  const rv = redlineViolation(all, options.redlines);
  if (rv.violated) return { ok: false, reason: "redline-violation", detail: rv };

  // 引用一致性：factsUsed 必须存在于账本
  const knownIds = options.knownFactIds || [];
  const used = Array.isArray(obj.factsUsed) ? obj.factsUsed : [];
  const unknown = used.filter(function (id) { return knownIds.indexOf(id) === -1; });
  if (unknown.length) return { ok: false, reason: "unknown-citation", detail: unknown };

  return { ok: true, data: { branches: branches, factsUsed: used } };
}

// 引用提取（用于"历史引用准确率"指标）
function extractCitationIds(text, knownIds) {
  const t = String(text || "");
  const ids = [];
  for (const id of knownIds || []) {
    if (t.indexOf(id) !== -1) ids.push(id);
  }
  return ids;
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt, validateOutput, sanitizeInput, redlineViolation, extractCitationIds };
