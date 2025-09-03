FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

USER node

CMD ["pnpm", "start"]
