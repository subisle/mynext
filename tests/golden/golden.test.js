// tests/golden/golden.test.js - 推演引擎金样例回归（node tests/golden/golden.test.js）
// 每次修改 engine.js 或 SYSTEM_PROMPT 后必须运行（ADR-0002 验收门禁）
"use strict";
const assert = require("assert");
const { SYSTEM_PROMPT, buildUserPrompt, validateOutput } = require("../../cloudfunctions/simulate/engine.js");

// --- buildPrompt 快照断言 ---
const profile = {
  basic: { nickname: "小王", birthDecade: "1995", city: "杭州", note: "膝盖旧伤不能跑步" },
  career: { education: "二本计算机 2017", occupation: "前端工程师，加班多", note: "想转 AI 应用方向" },
  goals: { want: "三年内进大厂或出海远程", worry: "35 岁危机", redlines: "不想考公，不离开杭州" }
};
const up = buildUserPrompt(profile, "三年内跳槽去大厂");
assert(up.includes("『不想考公，不离开杭州』"), "红线必须以引号注入");
assert(up.includes("膝盖旧伤"), "备注必须注入");
assert(!up.includes("undefined"), "不得出现 undefined");

// --- 合法输出必须通过 ---
const good = JSON.stringify({
  branches: [
    { title: "稳健路径：内部转 AI 应用组", narrative: "未来 1 年内先在现公司争取 AI 相关需求…", preconditions: "现公司有 AI 项目机会", keyVariables: "团队意愿；你的前端+提示词基础", tradeoffs: "占用业余学习时间约每周 5 小时", risks: "内部转岗名额不确定；若半年无机会需外部看机会", uncertainties: "缺少公司内部 AI 项目规划信息", weekAction: "今晚 20:30-21:00，整理过去项目中可复用的 AI 场景清单" },
    { title: "渐进转型：本地 AI 应用公司", narrative: "杭州 AI 应用岗位需求上升，半年内投递…", preconditions: "作品集能体现 AI 应用能力", keyVariables: "面试节奏；市场波动", tradeoffs: "跳槽初期稳定下降", risks: "试用期风险；通勤变化", uncertainties: "目标公司真实技术栈未知", weekAction: "周六 10:00-11:00，完成一个可展示的 AI 应用 demo" }
  ]
});
const vg = validateOutput(good);
assert(vg.ok, "合法输出应通过: " + JSON.stringify(vg));

// --- 红线样本必须被拦截 ---
const badProb = JSON.stringify({ branches: [ { title: "a", narrative: "成功概率 83%", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" }, { title: "b", narrative: "x", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" } ] });
assert(!validateOutput(badProb).ok, "伪精确概率必须拦截");

const badStock = JSON.stringify({ branches: [ { title: "a", narrative: "买入 SH600519", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" }, { title: "b", narrative: "x", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" } ] });
assert(!validateOutput(badStock).ok, "具体投资标的必须拦截");

const badIllegal = JSON.stringify({ branches: [ { title: "a", narrative: "可以做刷单兼职快速攒钱", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" }, { title: "b", narrative: "x", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" } ] });
assert(!validateOutput(badIllegal).ok, "违法路径必须拦截");

const badCount = JSON.stringify({ branches: [ { title: "a", narrative: "x", preconditions: "x", keyVariables: "x", tradeoffs: "x", risks: "x", uncertainties: "x", weekAction: "x" } ] });
assert(!validateOutput(badCount).ok, "路径数必须是 2-3");

// --- SYSTEM_PROMPT 红线快照 ---
assert(SYSTEM_PROMPT.includes("不得输出 JSON 以外的任何文字"));
assert(SYSTEM_PROMPT.includes("禁止出现任何精确成功率"));
assert(SYSTEM_PROMPT.includes("不得包含违法"));

console.log("GOLDEN PASS: 7/7 assertions");
