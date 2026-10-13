// cloudfunctions/visitJob/schedule.js - 静默期与幂等键（纯函数）
"use strict";

const QUIET_START = 22; // 22:00 起静默
const QUIET_END = 7;    // 07:00 结束

function isQuietHour(hour) {
  const h = Number(hour);
  if (Number.isNaN(h)) return true; // 异常值按静默处理，宁可不发
  return h >= QUIET_START || h < QUIET_END;
}

function dateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

// 话术门禁：提醒文案不得使用说教/指责措辞
const FORBIDDEN = ["你本应该", "你应该", "又没", "懒惰", "失败", "不自律", "坚持就能", "为什么不做"];

function checkMessageTone(text) {
  const t = String(text || "");
  const hits = FORBIDDEN.filter(function (w) { return t.indexOf(w) !== -1; });
  return { ok: hits.length === 0, hits: hits };
}

module.exports = { isQuietHour, dateKey, checkMessageTone, QUIET_START, QUIET_END, FORBIDDEN };
