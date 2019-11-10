FROM phusion/baseimage:0.11
WORKDIR /camera-trap-api

# ARG SSH_KEY
# RUN echo "$SSH_KEY"
# RUN echo "$SSH_KEY" > /root/.ssh/id_rsa
# RUN chmod 600 /root/.ssh/id_rsa
# RUN touch /root/.ssh/known_hosts
# RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

RUN apt-get update && apt-get upgrade -y && apt-get -y install curl sudo git graphicsmagick imagemagick make g++
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get -y install nodejs

COPY package.json package-lock.json ./
COPY node_modules/camera-trap-credentials ./node_modules/camera-trap-credentials

RUN npm --version && node --version
RUN --mount=type=ssh npm i && \
  rm -rf ~/.npm package-lock.json

COPY src ./src
COPY config ./config

EXPOSE 3000

ENV NODE_ENV="staging"

CMD ["node", "--max-old-space-size=8192", "src/web-starter"]
