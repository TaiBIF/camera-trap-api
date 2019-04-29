FROM node:12

WORKDIR /app-src

ADD . /app-src
# RUN npm install

RUN mkdir node_modules
RUN git clone "https://${GITHUB_TOKEN}@github.com/TaiBIF/camera-trap-credentials.git" node_modules/

EXPOSE 3000
CMD node demo-app.js
