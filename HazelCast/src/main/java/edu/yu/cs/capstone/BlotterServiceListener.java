package edu.yu.cs.capstone;

import com.hazelcast.client.Client;
import com.hazelcast.client.ClientListener;
import com.hazelcast.client.HazelcastClient;
import com.hazelcast.client.config.ClientConfig;
import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.collection.ICollection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BlotterServiceListener implements ClientListener
{
    private static final Logger logger = LoggerFactory.getLogger(BlotterServiceListener.class);
    private HazelcastInstance hzClient;
    private ICollection<String> serverSet;
    
    private void setUp()
    {
        ClientConfig clientConfig = new ClientConfig();
        clientConfig.setClusterName(System.getenv("HAZELCAST_CLUSTER_NAME")); 
        this.hzClient = HazelcastClient.newHazelcastClient(clientConfig);
        this.serverSet = hzClient.getSet(System.getenv("AVAILABLE_SERVERS"));
        logger.info("BlotterService Listener Created");
    }

    @Override
    public void clientConnected(Client client)
    {
        if(client.getName().startsWith("Gate"))
        {
            logger.info("\n\nGATEWAY CLIENT CONNECTED " + client.getName() + "\n\n");
            return;
        }
        else if(client.getName().startsWith("CDRS"))
        {
            logger.info("\n\nCDRS CLIENT CONNECTED " + client.getUuid() + "\n\n");
            return;
        }
        else
        {
            if(this.serverSet == null)
            {
                setUp();
            }
            logger.info("\n\nBlotterService CLIENT CONNECTED " + client.getName());
            String clientName = client.getName();
            String[] url = clientName.split(":");
            if(url.length < 2)
            {
                logger.info("Change name of " + client.getName());
                return;
            }
            String host = url[0]; 
            String port = url[1]; 
            serverSet.add(host + ":" + port);
            logger.info("\n\nBlotterService CLIENT added to serverSet " + serverSet.getName() + "\n\n");
        }
    }

    @Override
    public void clientDisconnected(Client client)
    {
        if(client.getName().startsWith("Gate"))
        {
            logger.info("\n\nGATEWAY CLIENT DISCONNECTED " + client.getUuid() + "\n\n");
            return;
        }
        else if(client.getName().startsWith("CDRS"))
        {
            logger.info("\n\nCDRS CLIENT DISCONNECTED " + client.getUuid() + "\n\n");
            return;
        }
        else
        {
            logger.info("\n\nBlotterService CLIENT DISCONNECTED " + client.getName());
            String clientName = client.getName();
            String[] url = clientName.split(":");
            if(url.length < 2)
            {
                logger.info("Change name of " + client.getName());
                return;
            }
            String host = url[0]; 
            String port = url[1]; 
            serverSet.remove(host + ":" + port);
            logger.info("\n\nBlotterService CLIENT removed from serverSet " + serverSet.getName() + "\n\n");
        }
    }
}
