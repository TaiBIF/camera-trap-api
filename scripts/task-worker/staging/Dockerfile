FROM ubuntu:18.04

WORKDIR /camera-trap-api

RUN apt-get update && apt-get upgrade -y && apt-get -y install curl sudo git graphicsmagick make g++
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get -y install nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i --production && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

ENV NODE_ENV="staging"
ENV MAGICK_THREAD_LIMIT=1
ENV TZ="Asia/Taipei"

CMD ["node", "--max-old-space-size=8192", "src/task-worker"] & ["node", "src/cron-job"]