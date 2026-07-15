FROM node:26.5.0-slim AS build
WORKDIR /app

COPY . .

RUN npm install -g @yarnpkg/cli-dist@4.9.2
RUN yarn install --immutable

EXPOSE 5173

CMD ["yarn", "workspace", "@clo835-project/client", "dev"]
