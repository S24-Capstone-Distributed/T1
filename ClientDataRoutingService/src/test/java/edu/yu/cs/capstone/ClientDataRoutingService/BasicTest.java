package edu.yu.cs.capstone.ClientDataRoutingService;

import static org.junit.Assert.assertEquals;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;


import org.junit.Test;

import com.google.gson.Gson;

public class BasicTest {
    @Test
    public void gsonTest(){
        Gson g = new Gson();
        DataMessage dm =  new DataMessage("AAPL", 10, 12.3, 123.0);
        dm.setClientId("xyz123");
        String to = g.toJson(dm);
        System.out.println(to);
        DataMessage dm2 = g.fromJson(to, DataMessage.class);
        assertEquals("AAPL", dm2.getTicker());

    }

    @Test
    public void threadPoolTest(){
        BlockingQueue<Runnable> queue = new ArrayBlockingQueue<>(100);
        ThreadPoolExecutor pool = new ThreadPoolExecutor(6, 7, 100, TimeUnit.SECONDS, queue);
        for(int i = 0; i < 80; i++){
            int x = i;
            queue.add(() -> {
                System.out.println("Hello from task: " + x);
            });
        }
    }

    public class DataMessage {
        private String clientId;
        private final String ticker;
        private final int quantity;
        private final double price;
        private final double marketValue;
        public DataMessage(String ticker, int quantity, double price, double marketValue){
            this.ticker = ticker;
            this.quantity = quantity;
            this.price = price;
            this.marketValue = marketValue;
        }
    
        public void setClientId(String clientId){
            this.clientId = clientId;
        }

        public String getTicker(){
            return this.ticker;
        }
    }
}
