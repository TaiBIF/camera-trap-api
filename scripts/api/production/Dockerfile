FROM ubuntu:18.04
LABEL creator="rwu823@gmail.com"
LABEL maintainer1="cjk.halodule@gmail.com"
LABEL maintainer2="dcahsu@gmail.com"
LABEL maintainer3="kelp404@phate.org"

WORKDIR /camera-trap-api

RUN apt-get update && apt-get upgrade -y && apt-get -y install curl sudo git graphicsmagick
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get -y install nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i --production && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

ENV NODE_ENV="production"

EXPOSE 3000

CMD ["node", "src/web-starter"]
