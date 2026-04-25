"""Phase 3b — End-to-end tests using Playwright (headless Chromium).

Strategy:
  - setUpClass starts a real uvicorn subprocess on TEST_PORT using dev_main.py
    (pre-seeded fake DB, no OIDC).
  - tearDownClass stops the browser and server process.
  - Each test gets a fresh Playwright page (setUp/tearDown).
  - Screenshots are saved to tests/screenshots/ for every test — useful for
    visual regression review and human inspection.
  - Port 8765 is reserved for this test suite; do NOT use port 8080 (dev server).

Run with:
    pytest tests/app/test_ui_playwright.py -v
  or:
    python -m unittest tests.app.test_ui_playwright -v

Prerequisites:
    playwright install chromium --with-deps
"""

import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

import httpx
from playwright.sync_api import Browser, Page, Playwright, sync_playwright

TEST_PORT = 8765
BASE_URL = f"http://localhost:{TEST_PORT}"
SCREENSHOTS_DIR = Path(__file__).parent.parent / "screenshots"

# How long to wait for the server to be ready (seconds)
_SERVER_TIMEOUT = 15


def _wait_for_server(url: str, timeout: float = _SERVER_TIMEOUT) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            resp = httpx.get(url, timeout=1, follow_redirects=True)
            if resp.status_code < 500:
                return
        except (httpx.ConnectError, httpx.ConnectTimeout):
            pass
        time.sleep(0.3)
    raise RuntimeError(f"Server at {url} did not start within {timeout}s")


