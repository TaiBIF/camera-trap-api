#LABEL creator="rwu823@gmail.com"
#LABEL maintainer1="cjk.halodule@gmail.com"
#LABEL maintainer2="dcahsu@gmail.com"
#LABEL maintainer3="kelp404@phate.org"

FROM phusion/baseimage:18.04-1.0.0
WORKDIR /camera-trap-api

RUN apt-get update && apt-get upgrade -y && apt-get -y install curl git sudo make g++ graphicsmagick imagemagick

RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN sudo apt-get install -y nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

EXPOSE 3000

ENV NODE_ENV="docker"

#CMD ["npm", "src/web-starter"]
CMD ["npm", "run", "start"]
