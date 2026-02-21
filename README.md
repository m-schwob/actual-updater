# Actual Updater

**Automatically sync Israeli bank transactions to Actual Budget with OIDC authentication**

Actual Updater provides seamless integration between all major Israeli banks and credit card companies with [Actual Budget](https://github.com/actualbudget/actual), featuring secure credential management and multi-user support through OIDC authentication.

## 🚀 Features

- **Multi-bank Support**: Integration with all major Israeli financial institutions via [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers)
- **OIDC Authentication**: Secure user authentication using OpenID Connect
- **Per-user Credentials**: Encrypted credential storage per budget/user
- **Web GUI**: User-friendly interface for managing bank credentials
- **Automatic Account Creation**: Creates Actual accounts automatically when needed
- **Dev Container Ready**: Complete development environment with Actual + Authelia

## 🏗️ Architecture

The project consists of three main components:

- **App**: Python web GUI for credential management (FastAPI + NiceGUI)
- **Service**: TypeScript service for transaction scraping and import
- **Utils**: Shared utilities for encryption, database, and Actual API integration

## 🛠️ Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js >= 18.19.0
- Python 3.11+

### Development Setup

1. **Clone and setup the dev container**:
   ```bash
   git clone https://github.com/m-schwob/actual-updater.git
   cd actual-updater
   # Open in VS Code dev container
   ```

2. **Dependencies are installed automatically**  
    All required TypeScript and Python dependencies are installed when the dev container is created. No manual installation is needed.

3. **Start the development environment**:

    Actual Budget and Authelia services start automatically when the dev container launches.

    You can manually stop or restart these services using the provided VS Code tasks:
    - **Stop services**: `Tasks: Stop Actual + Authelia`
    - **Restart services**: `Tasks: Restart Actual + Authelia`

    The project also includes launch configurations for running both the sync service and the credential management app (see `.vscode/launch.json`). These configurations may require further setup—refer to the documentation for updates.

    To run the main components manually:

    ```bash
    # Run the credential management GUI with Uvicorn
    uvicorn src.app.main:app --reload

    # Run the sync service
    yarn start
    ```

4. **Access the services**:
   - Actual Budget: `http://localhost:5006`
   - Authelia (OIDC): `http://localhost:9091`
   - Credential Manager: `http://localhost:8080`

### Production Deployment

```bash
# Build and deploy
docker build -t actual-updater .
docker tag actual-updater:latest ghcr.io/m-schwob/actual-updater:latest
docker push ghcr.io/m-schwob/actual-updater:latest
```

## 📋 Usage

1. **Provide Configuration**: Supply your configuration file (`config.yaml`) when running the Docker image.  
    - Currently, only cron job configuration is supported in `config.yaml`.

2. **Run the Docker Image**: Start the Actual Updater container using your preferred orchestration method.

3. **Access Services**: Use the provided URLs to interact with Actual Budget and the credential management GUI.


## 🔒 Security

- Credentials encrypted using system keyring
- Per-user/budget encryption keys
- OIDC-based authentication
- Secure credential storage in SQLite

## 📚 Documentation

- [Design Documentation](DESIGN.md) - Detailed architecture and design decisions
- [VS Code AI Instructions](.vscode/copilot-instructions.md) - AI coding guidelines

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Technical Notes - TODO update this may not be accurate

### Node.js Version
- Uses Node.js 18.19.0 (specified in `.nvmrc`)
- `ts-node-esm` is broken from Node v18.19.0, using `ts-node` instead
- CommonJS modules used for compatibility with israeli-bank-scrapers

### Docker Image
- Public image: `ghcr.io/m-schwob/actual-updater:latest`
- Requires GitHub token for pushing new images