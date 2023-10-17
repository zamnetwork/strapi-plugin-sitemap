FROM node:16-alpine
WORKDIR /opt/app
COPY ./package.json ./yarn.lock ./.npmrc ./
COPY ./src ./src
RUN yarn config set network-timeout 600000 -g && yarn install --production
CMD ["yarn", "start"]
