# Explicit image so Railway does not rely on Railpack inferring the monorepo root.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js index.js ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
