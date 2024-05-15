package edu.yu.cs.capstone.ClientDataRoutingService;

import java.time.Duration;
import java.util.Collections;
import java.util.Arrays;
import java.util.Properties;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.InetSocketAddress;
import java.io.IOException;
import java.io.PrintWriter;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.gson.Gson;
import com.hazelcast.client.HazelcastClient;
import com.hazelcast.client.config.ClientConfig;
import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.map.IMap;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KafkaMessageConsumer {
    private int messagesSent = 0;
    private KafkaConsumer<String, String> consumer;
    private HazelcastInstance hazelcastClient;
    private IMap<String, String> clientConnections;
    private ExecutorService pool;
    private Gson gson = new Gson();
    private static Logger logger = LogManager.getLogger(KafkaMessageConsumer.class);

    public KafkaMessageConsumer(){
        connectToKafka();
        connectToHazelCast();
        this.pool = Executors.newWorkStealingPool(Runtime.getRuntime().availableProcessors() + 1);       
    }

    public void start(){
        this.consumer.subscribe(Collections.singletonList(System.getenv("MARKET_VALUE_TOPIC")));
        try{
            while(true){
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                records.forEach(record -> {
                    this.pool.execute(() -> {
                        DataMessage message = this.gson.fromJson(record.value(), DataMessage.class);
                        send(record.key().split("_")[0], message);
                        System.out.println(message);
                    });
                });
                System.out.println("Sent " + records.count() + " records");
                this.messagesSent += records.count();
                System.out.println("Total messages: " + this.messagesSent);
                Thread.sleep(200);
            }            
        }catch(Exception e){
            logger.warn("CDRS failed: ", e);
        }finally{
            logger.warn("Shutting down");
            this.consumer.close();
            this.hazelcastClient.shutdown();
        }
    }
    /**
     * Sends the provided message over TCP
     */
    private void send(String clientId, DataMessage m){       
        try {
            String blotterServiceUrl = this.clientConnections.get(clientId);
            if(blotterServiceUrl == null){
                return;
            }
            SocketAddress url = parseAddress(blotterServiceUrl);
            logger.info("CDRS attempting connection to " + url.toString());
            Socket conn = new Socket();
            conn.connect(url);
            m.setClientId(clientId);
            String dataString = this.gson.toJson(m);
            PrintWriter out = new PrintWriter(conn.getOutputStream(), true);
            out.println(dataString);
            conn.close();
        } catch (IOException e) {
            logger.fatal("Socket failure: ", e);
        }
    }

    /**
     * 
     * @param blotterUrl
     * - format: external_hostname:http_port|internal_hostname:tcp_port
     * @return TCP socket address
     */
    private SocketAddress parseAddress(String blotterUrl){
        String[] hazelcastPieces = blotterUrl.split("\\|");
        String[] urlPieces = hazelcastPieces[1].split(":");
        try{
            int port = Integer.parseInt(urlPieces[1]);
            return new InetSocketAddress(urlPieces[0], port);
        }catch(NumberFormatException e){
            logger.fatal("Port was not a number! Returned address: " + blotterUrl);
            throw new IllegalArgumentException("Port was not a number! Returned address: " + blotterUrl);
        }
    }

    private void connectToKafka(){
        Properties props = new Properties();
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("BOOTSTRAP_SERVERS"));
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "market_value_consumers");
        //TODO change?
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        this.consumer = new KafkaConsumer<>(props);
        System.out.println("Connected to Kafka");
        logger.info("Connected to Kafka");
    }

    /**
     * Establish connection to Hazelcast
     */
    private void connectToHazelCast(){
        String[] servers = System.getenv("HAZELCAST_SERVERS").split(",");
        ClientConfig config = new ClientConfig();
        config.setClusterName(System.getenv("HAZELCAST_CLUSTER_NAME"))
            .setInstanceName(System.getenv("HAZELCAST_INSTANCE_NAME"))
            .getNetworkConfig()
            .setAddresses(Arrays.asList(servers));
        this.hazelcastClient = HazelcastClient.newHazelcastClient(config);
        this.clientConnections = hazelcastClient.getMap(System.getenv("CLIENT_CONNECTIONS_MAP"));
    }

    public class DataMessage {
        private String clientId;
        private final String ticker;
        private final int quantity;
        private final double price;
        private final double market_value;
        private final double price_last_updated;
        private final double holding_last_updated;
        public DataMessage(String ticker, int quantity, double price, double market_value, double price_last_updated, double holding_last_updated){
            this.ticker = ticker;
            this.quantity = quantity;
            this.price = price;
            this.market_value = market_value;
            this.price_last_updated = price_last_updated;
            this.holding_last_updated = holding_last_updated;
        }
    
        public void setClientId(String clientId){
            this.clientId = clientId;
        }

        @Override
        public String toString() {
            return "DataMessage [clientId=" + clientId + ", ticker=" + ticker + ", quantity=" + quantity + ", price="
                    + price + ", marketValue=" + market_value + "]";
        }

        
    }
}
