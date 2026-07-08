# syntax=docker/dockerfile:1

FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable
RUN yarn workspace @clo835-project/shared build
RUN yarn workspace @clo835-project/main-server build

FROM node:26.5.0-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/yarn.lock ./yarn.lock
COPY --from=build /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/main-server/package.json ./packages/main-server/package.json
COPY --from=build /app/packages/main-server/dist ./packages/main-server/dist

WORKDIR /app/packages/main-server

EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]
