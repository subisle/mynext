// utils/cloud.js - 统一云函数调用封装
// 目标：页面不再重复写 try/catch 与 toast，写操作自动确保登录
"use strict";

let loginPromise = null;

function ensureLogin() {
  if (loginPromise) return loginPromise;
  const app = getApp();
  if (app && app.globalData && app.globalData.openid) {
    loginPromise = Promise.resolve(app.globalData.openid);
    return loginPromise;
  }
  loginPromise = wx.cloud.callFunction({ name: "user", data: { action: "login" } })
    .then(function (res) {
      const r = res.result || {};
      const openid = (r.data && r.data.openid) || "";
      if (app && app.globalData) app.globalData.openid = openid;
      return openid;
    })
    .catch(function () {
      loginPromise = null;
      return "";
    });
  return loginPromise;
}

/**
 * 调用云函数
 * @param {string} name 云函数名
 * @param {object} data 参数
 * @param {object} [opts] { silent: 不自动 toast, loading: 显示 loading 文案 }
 * @returns {Promise<object>} result.data（失败时 reject 带 message）
 */
function call(name, data, opts) {
  const options = opts || {};
  let loadingShown = false;
  if (options.loading) {
    wx.showLoading({ title: options.loading, mask: true });
    loadingShown = true;
  }
  return wx.cloud.callFunction({ name: name, data: data })
    .then(function (res) {
      const r = res.result || {};
      if (r.code !== 0 && r.code !== undefined) {
        const msg = r.msg || "操作失败";
        if (!options.silent) wx.showToast({ title: msg, icon: "none" });
        const err = new Error(msg);
        err.code = r.code;
        err.debug = r.debug;
        throw err;
      }
      return r.data;
    })
    .catch(function (e) {
      const msg = (e && e.message) || "网络异常，请重试";
      if (!options.silent && !(e && e.code)) wx.showToast({ title: "网络异常，请重试", icon: "none" });
      throw e;
    })
    .then(function (v) {
      if (loadingShown) wx.hideLoading();
      return v;
    }, function (e) {
      if (loadingShown) wx.hideLoading();
      throw e;
    });
}

// 埋点：静默失败，绝不打扰用户
function track(name, payload) {
  wx.cloud.callFunction({ name: "metrics", data: { action: "track", name: name, payload: payload || {} } })
    .catch(function () {});
}

module.exports = { call: call, track: track, ensureLogin: ensureLogin };
