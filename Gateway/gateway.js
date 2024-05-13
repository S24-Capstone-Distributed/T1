const { Kafka } = require("kafkajs");
//import EventManager from './EventManager.js';
const express = require('express');
const { Client } = require('hazelcast-client');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const localUrl = process.env.localUrl;
const PORT = parseInt(process.env.port);
let clientMap;
//TODO REMOVE
const servers = []; //, `http://${localUrl}:8020`, `http://${localUrl}:8030`];
let currentServerIndex = -1;


//Observability setup
// const POOL_ID = "GATEWAY";
// const kafka = new Kafka({
//   clientId: POOL_ID,
//   brokers: [process.env.KAFKA_URL],
// });
// const producer = kafka.producer();
// await producer.connect();
// const observability = new EventManager(producer, PORT);
// const GATEWAY_CONNECTIONS_ID = 617;
// const RECONNECTED_CLIENTS_ID = 618;
// setInterval(() => {
//   observability.send1SecondCPUUsage(POOL_ID);
//   observability.sendMemoryUsage(POOL_ID);
// }, 1000);


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
    //observability.sendEvent(POOL_ID, GATEWAY_CONNECTIONS_ID, clientId, 1);
    retrieveBlotterServer(clientId, res);
})

app.post('/reconnect', async(req, res) => {
    const clientId = req.body;
    //observability.sendEvent(POOL_ID, RECONNECTED_CLIENTS_ID, clientId, 1);
    console.log('RECONNECT CALLED')
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
        },
        instanceName: `Gateway:${PORT}`
    });
    clientMap = await hz.getMap(process.env.CLIENT_CONNECTIONS_MAP);
    blotterServers = await hz.getSet("availableServers");
    await blotterServers.addItemListener(itemListener, true)
    const items = await blotterServers.toArray();
    servers.push(...items);
}

// Return a blotterService url to the client
async function retrieveBlotterServer(clientId, res){
    if (!clientId) {
        res.status(400).send('Client ID payload missing');
        return;
    }
    let server = await clientMap.get(clientId);
    if (!server) 
    { 
        server = getNextServer();
    }
    else
    {
        urlPieces = server.split('|');
        server = urlPieces[0];
    }
    console.log(`Sending ${server} to ${clientId}`);
    res.json(server);
}

function getNextServer()
{
    while(true)
    {
        currentServerIndex = currentServerIndex >= servers.length-1 ? 0 : currentServerIndex+1;
        if(servers[currentServerIndex] != null)
        {
            return servers[currentServerIndex]
        }
    }
}

var myQueue = [];

    const itemListener =
    {
        itemAdded: (itemEvent) =>
        {
            if(isEmpty())
            {
                servers.push(itemEvent.item)
                console.log('Item added to new slot:', itemEvent.item)
            }
            else
            {
                index = dequeue()
                servers.splice(index, itemEvent.item)
                console.log(`Item added to index ${index}:`, itemEvent.item)
            }
        },
        itemRemoved: (itemEvent) =>
        {
            index = servers.indexOf(itemEvent.item, null)
            if(index > -1)
            {
                servers.splice(index, null)
                enqueue(index);
                console.log(`Item removed at ${index}:`, itemEvent.item)
            }
        }
    };

    //Queue Functions
    function enqueue(item)
    {
        myQueue.push(item);
    }

    function dequeue() {
        if (isEmpty()) {
            return 'Queue is empty';
        }
        return myQueue.shift();
    }

    function isEmpty()
    {
        return myQueue.length === 0;
    }
