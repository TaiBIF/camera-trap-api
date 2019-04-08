const AWS = require('aws-sdk');
const config = require('config');

const templates = {
  'zh-TW': require('./templates/zh-tw'),
};
const ses = new AWS.SES({
  accessKeyId: config.ses.key,
  secretAccessKey: config.ses.secret,
  region: config.ses.region,
});

module.exports = class Mail {
  constructor(args = {}) {
    if (args.languageCode in templates) {
      this.languageCode = args.languageCode;
    } else {
      this.languageCode = 'zh-TW';
    }
    this.source = args.source || config.ses.source;
  }

  sendEmail(args = {}) {
    /*
    @param args {Object}
      to: {Array<string>}
      cc: {Array<string>}
      bcc: {Array<string>}
      subject: {string}
      body: {string} The html content.
     */
    return new Promise((resolve, reject) => {
      const recipients = [];
      (args.to || []).forEach(x => {
        if (x) {
          recipients.push(x);
        }
      });
      (args.cc || []).forEach(x => {
        if (x) {
          recipients.push(x);
        }
      });
      (args.bcc || []).forEach(x => {
        if (x) {
          recipients.push(x);
        }
      });
      if (recipients.length <= 0) {
        // There are no recipients.
        return resolve();
      }

      const params = {
        Source: this.source,
        Destination: {
          ToAddresses: args.to,
          CcAddresses: args.cc,
          BccAddresses: args.bcc,
        },
        Message: {
          Subject: {
            Data: args.subject,
          },
          Body: {
            Html: {
              Data: args.body,
            },
          },
        },
      };
      ses.sendEmail(params, (error, data) => {
        if (error) {
          return reject(error);
        }
        resolve(data);
      });
    });
  }

  sendInviteMemberInToProjectNotification(user, project) {
    /*
    @param user {UserModel}
    @param project {ProjectModel}
     */
    const template = templates[this.languageCode].inviteMemberInToProject(
      user,
      project,
    );
    return this.sendEmail({
      to: [user.email],
      subject: template.subject,
      body: template.body,
    });
  }
};
