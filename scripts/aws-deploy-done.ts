import slack from './slack'

const { CIRCLE_SHA1 } = process.env;

(async () => {
  const sha1 = CIRCLE_SHA1!.slice(0 , 6);

  await slack.webhook({
    channel: '#04-cameratrap-api',
    username: 'CircleCI',
    icon_emoji: ':circleci:',
    attachments: [
      {
        color: '#54b538',
        text: `\`${sha1}\` Deployment is success.`,
      },
    ],
  });
})()
