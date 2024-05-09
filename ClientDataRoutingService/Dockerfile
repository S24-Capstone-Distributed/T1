#Base image
FROM eclipse-temurin:17

#Set container home dir
WORKDIR /cdrs
#Copy jar file to container
COPY ./target/ClientDataRoutingService-1.0.jar /cdrs/

#Run it
CMD [ "java", "-jar", "ClientDataRoutingService-1.0.jar" ]