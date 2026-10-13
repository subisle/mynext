// cloudfunctions/plan/adjust.js - 反馈驱动调整（纯函数，供金样例回归测试）
"use strict";

// 规则式降载：确定性、可解释。不羞辱、不催促。
function adjust(status, weekAction, missedStreak) {
  const action = String(weekAction || "");
  const streak = Number(missedStreak || 0);

  if (status === "done") {
    return {
      level: "up",
      reason: "你完成了上一轮行动，可以把步子加大一点。",
      actions: [action + "（在此基础上增加 1 个同类小步骤）"],
      detail: { factor: 1.5, split: false, freezeSuggested: false }
    };
  }
  if (status === "partial") {
    return {
      level: "keep",
      reason: "你完成了一部分，说明方向可行，只是节奏需要微调。",
      actions: [action + "（把剩余部分拆到两个时间段完成）"],
      detail: { factor: 1, split: true, freezeSuggested: false }
    };
  }
  if (status === "missed") {
    const severe = streak >= 1;
    return {
      level: severe ? "freeze-suggest" : "down",
      reason: severe
        ? "连续两轮没有完成，先暂停这个目标周期，避免把压力变成自责。"
        : "上一轮没顾上，先降低负担，把行动拆到能立刻开始的程度。",
      actions: [
        action + "（拆成 2 次，每次不超过 15 分钟）",
        "若本周仍无法开始，只保留 1 次 10 分钟的最小动作"
      ],
      detail: { factor: 0.5, split: true, freezeSuggested: severe }
    };
  }
  return { level: "noop", reason: "无效状态", actions: [], detail: {} };
}

// 话术纪律：不得出现说教/羞辱措辞
const FORBIDDEN_TONE = ["你本应该", "你应该", "又没", "懒惰", "失败", "不自律", "坚持就能"];

function checkTone(text) {
  const t = String(text || "");
  const hits = FORBIDDEN_TONE.filter(function (w) { return t.indexOf(w) !== -1; });
  return { ok: hits.length === 0, hits: hits };
}

module.exports = { adjust, checkTone, FORBIDDEN_TONE };
