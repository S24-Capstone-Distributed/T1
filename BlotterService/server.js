import  EventManager from "./EventManager.js";
import { Kafka } from "kafkajs"
import express from "express"
import bodyParser from "body-parser"
import cors from "cors"
import { EventEmitter } from "events"
import net from "net"
import { Client } from 'hazelcast-client'
import JSONStream from "JSONStream"
import AsyncLock from "async-lock"
import mongo from "mongodb"

const MongoClient = mongo.MongoClient


const lock = new AsyncLock();
const app = express();
const eventEmitter = new EventEmitter();

let clientMap;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const HOSTNAME = process.env.HOSTNAME;
const EXTERNAL_HOST = process.env.EXTERNAL_HOST;
const HTTP_PORT = parseInt(process.env.HTTP_PORT);
const TCP_PORT = parseInt(process.env.TCP_PORT);
const clientUrl = `${EXTERNAL_HOST}:${HTTP_PORT}`;
const hazelcastValue = `${clientUrl}|${HOSTNAME}:${TCP_PORT}`;

const portfolios = connectToMongoCollection();
//Metrics setup
const POOL_ID = "BLOTTER";
const kafka = new Kafka({
  clientId: POOL_ID,
  brokers: [process.env.GRAFANA_URL],
});

let producer;
connectToGrafana();

const observability = new EventManager(producer, HTTP_PORT);
const SSE_COUNT_ID = 847;
const CONNECTED_CLIENTS_ID = 848;
const MESSAGE_THROUHGPUT_ID = 849;
let connectedClients = 0;
let messageThroughput = 0;
//Per second
setInterval(() => {
  observability.send1SecondCPUUsage(POOL_ID);
  observability.sendMemoryUsage(POOL_ID);
}, 1000);
//Per minute
setInterval(() => {
  observability.sendEvent(POOL_ID, CONNECTED_CLIENTS_ID, "connected_users_per_minute", connectedClients);
  observability.sendEvent(POOL_ID, MESSAGE_THROUHGPUT_ID, "CDRS_messages_per_minute", messageThroughput);
  messageThroughput = 0;
}, 60000);

// Configure a TCP server to listen for CDRS connections
const tcpServer = net.createServer({ keepAlive: true }, (socket) => {
  socket.on("connection", () => {
    console.info(`Connected to CDRS node: ${socket.address}`);
  });

  // Parse each JSON object independently
  const parser = socket.pipe(JSONStream.parse());

  parser.on("data", (data) => {
    try {
      console.debug("Blotterservice data: " + JSON.stringify(data));
      handleEvent(data);
      messageThroughput++;
    } catch (error) {
      console.error("Failed to parse DataMessage from JSON:", error);
    }
  });

  socket.on("close", () => {
    console.info("Disconnected from CDRS node");
  });

  socket.on("error", (err) => {
    console.error("Error occurred:", err);
  });
});

// Once connected to HazelCast, begin listening for updates
connectToHazelCast().then(() => {
  tcpServer.listen(TCP_PORT, HOSTNAME, () => {
    console.info(`TCP server listening on ${HOSTNAME}:${TCP_PORT}`);
  });
}).catch((error) => {
  console.err('Error:', error);
});

app.get("/blotter/:clientId", (req, res) => {
  const clientId = req.params.clientId;
  console.info(`Client ${clientId} connected`);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-cache");
  res.writeHead(200);
  let processedHistoricalData = false;
  //TODO! REMOVE
  //processedHistoricalData = true;

  const sentTickersSet = new Set();
  clientMap.put(clientId, hazelcastValue);
  
  // Subscribe to updates for the specific client
  const eventListener = (data) => {
    if (!processedHistoricalData) {
      lock.acquire(data.clientId + data.ticker, () => {
        sentTickersSet.add(data.clientId + data.ticker);
        sendEvent(res, data);
      });
    } else {
      sendEvent(res, data);
    }
  };
  eventEmitter.on(clientId, eventListener);
  connectedClients++;
  retrievePortfolioFromMongo(clientId).then((portfolio) => {
    portfolio.forEach((row) => {
      lock.acquire(row.clientId + row.ticker, () => {
        if (!sentTickersSet.has(row.clientId + row.ticker)) {
          sendEvent(res, row);
        }
      });
    });
    processedHistoricalData = true;
    console.info("Completed portfolio retrieval");
  }).catch(error => {
    console.error("Portfolio retrieval from Mongo failed: ", error);
  });
  
  req.on("close", () => {
    console.info("Connection to client closed");
    connectedClients--;
    eventEmitter.removeListener(clientId, eventListener);
    res.end();
  });
});


app.listen(HTTP_PORT, () => {
  console.debug(`HTTP Server is running on http://localhost:${HTTP_PORT}`);
});


function connectToMongoCollection() {
  const client = new MongoClient(process.env.MONGO_CONNECTION);
  client.connect();
  const db = client.db(process.env.MONGO_DB_NAME);
  console.log("Connected to Mongo!");
  return db.collection(process.env.MONGO_COLLECTION);
}

async function retrievePortfolioFromMongo(clientId) {
  const query = { clientId: clientId };
  const options = {
    projection: { _id: 0, clientId: 1, ticker: 1, quantity: 1, price: 1, market_value: 1, price_last_updated: 1, holding_last_updated: 1 },
  };
  const portfolio = await portfolios.find(query, options).toArray();
  console.log(`Retrieved ${portfolio}`);
  return portfolio;
}

async function connectToHazelCast() {
  const hz = await Client.newHazelcastClient({
    clusterName: process.env.HAZELCAST_CLUSTER_NAME,
    instanceName: clientUrl,
    network: {
      clusterMembers: process.env.HAZELCAST_SERVERS.split(',')
    }
  });
  console.log(`Blotter Service connected to hazelcast ${clientUrl}`)
  clientMap = await hz.getMap(process.env.CLIENT_CONNECTIONS_MAP);
}

async function handleEvent(data) {
  eventEmitter.emit(data.clientId, data);
  observability.sendEvent(POOL_ID, SSE_COUNT_ID, data.clientId, 1);
}

async function sendEvent(res, dataMessageObj) {
  res.write(`data: ${JSON.stringify(dataMessageObj)}\n\n`);
}

async function connectToGrafana()
{
  const producer = kafka.producer();
  await producer.connect();
}
