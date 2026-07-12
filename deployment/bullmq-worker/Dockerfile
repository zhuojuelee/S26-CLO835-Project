FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable
RUN yarn workspace @clo835-project/shared build
RUN yarn workspace @clo835-project/bullmq-worker build

FROM node:26.5.0-slim AS runner

WORKDIR /app

COPY --from=build /app/packages/bullmq-worker/dist ./dist

USER node

CMD ["node", "dist/index.mjs"]
