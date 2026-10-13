// cloudfunctions/profile/ledger.js - 画像到记忆账本的映射（纯函数，供测试）
// 目的：用户在画像里写的目标/红线/备注，必须真正进入推演上下文，而不是只存在 profile 里。
"use strict";

const MAX_ITEMS = 12;

function clean(s) {
  return String(s == null ? "" : s).trim();
}

// 红线字段可能包含多条，用常见分隔符切分
function splitRedlines(raw) {
  return clean(raw)
    .split(/[，,；;、\n|]/)
    .map(clean)
    .filter(function (x) { return x.length >= 2; })
    .slice(0, 5);
}

// 备注字段可能是长文本，切成可引用的独立事实
function splitNotes(raw) {
  return clean(raw)
    .split(/[。；;\n]/)
    .map(clean)
    .filter(function (x) { return x.length >= 2; })
    .slice(0, 4);
}

/**
 * 把画像映射为记忆条目（不产生 id —— id 由数据库生成）
 * 返回 [{ kind, content, evidence, dedupeKey }]
 */
function profileToLedgerItems(profile) {
  const p = profile || {};
  const out = [];
  const seen = {};

  function push(kind, content, evidence) {
    const c = clean(content);
    if (c.length < 2) return;
    const key = kind + "|" + c;
    if (seen[key]) return;
    seen[key] = true;
    out.push({ kind: kind, content: c, evidence: clean(evidence || c), dedupeKey: key });
  }

  // 1) 基础与职业的结构化字段 → 事实
  const basic = p.basic || {};
  const basicMap = [["nickname", "称呼"], ["birthDecade", "出生年代"], ["city", "所在城市"]];
  basicMap.forEach(function (pair) {
    if (clean(basic[pair[0]])) push("fact", pair[1] + "：" + clean(basic[pair[0]]), clean(basic[pair[0]]));
  });
  splitNotes(basic.note).forEach(function (n) { push("fact", n, n); });

  const career = p.career || {};
  if (clean(career.education)) push("fact", "教育背景：" + clean(career.education), clean(career.education));
  if (clean(career.occupation)) push("fact", "职业情况：" + clean(career.occupation), clean(career.occupation));
  splitNotes(career.note).forEach(function (n) { push("fact", n, n); });

  // 2) 目标 → goal 类型（更新时旧目标由 memory 云函数置为 superseded）
  const goals = p.goals || {};
  if (clean(goals.want)) push("goal", clean(goals.want), clean(goals.want));
  if (clean(goals.worry)) push("fact", "当前顾虑：" + clean(goals.worry), clean(goals.worry));
  splitNotes(goals.note).forEach(function (n) { push("fact", n, n); });

  // 3) 红线 → redline 类型（硬约束）
  splitRedlines(goals.redlines).forEach(function (r) { push("redline", r, r); });

  return out.slice(0, MAX_ITEMS);
}

/** 生成画像变更摘要：返回需要新增 / 已被移除的条目（用于同步时保留纠错过的条目） */
function diffLedger(existing, desired) {
  const existKeys = {};
  (existing || []).forEach(function (e) { existKeys[e.kind + "|" + e.content] = e; });
  const desiredKeys = {};
  (desired || []).forEach(function (d) { desiredKeys[d.dedupeKey] = true; });

  const toAdd = (desired || []).filter(function (d) { return !existKeys[d.dedupeKey]; });
  // 仅当条目来源为 profile（带 fromProfile 标记）时才考虑移除，避免删掉用户手动添加的内容
  const toRemove = (existing || []).filter(function (e) {
    return e.fromProfile === true && e.source === "user_confirmed" && !desiredKeys[e.kind + "|" + e.content];
  });
  return { toAdd: toAdd, toRemove: toRemove };
}

module.exports = { profileToLedgerItems, diffLedger, splitRedlines, splitNotes, MAX_ITEMS };
