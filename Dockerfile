FROM node:22-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm cross-env \
	Browser=false \
	Bundle=false \
	Clean=true \
	Compile=false \
	Dependency=Microsoft/VSCode \
	NODE_ENV=development \
	NODE_VERSION=22 \
	NODE_OPTIONS=--max-old-space-size=16384 \
	pnpm prepublishOnly

CMD ["node", "./Target/Skeleton.js"]
