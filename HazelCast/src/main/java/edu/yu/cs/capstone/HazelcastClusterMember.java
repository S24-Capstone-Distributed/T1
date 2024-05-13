package edu.yu.cs.capstone;

import com.hazelcast.config.Config;
import com.hazelcast.config.InMemoryFormat;
import com.hazelcast.config.ListenerConfig;
import com.hazelcast.config.NearCacheConfig;
import com.hazelcast.core.Hazelcast;

public class HazelcastClusterMember {
    public static void main(String[] args)
    {
        NearCacheConfig nearCacheConfig = new NearCacheConfig()
            .setInMemoryFormat(InMemoryFormat.BINARY)
            .setInvalidateOnChange(true);
    
        Config config = new Config();
        config.setClusterName(System.getenv("HAZELCAST_CLUSTER_NAME"))
            .getMapConfig("clients")
            .setNearCacheConfig(nearCacheConfig);
        config.addListenerConfig(new ListenerConfig(new BlotterServiceListener()));
        Hazelcast.newHazelcastInstance(config);
    }
}