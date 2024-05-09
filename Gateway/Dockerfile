FROM node:latest

WORKDIR /app/apiGateway

COPY package*.json ./

COPY ./public/ ./public/

RUN npm i

COPY gateway.js ./

CMD ["node", "gateway.js"]
