const config = require('config');
const IssueType = require('../../../models/const/issue-type');
const IssueCategory = require('../../../models/const/issue-category');

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

exports.notifyAdministratorGotIssue = issue =>
  /*
  Send an email to sysadmin when user add an issue
  @param issue {IssueModel}
  @returns {Object}
    subject: {string}
    body: {string}
   */
  ({
    subject: `[Camera Trap] 聯絡我們-使用者提出問題`,
    body: `
      <p>系統管理員：</p>
      <p>
        回報類型：${IssueType.dict(issue.type)}<br/>
        問題/意見類型：${issue.categories
          .map(x => IssueCategory.dict(x))
          .join(', ')}<br/>
        電子郵件：${issue.email}<br/>
        ${
          issue.attachmentFile
            ? `附件：<a href="${issue.attachmentFile.getUrl()}">${issue.attachmentFile.getUrl()}</a>`
            : ''
        }
      </p>
      <p>
        <pre>${issue.description}</pre>
      </p>
      <p>Camera Trap.</p>`,
  });
