// cloudfunctions/account/scope.js - 数据导出与级联删除范围（纯函数，供测试）
"use strict";

// 与用户相关的全部集合（导出与删除必须覆盖同一份清单，避免遗漏派生的个人信息）
const USER_COLLECTIONS = [
  "users",
  "profiles",
  "memoryItems",
  "simulations",
  "actionFeedbacks",
  "adjustments",
  "surveyAnswers",
  "metricsEvents",
  "subscriptions",
  "pushLogs",
  "goalStates"
];

// 审计日志：删除时保留但做匿名化处理（合规要求可留痕，但不再关联到已删除的用户）
const AUDIT_COLLECTION = "auditLog";

/**
 * 导出结果的可读化处理：剔除内部字段，避免导出无用数据
 */
function sanitizeForExport(records) {
  return (records || []).map(function (r) {
    const o = Object.assign({}, r);
    delete o.openid;          // 不导出用户标识
    delete o._openid;
    return o;
  });
}

/** 导出包结构（供下载与自查） */
function buildExportPackage(userId, data) {
  const d = data || {};
  const out = {
    format: "mynext-export-v1",
    exportedAt: new Date().toISOString(),
    note: "这是 MyNext 为你导出的全部数据。其中不包含任何身份标识信息。",
    collections: {}
  };
  USER_COLLECTIONS.forEach(function (c) {
    if (d[c]) out.collections[c] = sanitizeForExport(d[c]);
  });
  return out;
}

/** 删除确认文案：必须让用户知道删了什么、不能删什么 */
function deletionNotice() {
  return {
    title: "删除我的全部数据",
    detail: [
      "将删除：画像、记忆条目、推演记录、行动反馈、问卷结果、订阅与推送记录、埋点事件。",
      "审计日志会保留，但其中的用户标识会被匿名化，不再与你的账号关联。",
      "删除后无法恢复，AI 将不再记得你。"
    ]
  };
}

module.exports = { USER_COLLECTIONS, AUDIT_COLLECTION, sanitizeForExport, buildExportPackage, deletionNotice };