class TestUIPlaywright(unittest.TestCase):
    _server_proc: subprocess.Popen
    _playwright: Playwright
    _browser: Browser
    page: Page

    @classmethod
    def setUpClass(cls) -> None:
        SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

        # Create a fresh temp DB for this test run — delete first so create_fake_db
        # always re-seeds from scratch, regardless of prior test runs.
        tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        tmp.close()
        os.unlink(tmp.name)
        cls._temp_db_path = tmp.name

        env = os.environ.copy()
        env["FAKE_DB_PATH"] = cls._temp_db_path

        # Start the dev server as a subprocess with the isolated DB
        cls._server_proc = subprocess.Popen(
            [
                sys.executable, "-m", "uvicorn",
                "tests.app.dev_main:app",
                "--port", str(TEST_PORT),
                "--host", "127.0.0.1",
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=Path(__file__).parent.parent.parent,  # workspace root
        )
        _wait_for_server(BASE_URL)

        # Start headless Chromium
        cls._playwright = sync_playwright().start()
        cls._browser = cls._playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls) -> None:
        cls._browser.close()
        cls._playwright.stop()
        cls._server_proc.terminate()
        cls._server_proc.wait(timeout=10)
        try:
            os.unlink(cls._temp_db_path)
        except FileNotFoundError:
            pass

    def setUp(self) -> None:
        self.page = self._browser.new_page()
        self.page.goto(BASE_URL, wait_until="networkidle")

    def tearDown(self) -> None:
        # Always save a screenshot — shows the final state after the test
        screenshot_path = SCREENSHOTS_DIR / f"{self._testMethodName}.png"
        self.page.screenshot(path=str(screenshot_path))
        self.page.close()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _wait_for_table(self) -> None:
        """Wait until the table header is visible (page fully rendered)."""
        self.page.wait_for_selector("text=Bank Name", timeout=5000)

    def _click_first_button(self, icon: str) -> None:
        """Click the first button whose q-icon content matches `icon`."""
        # NiceGUI renders icon buttons as <button> containing a <i class="material-icons">icon</i>
        # Playwright can find them by their accessible name or inner text of the icon span
        btn = self.page.locator(f"button:has(i:text-is('{icon}'))").first
        btn.wait_for(state="visible", timeout=3000)
        btn.click()

    # ------------------------------------------------------------------
    # Page load
    # ------------------------------------------------------------------

    def test_page_loads_table_headers(self) -> None:
        """Table column headers must be visible on page load."""
        self._wait_for_table()
        for header in ("Bank Name", "Account", "User", "Password"):
            self.assertIsNotNone(
                self.page.locator(f"text={header}").first,
                f"Expected column header '{header}' to be visible",
            )

    def test_page_shows_seeded_provider(self) -> None:
        """budget-alice seed data includes Isracard — must appear on load.

        Isracard is the second row alphabetically ('Isracard' > 'Bank Leumi'), so
        it survives the delete test that removes only the first row (Bank Leumi).
        """
        self._wait_for_table()
        self.page.wait_for_selector("text=Isracard", timeout=5000)

    def test_page_shows_logged_in_user(self) -> None:
        """Dev User name must appear on the page."""
        self._wait_for_table()
        self.page.wait_for_selector("text=Dev User", timeout=5000)

    # ------------------------------------------------------------------
    # Add row
    # ------------------------------------------------------------------

    def test_add_row_missing_fields_shows_error(self) -> None:
        """Clicking Add without filling fields must show an error notification."""
        self._wait_for_table()
        # Click the add button (last button in the add row — icon 'add')
        self._click_first_button("add")
        # Quasar notifications render in a portal — check for the text anywhere on page
        self.page.wait_for_selector("text=All fields required", timeout=5000)

    def test_add_row_success_shows_notification(self) -> None:
        """Filling required fields and clicking Add must show a success notification."""
        self._wait_for_table()

        # Quasar select — click to open, then click the option
        bank_select = self.page.locator(".q-select").last  # add-row bank select
        bank_select.click()
        self.page.wait_for_selector("text=Visa Cal", timeout=3000)
        self.page.locator("[role='option']:has-text('Visa Cal')").click()

        # Fill account and password inputs in the add row (last two inputs)
        inputs = self.page.locator("input[type='text'], input:not([type])").all()
        # Find the add-row inputs by placeholder
        self.page.locator("input[aria-label='Account']").last.fill("12345678")
        self.page.locator("input[aria-label='Password']").last.fill("secret-pw")

        self._click_first_button("add")
        self.page.wait_for_selector("text=Account added successfully", timeout=5000)

    # ------------------------------------------------------------------
    # Edit row
    # ------------------------------------------------------------------

    def test_edit_row_reveals_save_and_cancel(self) -> None:
        """Clicking Edit on the first row must show Save and Cancel icon buttons."""
        self._wait_for_table()
        self._click_first_button("edit")
        # After edit mode: save and close buttons appear
        self.page.wait_for_selector("button:has(i:text-is('save'))", timeout=3000)
        self.page.wait_for_selector("button:has(i:text-is('close'))", timeout=3000)

    def test_cancel_edit_restores_view(self) -> None:
        """Clicking Cancel after Edit must return to view mode (no Save button)."""
        self._wait_for_table()
        self._click_first_button("edit")
        self.page.wait_for_selector("button:has(i:text-is('save'))", timeout=3000)
        self._click_first_button("close")
        # Save button should disappear
        self.page.wait_for_selector("button:has(i:text-is('edit'))", timeout=3000)

    def test_save_row_shows_success_notification(self) -> None:
        """Clicking Save on an unmodified edit row must show a success notification."""
        self._wait_for_table()
        self._click_first_button("edit")
        self.page.wait_for_selector("button:has(i:text-is('save'))", timeout=3000)
        self._click_first_button("save")
        self.page.wait_for_selector("text=Saved successfully", timeout=5000)

    # ------------------------------------------------------------------
    # Delete row
    # ------------------------------------------------------------------

    def test_delete_row_removes_provider(self) -> None:
        """Deleting the first provider row must remove it from the table.

        Bank Leumi is the first row (alphabetical sort within budget-alice seed
        data: 'Bank Leumi' < 'Isracard').  The click targets the first delete
        button, so we verify that Bank Leumi disappears.
        """
        self._wait_for_table()
        self.page.wait_for_selector("text=Bank Leumi", timeout=3000)
        self._click_first_button("delete")
        # Wait for Bank Leumi to disappear
        self.page.wait_for_selector("text=Bank Leumi", state="hidden", timeout=5000)

    # ------------------------------------------------------------------
    # Budget switch
    # ------------------------------------------------------------------

    def test_budget_switch_loads_different_providers(self) -> None:
        """Switching to budget-bob must replace Isracard with Visa Cal."""
        self._wait_for_table()
        self.page.wait_for_selector("text=Isracard", timeout=3000)

        # Click the budget select and choose budget-bob
        budget_select = self.page.locator(".q-select").first
        budget_select.click()
        self.page.wait_for_selector("text=budget-bob", timeout=3000)
        self.page.locator("[role='option']:has-text('budget-bob')").click()

        self.page.wait_for_selector("text=Visa Cal", timeout=5000)
        self.assertFalse(self.page.locator("text=Isracard").is_visible())

    def test_budget_switch_during_edit_shows_dialog(self) -> None:
        """Switching budget while an edit is open must show the warning dialog."""
        self._wait_for_table()
        self._click_first_button("edit")
        self.page.wait_for_selector("button:has(i:text-is('save'))", timeout=3000)

        # Try switching budget
        budget_select = self.page.locator(".q-select").first
        budget_select.click()
        self.page.wait_for_selector("text=budget-bob", timeout=3000)
        self.page.locator("[role='option']:has-text('budget-bob')").click()

        # Dialog must appear
        self.page.wait_for_selector("text=Discard & Switch", timeout=5000)


if __name__ == "__main__":
    unittest.main()
