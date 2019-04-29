FROM mhart/alpine-node:10
LABEL maintainer="rwu823@gmail.com"

WORKDIR /camera-trap-api

RUN apk add --update --no-cache \
    graphicsmagick \
    openssh \
    git \
    bash

COPY package.json package-lock.json ./

RUN npm i --production && \
  rm -rf ~/.npm

COPY src ./src
COPY config ./config

ENV NODE_ENV="production"
ENV PORT 80

EXPOSE 80
