# Use a base image, such as Alpine Linux
FROM haproxy:latest

# Copy your HAProxy configuration file to the container
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# Start HAProxy when the container is run.
CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]
