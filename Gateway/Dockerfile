FROM node:latest

WORKDIR /app/apiGateway

COPY package*.json ./
COPY EventManager.js ./
COPY osutils.js ./

COPY ./public/ ./public/

RUN npm i

COPY gateway.js ./

CMD ["node", "gateway.js"]
