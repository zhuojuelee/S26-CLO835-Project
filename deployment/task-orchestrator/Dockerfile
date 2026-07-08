# syntax=docker/dockerfile:1

FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable
RUN yarn workspace @clo835-project/shared build
RUN yarn workspace @clo835-project/task-orchestrator build

FROM node:26.5.0-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/yarn.lock ./yarn.lock
COPY --from=build /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/task-orchestrator/package.json ./packages/task-orchestrator/package.json
COPY --from=build /app/packages/task-orchestrator/dist ./packages/task-orchestrator/dist

WORKDIR /app/packages/task-orchestrator

EXPOSE 3001
USER node

CMD ["node", "dist/index.js"]
