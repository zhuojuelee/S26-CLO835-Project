# syntax=docker/dockerfile:1

FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable
RUN yarn workspace @clo835-project/shared build
RUN yarn workspace @clo835-project/task-orchestrator build

FROM node:26.5.0-slim AS runtime

ENV PORT=3001

WORKDIR /app

COPY --from=build /app/packages/task-orchestrator/dist ./dist

EXPOSE 3001
USER node

CMD ["node", "dist/index.mjs"]
