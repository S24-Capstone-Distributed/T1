FROM node:latest

WORKDIR /app/blotterService

COPY package*.json ./
COPY EventManager.js ./
COPY osutils.js ./

RUN npm i

COPY server.js ./

CMD ["node", "server.js"]