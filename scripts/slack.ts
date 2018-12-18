import axios from 'axios';
// import sh from 'sh-exec';
import { IncomingWebhookSendArguments } from '@slack/client';

import env from '../common/.env'

const slackWebhook = axios.create({
  baseURL: 'https://hooks.slack.com/services',
  url: `/T72568CHZ/BEAEQ2ZML/${env.SLACK_WEBHOOK_TOKEN}`,
});

const slack = {
  webhook: (data: IncomingWebhookSendArguments) =>
    slackWebhook({
      method: 'POST',
      data,
    }),
};

export default slack;
