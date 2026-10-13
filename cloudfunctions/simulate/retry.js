// cloudfunctions/simulate/retry.js - 输出未过校验时的修正指令（纯函数）
"use strict";

const REASON_HINT = {
  "invalid-json": "上一次输出不是合法 JSON。请只输出 JSON 对象，不要任何解释文字或代码围栏。",
  "branch-count": "路径数量必须是 2 到 3 条。请调整数量后重新输出。",
  "missing:title": "每条路径都必须有 title 字段，且不能为空。",
  "missing:narrative": "每条路径都必须有 narrative 字段描述未来 1 年内的可能阶段变化。",
  "missing:preconditions": "每条路径都必须有 preconditions 字段说明成立条件。",
  "missing:keyVariables": "每条路径都必须有 keyVariables 字段。",
  "missing:tradeoffs": "每条路径都必须有 tradeoffs 字段说明机会与代价。",
  "missing:risks": "每条路径都必须有 risks 字段说明风险与预警信号。",
  "missing:uncertainties": "每条路径都必须有 uncertainties 字段列出信息缺口。",
  "missing:weekAction": "每条路径都必须有 weekAction 字段，且是当下就能开始的具体小步骤。",
  "pseudo-probability": "禁止出现任何成功率或概率数字。请改用条件、风险等级（低/中/高）和未知因素表达。",
  "investment-target": "禁止推荐具体投资标的（股票代码、基金名、币种）。财务内容只给原则。",
  "illegal-path": "路径不得包含任何违法、违规或灰色行为，请替换为合规路径。",
  "redline-violation": "输出违反了用户红线。红线是硬排除项，任何路径都不得包含，必要时在 uncertainties 中说明已排除。",
  "unknown-citation": "factsUsed 中出现了账本里不存在的 id。只能引用提供给你的 id，或留空数组。"
};

/** 生成重试指令：让模型明确知道上一次哪里不合格 */
function retryHint(reason, detail) {
  const base = REASON_HINT[reason] || "上一次输出未通过格式与合规校验，请严格按照 Schema 重新输出。";
  const extra = detail ? "\n（细节：" + JSON.stringify(detail) + "）" : "";
  return base + extra;
}

/** 是否值得重试：结构类与合规类都值得重试一次；模型超时等由调用方决定 */
function isRetryable(reason) {
  return !!REASON_HINT[reason];
}

module.exports = { retryHint, isRetryable, REASON_HINT };
