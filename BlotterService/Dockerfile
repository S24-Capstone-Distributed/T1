FROM node:latest

WORKDIR /app/blotterService

COPY package*.json ./

RUN npm i

COPY server.js ./

CMD ["node", "server.js"]