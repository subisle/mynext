// cloudfunctions/plan/state.js - 目标周期冻结规则（纯函数，供测试）
"use strict";

const FREEZE_DAYS = 14;      // 冻结时长
const MISSED_THRESHOLD = 2;  // 连续未完成阈值

/**
 * 是否建议冻结：连续未完成达到阈值
 */
function shouldSuggestFreeze(missedStreak) {
  return Number(missedStreak || 0) >= MISSED_THRESHOLD;
}

/** 冻结状态记录 */
function buildFreezeState(openid, reason, days) {
  const d = Number(days || FREEZE_DAYS);
  const until = new Date(Date.now() + d * 24 * 3600 * 1000);
  return {
    openid: openid,
    frozen: true,
    reason: reason || "连续未完成，先暂停目标周期，避免把压力变成自责。",
    frozenUntil: until,
    days: d
  };
}

/** 冻结是否仍然有效（到期自动解冻，不产生催促） */
function isFrozen(state, now) {
  if (!state || !state.frozen) return false;
  const t = now ? new Date(now) : new Date();
  const until = state.frozenUntil ? new Date(state.frozenUntil) : null;
  if (!until) return true;
  return until.getTime() > t.getTime();
}

/** 冻结期间的提醒策略：不发任何行动提醒，只在到期时提醒一次 */
function reminderPolicy(state, now) {
  if (!isFrozen(state, now)) return { send: true, kind: "normal" };
  return { send: false, kind: "frozen" };
}

module.exports = { shouldSuggestFreeze, buildFreezeState, isFrozen, reminderPolicy, FREEZE_DAYS, MISSED_THRESHOLD };
