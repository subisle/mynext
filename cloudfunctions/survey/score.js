// cloudfunctions/survey/score.js - 探索性问卷评分（纯函数，供测试）
// 重要：这是产品自编的"生活决策偏好"问卷，不是标准化人格测评。
// 输出仅用于个性化行动风格，禁止用来给人贴标签或排除人生路径。
"use strict";

const DIMENSIONS = {
  q1: { key: "riskStyle", options: { a: "small-step", b: "info-first", c: "act-fast" } },
  q2: { key: "structurePreference", options: { a: "structured", b: "flexible" } },
  q3: { key: "decisionSource", options: { a: "self", b: "consult" } },
  q4: { key: "energySource", options: { a: "solo", b: "social" } },
  q5: { key: "valuePriority", options: { a: "stability", b: "growth", c: "income", d: "freedom" } }
};

// 行动风格提示：只描述"计划怎么设计"，不下人格结论
const HINTS = {
  riskStyle: {
    "small-step": "建议把新方向拆成可验证的小实验，先试再定。",
    "info-first": "建议先补齐关键信息（岗位要求、时间成本）再决定。",
    "act-fast": "建议设定一个短期截止点，避免一直停留在准备阶段。"
  },
  structurePreference: {
    structured: "建议给每周安排固定时段，用清单推进。",
    flexible: "建议只定大方向和每周 1-2 个关键动作，留出调整空间。"
  },
  decisionSource: {
    self: "建议保留自己的判断为主，同时记录决策依据便于复盘。",
    consult: "建议在决定前找 1-2 个可信的人验证你的想法。"
  },
  energySource: {
    solo: "建议把深度任务安排在独处时段。",
    social: "建议用同伴或学习小组来维持推进节奏。"
  },
  valuePriority: {
    stability: "建议在选择时优先评估风险下限和现金流安全。",
    growth: "建议优先评估能力增长空间，接受短期波动。",
    income: "建议优先评估收入弹性和可变现路径。",
    freedom: "建议优先评估自主度和时间支配权。"
  }
};

function score(answers) {
  const a = answers || {};
  const result = {};
  const hints = [];
  const missing = [];

  Object.keys(DIMENSIONS).forEach(function (qid) {
    const dim = DIMENSIONS[qid];
    const choice = a[qid];
    if (!choice || !dim.options[choice]) { missing.push(qid); return; }
    const value = dim.options[choice];
    result[dim.key] = value;
    if (HINTS[dim.key] && HINTS[dim.key][value]) hints.push(HINTS[dim.key][value]);
  });

  return {
    dimensions: result,
    hints: hints,
    answered: Object.keys(result).length,
    missing: missing,
    label: "探索性问卷结果",
    disclaimer: "这是 MyNext 自编的探索性问卷，用于调整行动建议的表达方式，不是经过验证的标准化人格测评，也不用于判断你的能力或人生上限。"
  };
}

// 输出守卫：不得出现定型/评价性标签
const LABEL_WORDS = ["型人格", "性格缺陷", "懒惰", "失败者", "不适合", "内向型", "外向型", "你就是这样的人"];

function checkNoLabeling(text) {
  const t = String(text || "");
  const hits = LABEL_WORDS.filter(function (w) { return t.indexOf(w) !== -1; });
  return { ok: hits.length === 0, hits: hits };
}

module.exports = { score, checkNoLabeling, DIMENSIONS, HINTS, LABEL_WORDS };
