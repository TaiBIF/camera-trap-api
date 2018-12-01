import axios from 'axios';
// import sh from 'sh-exec';
import { IncomingWebhookSendArguments } from '@slack/client';
const { SLACK_WEBHOOK_TOKEN, CIRCLE_SHA1 } = process.env;


const slackWebhook = axios.create({
  baseURL: 'https://hooks.slack.com/services',
  url: `/T72568CHZ/BEAEQ2ZML/${SLACK_WEBHOOK_TOKEN ||
    'T6Uolg0tzWLjCqCwYT8MwEu0'}`,
});

const slack = {
  webhook: (data: IncomingWebhookSendArguments) =>
    slackWebhook({
      method: 'POST',
      data,
    }),
};

export default slack;
