FROM node:20

# Install dependencies and Supervisor in one step, then clean up apt cache
RUN apt-get update \
    && apt-get install -y wget python3 python3-pip python3-venv supervisor \
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

# Install Actual server globally
RUN npm install --location=global @actual-app/sync-server

# Install Python dependencies
ENV VIRTUAL_ENV="/opt/venv"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv $VIRTUAL_ENV \
    && $VIRTUAL_ENV/bin/pip install --upgrade pip \
    && $VIRTUAL_ENV/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm -r /tmp

# Set workdir to VS Code default workspace mount for devcontainer
WORKDIR /workspaces/actual-updater

# install Node.js dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Set default command to run supervisord, which will manage Actual and Authelia
CMD ["/usr/bin/supervisord", "-c", "/workspaces/actual-updater/.devcontainer/supervisord.conf"]
