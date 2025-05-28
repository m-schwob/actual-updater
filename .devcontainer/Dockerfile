FROM node:20

# Install dependencies
RUN apt-get update && apt-get install -y wget python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Authelia
ARG AUTHELIA_VERSION=4.39.3
ARG AUTHELIA_ARCH=amd64
ARG AUTHELIA_BINARY=authelia-v${AUTHELIA_VERSION}-linux-${AUTHELIA_ARCH} 
RUN wget -O /tmp/$AUTHELIA_BINARY.tar.gz https://github.com/authelia/authelia/releases/download/v${AUTHELIA_VERSION}/$AUTHELIA_BINARY.tar.gz \
    && mkdir -p /usr/local/bin/$AUTHELIA_BINARY \
    && tar -xzf /tmp/$AUTHELIA_BINARY.tar.gz -C /usr/local/bin/$AUTHELIA_BINARY \
    && chmod +x /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 \
    && ln -sf /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 /usr/local/bin/authelia \
    && mkdir -p /var/log/authelia /var/lib/authelia \
    && rm -r /tmp

# Install Actual server globallyst iy
# RUN npm install --location=global @actual-app/sync-server

# Install Actual Updater locally
# RUN yarn install

# Create symlinks for Authelia and Actual config files
# RUN ln -sf /app/authelia-config.yml /etc/authelia/config.yml \
#     && ln -sf /app/actual-config.json /etc/actual/config.json

# Copy and install Python requirements
# COPY ../requirements.txt /tmp/requirements.txt
# RUN python3 -m pip install --upgrade pip #&& python3 -m pip install -r /tmp/requirements.txt

# Create workdir for Actual Updater
WORKDIR /app
COPY . .

# # Optional: Add supervisord or entrypoint script
# COPY ./start.sh /start.sh
# RUN chmod +x /start.sh

# Set default command to bash to keep container running
CMD ["bash -c"]
