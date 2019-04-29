FROM mhart/alpine-node:10
LABEL maintainer="rwu823@gmail.com"

RUN apk --update upgrade && \
    apk add curl ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/cache/apk/*

COPY out/ /etc/nginx/
COPY default.conf /etc/nginx/conf.d/
COPY entrypoint.sh /
