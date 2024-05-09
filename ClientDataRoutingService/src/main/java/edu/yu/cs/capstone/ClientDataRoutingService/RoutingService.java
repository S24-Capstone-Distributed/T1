package edu.yu.cs.capstone.ClientDataRoutingService;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;


public class RoutingService {
    private static Logger logger = LogManager.getLogger(RoutingService.class);
    public static void main(String[] args) {
        KafkaMessageConsumer consumer = new KafkaMessageConsumer();
        logger.info("Starting Kafka consumer");
        consumer.start();
    }
}
