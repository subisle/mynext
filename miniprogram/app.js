// MyNext - app entry
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error("wx.cloud 不可用，请升级基础库 >= 2.2.3");
      return;
    }
    wx.cloud.init({
      env: "mynext-prod", // TODO: 替换为实际云环境 ID
      traceUser: true
    });
  }
});
