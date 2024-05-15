FROM eclipse-temurin:17
#Set working directory
WORKDIR /hazelcast
#Copy jar to working directory
COPY ./target/HazelcastClusterMember-1.0-SNAPSHOT.jar .

CMD [ "java", "-jar", "HazelcastClusterMember-1.0-SNAPSHOT.jar" ]