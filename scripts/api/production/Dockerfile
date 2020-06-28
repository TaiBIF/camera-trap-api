FROM phusion/baseimage:18.04-1.0.0
#FROM phusion/baseimage:0.11
WORKDIR /camera-trap-api

RUN apt-get update && apt-get upgrade -y && apt-get -y install curl git sudo make g++ graphicsmagick imagemagick

RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN sudo apt-get install -y nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm i --production && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

EXPOSE 3000

ENV NODE_ENV="production"

CMD ["node", "--max-old-space-size=8192", "src/web-starter"]
#CMD ["npm", "run", "start"]