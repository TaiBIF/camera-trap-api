FROM ubuntu:18.04
LABEL maintainer="rwu823@gmail.com"

WORKDIR /camera-trap-api

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get -y install curl sudo git
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get -y install nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i --production && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

ENV NODE_ENV="staging"

CMD ["node", "src/cron-job"]
