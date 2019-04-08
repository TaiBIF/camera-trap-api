const config = require('config');

module.exports = {
  inviteMemberInToProject(user, project) {
    /*
    Send an email tell the user who was joined a project.
    @param user {UserModel}
    @param project {ProjectModel}
    @returns {Object}
      subject: {string}
      body: {string}
     */
    return {
      subject: `[Camera Trap] 歡迎加入計畫 ${project.title}`,
      body: `
        <p>${user.name} 你好：</p>
        <p>
          邀請您加入${project.title}。<br/>
          請登入<a href="${config.webAppUrl}">網站</a>瀏覽。<br/>
        </p>
        <p>Camera Trap.</p>`,
    };
  },
};
