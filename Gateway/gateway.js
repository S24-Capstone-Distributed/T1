import { Kafka } from "kafkajs";
import EventManager from './EventManager.js';
const express = require('express');
const { Client } = require('hazelcast-client');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

const localUrl = process.env.localUrl;
const PORT = parseInt(process.env.port);
//TODO REMOVE
const servers = [`${localUrl}:8010`]; //, `http://${localUrl}:8020`, `http://${localUrl}:8030`];
let currentServerIndex = -1;

const POOL_ID = "GATEWAY";
const kafka = new Kafka({
  clientId: POOL_ID,
  brokers: [process.env.KAFKA_URL],
});
const producer = kafka.producer();
await producer.connect();
const observability = new EventManager(producer, PORT);
const GATEWAY_CONNECTIONS_ID = 617;
setInterval(() => {
  observability.send1SecondCPUUsage(POOL_ID);
  observability.sendMemoryUsage(POOL_ID);
}, 1000);


let clientMap;

app.use(cors());
app.use(bodyParser.urlencoded({
    extended: false 
}))

// Serve static content from "public" directory
app.use(express.static("public"));

connectToHazelCast().catch(err => {
    console.error('Error connecting to HazelCast:', err);
    process.exit(1); // Exit with error status
});


app.post('/portfolio.html', async(req, res) => {
    const clientId = req.body;
    observability.sendEvent(POOL_ID, GATEWAY_CONNECTIONS_ID, clientId, 1);
    retrieveBlotterServer(clientId, res);
})

app.post('/reconnect', async(req, res) => {
    const clientId = req.body;
    console.log(`Reconnect request from client ${clientId}`);
    retrieveBlotterServer(clientId, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke! :(');
});

// Create HTTP server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});


// Connect to hazelcast cluster and retrieve client map
async function connectToHazelCast() {
    const hz = await Client.newHazelcastClient({
        clusterName: process.env.HAZELCAST_CLUSTER_NAME,
        network: {
            clusterMembers: process.env.HAZELCAST_SERVERS.split(',')
        }
    });
    clientMap = await hz.getMap(process.env.CLIENT_CONNECTIONS_MAP);
    console.log("Client map retrieved");
}

// Return a blotterService url to the client
async function retrieveBlotterServer(clientId, res){
    if (!clientId) {
        res.status(400).send('Client ID payload missing');
        return;
    }
    let server = await clientMap.get(clientId);
    if (!server) { // roundrobin
        server = getNextServer();
    }else{
        urlPieces = server.split('|');
        server = urlPieces[0];
    }
    console.log(`Sending ${server} to ${clientId}`);
    res.json(server);
}

function getNextServer() {
    currentServerIndex = currentServerIndex >= servers.length-1 ? 0 : currentServerIndex+1;
    return servers[currentServerIndex];
}
