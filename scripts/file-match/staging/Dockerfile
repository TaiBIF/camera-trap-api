FROM phusion/baseimage:0.11
MAINTAINER Chihjen Ko <cjk.halodule at gmail dot com>

# Use baseimage-docker's init system.
CMD ["/sbin/my_init"]

# https://gist.github.com/MichalZalecki/4a87880bbe7a3a5428b5aebebaa5cd97

RUN apt-get update && apt-get install -y sudo \
  zsh \
  curl \
  git-core \
  linuxbrew-wrapper \
  locales \
  awscli \
  wget \
  nfs-common

RUN locale-gen en_US.UTF-8

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN echo 'root:root' | chpasswd
RUN sed -i 's/PermitRootLogin without-password/PermitRootLogin yes/' /etc/ssh/sshd_config
# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

# add a user (--disabled-password: the user won't be able to use the account until the password is set)
ARG USER_NAME="cjk"
ARG USER_PASSWORD="38383838"

RUN adduser --quiet --disabled-password --shell /bin/zsh --home /home/$USER_NAME --gecos "User" $USER_NAME
RUN echo "${USER_NAME}:${USER_PASSWORD}" | chpasswd && usermod -aG sudo $USER_NAME

RUN wget https://www.dropbox.com/s/frtipbora5yboo8/.zshrc_ecs?dl=0
RUN chown -R $USER_NAME:$USER_NAME /home/cjk
