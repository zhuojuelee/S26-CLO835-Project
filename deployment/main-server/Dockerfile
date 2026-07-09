FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable
RUN yarn workspace @clo835-project/shared build
RUN yarn workspace @clo835-project/main-server build

FROM node:26.5.0-slim AS runtime

ENV PORT=3000

WORKDIR /app

COPY --from=build /app/packages/main-server/dist ./dist

EXPOSE 3000
USER node

CMD ["node", "dist/index.mjs"]
