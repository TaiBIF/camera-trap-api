FROM phusion/baseimage:0.11
MAINTAINER Chihjen Ko <cjk.halodule at gmail dot com>"

# Use baseimage-docker's init system.
CMD ["/sbin/my_init"]

# https://gist.github.com/MichalZalecki/4a87880bbe7a3a5428b5aebebaa5cd97

RUN mkdir -p /etc/my_init.d
COPY logtime.sh /etc/my_init.d/logtime.sh
RUN chmod +x /etc/my_init.d/logtime.sh

RUN echo /root > /etc/container_environment/HOME

ARG USER_NAME="cjk"
ARG USER_PASSWORD="38383838"

ENV USER_NAME $USER_NAME
ENV USER_PASSWORD $USER_PASSWORD
ENV CONTAINER_IMAGE_VER=v1.0.0

RUN echo $USER_NAME
RUN echo $USER_PASSWORD
RUN echo $CONTAINER_IMAGE_VER

# install the tooks i wish to use
RUN apt-get update && \
  apt-get install -y sudo \
  openssh-server \
  unzip \
  pkg-config \
  curl \
  git-core \
  linuxbrew-wrapper \
  locales \
  zsh \
  wget

RUN mkdir /var/run/sshd
RUN echo 'root:root' | chpasswd
RUN sed -i 's/PermitRootLogin without-password/PermitRootLogin yes/' /etc/ssh/sshd_config
# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

RUN mkdir /root/.ssh

# add a user (--disabled-password: the user won't be able to use the account until the password is set)
RUN  adduser --quiet --disabled-password --shell /bin/zsh --home /home/$USER_NAME --gecos "User" $USER_NAME
  # update the password
RUN  echo "${USER_NAME}:${USER_PASSWORD}" | chpasswd && usermod -aG sudo $USER_NAME

RUN su - cjk
RUN mkdir -p /home/$USER_NAME/.ssh
RUN cd /home/$USER_NAME

# the user we're applying this too (otherwise it most likely install for root)
USER $USER_NAME
# terminal colors with xterm
ENV TERM xterm-256color
# set the zsh theme
ENV ZSH_THEME spaceship

# run the installation script
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /home/$USER_NAME

EXPOSE 22

# start zsh
CMD [ "zsh" ]

