from fastapi import FastAPI
from nicegui import ui
from src.app.oidc import OIDCAuth

from src.app.ui import AccountsManagerUI  # your UI setup function

# Create FastAPI app
app = FastAPI()

# Initialize OIDC authentication
oidc = OIDCAuth(
    app=app,
    secret_key="fast-api-session-secret-key",
    client_id="actual-updater-client-id",
    client_secret="actual-updater-client-secret",
    server_url="http://127.0.0.1:9091"
)

# Bind FastAPI to NiceGUI
ui.run_with(app)

# Instantiate and start the UI
password_manager_ui = AccountsManagerUI(account_list=["Bank A", "Bank B", "Bank C"])
ui.page('/')(password_manager_ui.start_ui)

