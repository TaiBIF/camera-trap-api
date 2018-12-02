import slack from './slack'

const { CIRCLE_SHA1 } = process.env;

(async () => {
  const sha1 = CIRCLE_SHA1!.slice(0 , 6);

  await slack.webhook({
    channel: '#04-aws',
    username: 'CircleCI',
    icon_emoji: ':circleci:',
    attachments: [
      {
        text: `<https://github.com/TaiBIF/camera-trap-api/commit/${sha1}|${sha1}> Deploy to AWS Elastic Beanstalk is starting...`,
      }
    ]
  });
})()
