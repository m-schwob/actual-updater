FROM node:20

# Prepare build temp directory
ARG BUILD_TEMP_DIR="/tmp/build"
RUN mkdir -p ${BUILD_TEMP_DIR}

# Install dependencies and Supervisor in one step, then clean up apt cache
RUN apt-get update \
    && apt-get install -y wget python3 python3-pip python3-venv supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Authelia
ARG AUTHELIA_VERSION=4.39.3
ARG AUTHELIA_ARCH=amd64
ARG AUTHELIA_BINARY=authelia-v${AUTHELIA_VERSION}-linux-${AUTHELIA_ARCH} 
ARG AUTHELIA_DOWNLOAD_URL=https://github.com/authelia/authelia/releases/download/v${AUTHELIA_VERSION}/$AUTHELIA_BINARY.tar.gz
RUN mkdir -p ${BUILD_TEMP_DIR}/authelia \
    && wget -O ${BUILD_TEMP_DIR}/authelia/$AUTHELIA_BINARY.tar.gz ${AUTHELIA_DOWNLOAD_URL} \
    && mkdir -p /usr/local/bin/$AUTHELIA_BINARY \
    && tar -xzf ${BUILD_TEMP_DIR}/authelia/$AUTHELIA_BINARY.tar.gz -C /usr/local/bin/$AUTHELIA_BINARY \
    && chmod +x /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 \
    && ln -sf /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 /usr/local/bin/authelia \
    && mkdir -p /var/log/authelia /var/lib/authelia \
    && rm -rf ${BUILD_TEMP_DIR}/authelia

# Install Actual server globally
ARG ACTUAL_SERVER_VERSION=25.7.1
RUN npm install --location=global @actual-app/sync-server@${ACTUAL_SERVER_VERSION}

# Install Python dependencies
ENV VIRTUAL_ENV="/opt/venv"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN mkdir -p ${BUILD_TEMP_DIR}/python
COPY pyproject.toml ${BUILD_TEMP_DIR}/python/pyproject.toml
RUN python3 -m venv $VIRTUAL_ENV \
    && $VIRTUAL_ENV/bin/pip install --upgrade pip \
    && $VIRTUAL_ENV/bin/pip install -e ${BUILD_TEMP_DIR}/python/ \
    && $VIRTUAL_ENV/bin/pip install -e ${BUILD_TEMP_DIR}/python/[dev] \
    && rm -rf ${BUILD_TEMP_DIR}/python

# Set workdir to VS Code default workspace mount for devcontainer
WORKDIR /workspaces/actual-updater

# install Node.js dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Clean up build temp directory
RUN rm -rf ${BUILD_TEMP_DIR}

# Set default command to run supervisord, which will manage Actual and Authelia
CMD ["/usr/bin/supervisord", "-c", "/workspaces/actual-updater/.devcontainer/supervisord.conf"]
