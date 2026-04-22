from fastapi import FastAPI, Request
from nicegui import ui
from src.app.oidc import OIDCAuth
from starlette.middleware.sessions import SessionMiddleware

from src.app.ui import AccountsManagerUI
from src.utils.constants import DB_PATH
from src.utils.db_interface.db_interface import initialize_db


def _get_budgets() -> list[str]:
    # TODO: fetch the actual budget list from the Actual Budget server via API
    # NOTE: when this is implemented, tests/app/test_main_integration.py mocks this function —
    #       update the mock to match the real return type and signature.
    return ["", ""]


def create_app(
    oidc_client_id: str = "actual-updater-client-id",
    oidc_client_secret: str = "actual-updater-client-secret",
    oidc_server_url: str = "http://127.0.0.1:9091",
    session_secret: str = "fast-api-session-secret-key",
    db_path: str = DB_PATH,
) -> FastAPI:
    """Application factory.

    Accepts parameters so tests can inject mocks/overrides without
    touching module-level state.
    """
    _app = FastAPI()

    # Initialize OIDC authentication
    OIDCAuth(
        app=_app,
        client_id=oidc_client_id,
        client_secret=oidc_client_secret,
        server_url=oidc_server_url,
    )

    # Bind FastAPI to NiceGUI
    ui.run_with(_app)

    # Must be added last so it is first in the middleware stack
    _app.add_middleware(SessionMiddleware, secret_key=session_secret)

    initialize_db(db_path)

    # Define the update page route
    @ui.page("/")
    def update_page(request: Request):
        user: dict = request.session.get("user")
        budgets = _get_budgets()

        user_data = {
            "name": user.get("name"),
            "budgets": budgets,
            "default_budget": budgets[0] if budgets else "",
        }
        return AccountsManagerUI(user_data=user_data).start_ui()

    return _app


# Production entry point
app = create_app()
