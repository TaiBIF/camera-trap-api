FROM mhart/alpine-node:10
LABEL maintainer="rwu823@gmail.com"

WORKDIR /camera-trap-api

RUN apk add --update --no-cache \
    graphicsmagick \
    openssh \
    git \
    bash

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i --production && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

ENV NODE_ENV="staging"

CMD ["node", "src/task-worker"]
