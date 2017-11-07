FROM node:8.9.0

WORKDIR /probot-app-deploy

COPY package.json yarn.lock /probot-app-deploy/

RUN yarn
