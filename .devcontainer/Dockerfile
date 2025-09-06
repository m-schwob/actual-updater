# israeli-bank-scrapers requires chromium libraries that is not install in Node base images.
# puppeteer image already has Node.js and chromium installed.
# it is the easiest way to get all dependencies installed but it is a larger image.
FROM ghcr.io/puppeteer/puppeteer:24.17.0

ARG BUILD_TEMP_DIR="/tmp/build"
ARG PYTHON_VENV_DIR="/opt/venv"


# =============================================================================
# ROOT USER OPERATIONS: System dependencies and global installations
# =============================================================================

USER root

# Install dependencies and Supervisor first, before creating user to avoid sudo conflicts
RUN apt-get update \
    && apt-get install -y sudo wget python3 python3-pip python3-venv supervisor \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with sudo privileges early for better permission management
RUN groupadd -r dev \
    && useradd -m -r -g dev dev \
    && echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && usermod -aG sudo dev

# Prepare writable directories for the dev user:
# - ${BUILD_TEMP_DIR}: Temporary build files
# - /tmp/.X11-unix: X11 socket for GUI apps
# - ${PYTHON_VENV_DIR}: Python virtual environment
# - /tmp/supervisord: Supervisor runtime files
RUN mkdir -p ${BUILD_TEMP_DIR} \
    && chown dev:dev ${BUILD_TEMP_DIR} \
    && mkdir -p /tmp/.X11-unix \
    && chown dev:dev /tmp/.X11-unix \
    && mkdir -p ${PYTHON_VENV_DIR} \
    && chown dev:dev ${PYTHON_VENV_DIR} \
    && mkdir -p /tmp/supervisord \
    && chown dev:dev /tmp/supervisord 

# Install Authelia
ARG AUTHELIA_VERSION=4.39.3
ARG AUTHELIA_ARCH=amd64
ARG AUTHELIA_BINARY=authelia-v${AUTHELIA_VERSION}-linux-${AUTHELIA_ARCH}
RUN mkdir -p ${BUILD_TEMP_DIR}/authelia \
    && wget -O ${BUILD_TEMP_DIR}/authelia/$AUTHELIA_BINARY.tar.gz https://github.com/authelia/authelia/releases/download/v${AUTHELIA_VERSION}/$AUTHELIA_BINARY.tar.gz \
    && mkdir -p /usr/local/bin/$AUTHELIA_BINARY \
    && tar -xzf ${BUILD_TEMP_DIR}/authelia/$AUTHELIA_BINARY.tar.gz -C /usr/local/bin/$AUTHELIA_BINARY \
    && chmod +x /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 \
    && ln -sf /usr/local/bin/$AUTHELIA_BINARY/authelia-linux-amd64 /usr/local/bin/authelia \
    && mkdir -p /var/log/authelia /var/lib/authelia \
    && rm -rf ${BUILD_TEMP_DIR}/authelia

# Install Actual server globally
ARG ACTUAL_SERVER_VERSION=25.7.1
RUN npm install --location=global @actual-app/sync-server@${ACTUAL_SERVER_VERSION}


# =============================================================================
# DEV USER OPERATIONS: Python and Node.js user-level installations
# =============================================================================

USER dev

# Install Python dependencies
ENV VIRTUAL_ENV=${PYTHON_VENV_DIR}
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

# Clean up build temp directory (dev user owns it, so can remove it)
RUN rm -rf ${BUILD_TEMP_DIR}

# Set default command to run supervisord, which will manage Actual and Authelia
CMD ["/usr/bin/supervisord", "-c", "/workspaces/actual-updater/.devcontainer/supervisord.conf"]
