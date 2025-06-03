from fastapi import FastAPI, Request
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
    server_url="http://127.0.0.1:9091",
)

# Bind FastAPI to NiceGUI
ui.run_with(app)

# Add session middleware globally for all session needs (must added last to be the first checked middleware in the stack)
app.add_middleware(SessionMiddleware, secret_key="fast-api-session-secret-key")


# Define the update page route
@ui.page('/')
def updater_page(request: Request):
    user: dict = request.session.get('user')
    user_data = {
        "name": user.get('name'),
    }
    return AccountsManagerUI(user_data=user_data).start_ui()
