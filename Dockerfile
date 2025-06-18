FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

CMD ["node", "./Target/Cocoon_Single.js"]
