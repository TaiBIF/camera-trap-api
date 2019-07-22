

ENV USER_NAME $USER_NAME
ENV USER_PASSWORD $USER_PASSWORD
ENV CONTAINER_IMAGE_VER=v1.0.0

#RUN echo -e $USER_NAME > /etc/container_environment/USER_NAME
#RUN echo -e $USER_PASSWORD > /etc/container_environment/USER_PASSWORD
#RUN echo -e "v0.0.1" > /etc/container_environment/CONTAINER_IMAGE_VER
#RUN echo -e "xterm-256color" > /etc/container_environment/TERM
#RUN echo -e "spaceship" > /etc/container_environment/ZSH_THEME

RUN echo $USER_NAME
RUN echo $USER_PASSWORD
RUN echo $CONTAINER_IMAGE_VER

RUN export DEBIAN_FRONTEND=noninteractive
RUN export LANGUAGE=en_US.UTF-8
RUN export LANG=en_US.UTF-8
RUN export LC_ALL=en_US.UTF-8
RUN locale-gen en_US.UTF-8

#RUN echo /home/cjk > /etc/container_environment/HOME

FROM ubuntu:latest

ARG USER_NAME="dockerdude"
ARG USER_PASSWORD="p@$$w0d"

ENV USER_NAME $USER_NAME
ENV USER_PASSWORD $USER_PASSWORD
ENV CONTAINER_IMAGE_VER=v1.0.0

RUN echo $USER_NAME
RUN echo $USER_PASSWORD
RUN echo $CONTAINER_IMAGE_VER

# install the tooks i wish to use
RUN apt-get update && \
  apt-get install -y sudo \
  curl \
  git-core \
  gnupg \
  linuxbrew-wrapper \
  locales \
  nodejs \
  zsh \
  wget \
  nano \
  npm \
  fonts-powerline \
  # set up locale
  && locale-gen en_US.UTF-8

# add a user (--disabled-password: the user won't be able to use the account until the password is set)
ARG USER_NAME="cjk"
ARG USER_PASSWORD="38383838"

RUN adduser --quiet --disabled-password --shell /bin/zsh --home /home/$USER_NAME --gecos "User" $USER_NAME
  # update the password
RUN echo "${USER_NAME}:${USER_PASSWORD}" | chpasswd && usermod -aG sudo $USER_NAME
RUN chown -R $USER_NAME:$USER_NAME /home/cjk

USER $USER_NAME
RUN mkdir -p /home/$USER_NAME/.ssh
RUN cd /home/$USER_NAME



  # start zsh
  CMD [ "zsh" ]

RUN apt-get update --fix-missing && apt-get autoremove && apt-get clean && apt-get install -y sudo \
  openssh-server \
  unzip \
  pkg-config \
  curl \
  git-core \
  linuxbrew-wrapper \
  zsh \
  wget

ENV TERM xterm-256color
ENV ZSH_THEME spaceship

# run the installation script
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

