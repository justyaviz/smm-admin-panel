FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json .npmrc ./
RUN npm install --omit=dev --package-lock=false --no-audit --no-fund

COPY src ./src
COPY sql ./sql

EXPOSE 8080
CMD ["node", "src/server.js"]
