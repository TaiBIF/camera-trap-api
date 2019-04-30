const config = require('config');

exports.inviteMemberInToProject = (user, project) =>
  /*
  Send an email tell the user who was joined a project.
  @param user {UserModel}
  @param project {ProjectModel}
  @returns {Object}
    subject: {string}
    body: {string}
   */
  ({
    subject: `[Camera Trap] 歡迎加入計畫 ${project.title}`,
    body: `
      <p>${user.name} 你好：</p>
      <p>
        邀請您加入${project.title}。<br/>
        請登入<a href="${config.webAppUrl}">網站</a>瀏覽。<br/>
      </p>
      <p>Camera Trap.</p>`,
  });

exports.IssueToSystemAdmin = (issue) =>
  /*
  Send an email to sysadmin when user add an issue
  @param issue {IssueModel}
  @returns {Object}
    subject: {string}
    body: {string}
   */
  ({
    subject: `[Camera Trap] 聯絡我們`,
    body: `
      <p>系統管理員：</p>
      <p>
        回報類型：${issue.type}<br/>
        問題/意見類型：${issue.category}<br/>
        問題/意見描述：${issue.description}<br/>
        電子郵件: ${issue.email}
      </p>
      <p>--</p>`,
  });

exports.IssueToUser = (issue) =>
  /*
  Send an email when someone send a issue
  @param issue {IssueModel}
  @returns {Object}
    subject: {string}
    body: {string}
   */
  ({
    subject: `[Camera Trap] 聯絡我們`,
    body: `
      <p>Camera Trap 使用者您好：</p>
      <p>系統已經收到您的問題/意見回報，請耐心等候我們的回信，感謝！</p>
      <p>
        回報類型：${issue.type}<br/>
        問題/意見類型：${issue.category}<br/>
        問題/意見描述：${issue.description}<br/>
        電子郵件: ${issue.email}
      </p>
      <p>Camera Trap</p>`,
  });
