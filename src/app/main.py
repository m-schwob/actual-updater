from fastapi import FastAPI
from nicegui import ui
from src.app.oidc import OIDCAuth
from starlette.middleware.sessions import SessionMiddleware

from src.app.ui import AccountsManagerUI  # your UI setup function

# Create FastAPI app
app = FastAPI()

# Initialize OIDC authentication
oidc = OIDCAuth(
    app=app,
    client_id="actual-updater-client-id",
    client_secret="actual-updater-client-secret",
    server_url="http://127.0.0.1:9091"
)

# Bind FastAPI to NiceGUI
ui.run_with(app)

# Add session middleware globally for all session needs (must added last to be the first checked middleware in the stack)
app.add_middleware(SessionMiddleware, secret_key="fast-api-session-secret-key")

# Instantiate and start the UI
password_manager_ui = AccountsManagerUI(account_list=["Bank A", "Bank B", "Bank C"])
ui.page('/')(password_manager_ui.start_ui)

# @ui.page('/')
# def homepage():
#     account_list=["Bank A", "Bank B", "Bank C"]
#     return AccountsManagerUI(account_list).start_ui()

