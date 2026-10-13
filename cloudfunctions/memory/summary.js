// cloudfunctions/memory/summary.js - "AI 对你的理解"摘要（纯函数，供测试）
// 设计：可追溯（每条都带来源 id）、可纠错、不贴标签。
"use strict";

const MAX_FACTS = 5;
const MAX_GOALS = 2;
const MAX_REDLINES = 3;

const LABEL_WORDS = ["型人格", "性格缺陷", "懒惰", "失败者", "不适合", "内向型", "外向型", "注定"];

/**
 * 从账本构建理解摘要（确定性，不调用模型）
 * items: [{ _id, kind, content, source, status }]
 */
function buildSummary(items) {
  const list = items || [];
  const facts = list.filter(function (i) { return i.kind === "fact" && i.status !== "superseded"; }).slice(0, MAX_FACTS);
  const goals = list.filter(function (i) { return i.kind === "goal" && i.status === "current"; }).slice(0, MAX_GOALS);
  const redlines = list.filter(function (i) { return i.kind === "redline" && i.status !== "superseded"; }).slice(0, MAX_REDLINES);
  const inferences = list.filter(function (i) { return i.source === "ai_inferred"; });

  const lines = [];
  const refs = [];

  if (facts.length) {
    lines.push("我了解到的情况：" + facts.map(function (f) { return f.content; }).join("；") + "。");
    facts.forEach(function (f) { refs.push(f._id); });
  }
  if (goals.length) {
    lines.push("你给自己定的方向：" + goals.map(function (g) { return g.content; }).join("；") + "。");
    goals.forEach(function (g) { refs.push(g._id); });
  }
  if (redlines.length) {
    lines.push("你划出的红线（我不会推荐）：" + redlines.map(function (r) { return r.content; }).join("；") + "。");
    redlines.forEach(function (r) { refs.push(r._id); });
  }
  if (inferences.length) {
    lines.push("以下是我的推断，还没有经过你确认：" + inferences.map(function (i) { return i.content; }).join("；") + "。");
  }
  if (!lines.length) {
    lines.push("我还没有足够的信息来理解你。你可以在画像或记忆本里补充一些内容。");
  }

  const text = lines.join("\n");

  return {
    text: text,
    refs: refs,
    counts: { facts: facts.length, goals: goals.length, redlines: redlines.length, inferences: inferences.length },
    needsConfirmation: inferences.length > 0,
    question: "以上理解准确吗？如果不准确，请直接纠正，我会记住修正后的版本。"
  };
}

function checkNoLabeling(text) {
  const t = String(text || "");
  const hits = LABEL_WORDS.filter(function (w) { return t.indexOf(w) !== -1; });
  return { ok: hits.length === 0, hits: hits };
}

/** 引用准确率：(确认 + 未纠正) 无法直接算，这里提供单次摘要的引用清单供埋点 */
function citationOf(summary) {
  return (summary && summary.refs) ? summary.refs.slice() : [];
}

module.exports = { buildSummary, checkNoLabeling, citationOf, MAX_FACTS, MAX_GOALS, MAX_REDLINES };
