"""Integration tests for src/app/main.py.

Strategy:
  - _get_budgets() is tested directly as a unit (no server needed).
  - create_app() factory is tested with NiceGUI and OIDCAuth side-effects patched so
    we can assert initialize_db() is called with the correct db_path without touching
    the global NiceGUI state a second time.
  - HTTP routing tests use the module-level production `app` object (already fully
    initialized at import time) via FastAPI's TestClient.  The OIDC middleware redirects
    unauthenticated requests to /login without making any external network calls
    (short-circuit: _validate_authelia_session returns False → redirect immediately).

NOTE: when _get_budgets() is replaced with a real Actual Budget API call, update the
mock in TestCreateAppFactory.test_initialize_db_called_with_db_path accordingly.
"""

import unittest
from unittest.mock import call, patch

from fastapi.testclient import TestClient

from src.app.main import _get_budgets, app, create_app


class TestGetBudgets(unittest.TestCase):
    """_get_budgets() is currently a stub — verify its contract."""

    def test_returns_list(self):
        result = _get_budgets()
        self.assertIsInstance(result, list)

    def test_returns_non_empty_list(self):
        # The stub returns two empty-string entries; adjust once the real API is wired.
        result = _get_budgets()
        self.assertGreater(len(result), 0)


class TestCreateAppFactory(unittest.TestCase):
    """create_app() factory behaviour — verified with side-effects patched out."""

    def test_initialize_db_called_with_db_path(self):
        """create_app() must call initialize_db() exactly once with the given db_path."""
        with (
            patch("src.app.main.initialize_db") as mock_init_db,
            patch("src.app.main.OIDCAuth"),
            # Prevent double-registration of NiceGUI routes / app binding
            patch("src.app.main.ui.run_with"),
            patch("src.app.main.ui.page", return_value=lambda f: f),
        ):
            create_app(db_path="/tmp/test-main-integration.sqlite")
            mock_init_db.assert_called_once_with("/tmp/test-main-integration.sqlite")

    def test_initialize_db_called_with_default_db_path(self):
        """When no db_path is supplied, initialize_db() receives the default DB_PATH."""
        from src.utils.constants import DB_PATH

        with (
            patch("src.app.main.initialize_db") as mock_init_db,
            patch("src.app.main.OIDCAuth"),
            patch("src.app.main.ui.run_with"),
            patch("src.app.main.ui.page", return_value=lambda f: f),
        ):
            create_app()
            mock_init_db.assert_called_once_with(DB_PATH)


class TestMainRouting(unittest.TestCase):
    """HTTP routing tests against the production app object.

    TestClient wraps the ASGI app directly — no real server is started.
    follow_redirects=False so we can assert the redirect status code itself.
    """

    client = TestClient(app, raise_server_exceptions=False)

    # ------------------------------------------------------------------
    # Authentication guard
    # ------------------------------------------------------------------

    def test_unauthenticated_request_redirects_to_login(self):
        """GET / without a session must result in a redirect to /login."""
        response = self.client.get("/", follow_redirects=False)
        self.assertIn(response.status_code, (302, 307))
        self.assertIn("/login", response.headers.get("location", ""))

    # ------------------------------------------------------------------
    # Route registration
    # ------------------------------------------------------------------

    def _registered_paths(self):
        return [getattr(r, "path", None) for r in app.routes]

    def test_login_route_registered(self):
        self.assertIn("/login", self._registered_paths())

    def test_logout_route_registered(self):
        self.assertIn("/logout", self._registered_paths())

    def test_oidc_callback_route_registered(self):
        self.assertIn("/oidc/callback", self._registered_paths())

    # ------------------------------------------------------------------
    # Public / exempt paths are not redirected
    # ------------------------------------------------------------------

    def test_logout_accessible_without_session(self):
        """GET /logout clears the session and redirects — no auth check required."""
        response = self.client.get("/logout", follow_redirects=False)
        # Logout redirects to / (which will then redirect to /login), but it should
        # NOT be blocked by the auth middleware.
        self.assertIn(response.status_code, (200, 302, 307))


if __name__ == "__main__":
    unittest.main()
