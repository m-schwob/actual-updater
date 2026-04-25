---
applyTo: 'tests/**'
---

# Testing Instructions for Actual Updater

## Overview

Testing is structured as a four-phase pyramid. Each phase targets a different layer of the stack with the appropriate tool. Always use the lowest (fastest, most isolated) phase that can meaningfully test the behaviour in question.

```
Phase 1  — Unit tests          (unittest, no I/O)
Phase 2  — Integration tests   (unittest + FastAPI TestClient)
Phase 3a — UI logic tests      (pytest + NiceGUI User simulator, no browser)
Phase 3b — End-to-end tests    (unittest + Playwright, real headless browser)
Phase 4  — Manual test checklist (human, devcontainer with real Authelia + Actual)
```

---

## Test Runners

**pytest is the single test runner for all automated phases.**  
pytest discovers and runs `unittest.TestCase` tests natively — no `python -m unittest` invocation needed.

| Phase | CLI (agent / CI) | VS Code |
|-------|------------------|---------|
| 1, 2, 3b | pytest or unittest | Test Explorer |
| 3a | pytest | Test Explorer |
| 1–3b (all) | pytest | Test Explorer |
| 4 | Follow `tests/app/manual_checklist.md` | Follow `tests/app/manual_checklist.md` |

**Key decisions:**
- Phases 1, 2, and 3b are written as `unittest.TestCase` but executed by pytest when using VS code test explorer. CLI or AI agent can still run using unittest if desired.
- Phase 3a **requires** pytest — NiceGUI's `User` simulator is built entirely on pytest fixtures.
- **VS Code**: `python.testing.pytestEnabled: true`, `python.testing.unittestEnabled: false` (see `.vscode/settings.json`) as pytest works for both pytes or unittest-style tests.
- The root `conftest.py` loads NiceGUI's plugin conditionally via `pytest_configure`: it is skipped when all explicit path args are outside `tests/app` (e.g. `pytest tests/utils/`), avoiding unnecessary asyncio setup for pure unit test runs.

---

## Phase 1 — Unit Tests (`unittest`)

**What:** Pure Python logic with no network, no real file I/O beyond a temp SQLite file.  
**Target:** Business logic classes — primarily `UIBackend` (`src/app/ui_backend.py`) and DB layer (`src/utils/db_interface/`).  
**Location:** `tests/app/test_ui_backend.py`, `tests/utils/test_db_interface.py`, `tests/utils/test_credential_encryption.py`

**Pattern to follow:**
```python
class TestMyClass(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite")
        initialize_db(self.db_path)

    def tearDown(self):
        self.tmpdir.cleanup()
```

- Each test gets its own `tempfile.TemporaryDirectory` — never share a SQLite file between tests.
- Do not use a hardcoded path like `/tmp/test.db` — this causes test pollution across parallel or sequential runs.

---

## Phase 2 — Integration Tests (`unittest` + `TestClient`)

**What:** HTTP routing and FastAPI middleware behaviour, without a real server.  
**Target:** `src/app/main.py` — route registration, auth middleware redirects, `initialize_db` call, `_get_budgets()` contract.  
**Location:** `tests/app/test_main_integration.py`

**Key patterns:**
- Use `fastapi.testclient.TestClient(app)` — wraps the ASGI app directly, no subprocess.
- Use `unittest.mock.patch` to replace `OIDCAuth`, `ui.run_with`, `ui.page`, and `initialize_db` when testing `create_app()` in isolation.
- `main.py` exposes `create_app()` factory so tests can inject overrides without touching module-level state.
- `follow_redirects=False` on the client so redirect status codes can be asserted directly.

**NOTE:** `_get_budgets()` is currently a stub. When it is replaced with a real Actual Budget API call, update the mock in `TestCreateAppFactory` to match the new signature.

---

## Phase 3a — NiceGUI UI Logic Tests (`pytest` + `User` simulator)

**What:** UI interaction logic — button clicks, notifications, table updates, dialog flows — without a real browser.  
**Target:** `AccountsManagerUI` (`src/app/ui.py`).  
**Location:** `tests/app/test_ui_nicegui.py`, configured via `tests/app/conftest.py`

**How it works:**  
NiceGUI ships `nicegui.testing.User` — an in-process simulator that intercepts `ui.notify`, simulates clicks/input, and asserts element visibility. No browser binary is required. Tests run in milliseconds.

**Activation:** The root `conftest.py` registers `nicegui.testing.user_plugin` conditionally via `pytest_configure` — it is skipped when all explicit path arguments point outside `tests/app` (e.g. `pytest tests/utils/`), avoiding unnecessary asyncio setup for pure unit test runs. This provides the `user` async fixture automatically whenever app tests are collected.

**Fixtures (in `tests/app/conftest.py`):**
- `seeded_db` — creates a temp SQLite file seeded with `fake_db._SEED` data; cleaned up after each test via `tmp_path`.
- `account_page` — overrides `AccountsManagerUI.db` with a `UIBackend` pointing at `seeded_db`; registers a `@ui.page('/')` for the test; restores the class-level `db` after the test.

Each test gets its own private SQLite file via `tmp_path`. NiceGUI's internal testing fixtures reset all element and page state between tests. The `account_page` fixture saves and restores `AccountsManagerUI.db`. No server process is involved — there is zero shared state between tests.

**Test structure:**
```python
@pytest.mark.asyncio
async def test_something(user: User, account_page):
    await user.open("/")
    user.find(ui.button, content="edit").click()   # click() is NOT async
    await user.should_see("some content")
    assert user.notify.contains("expected message")
```

**Important API notes:**
- `user.find(...).click()` — **synchronous**, do NOT `await` it.
- `user.find(...).type(text)` — only works on `ui.input`, `ui.editor`, `ui.codemirror`. For `ui.select` use `set_value()`.
- `user.notify.contains(text)` — checks if any notification message contains the substring.
- `await user.should_see(...)` / `await user.should_not_see(...)` — async, retries 3× with 100ms delay.
- `container.clear()` in `refresh_table()` destroys element slots; await a tick (`await asyncio.sleep(0)`) after interactions that trigger a table rebuild to let NiceGUI settle.

**pytest config** (`pyproject.toml`):
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["."]
```
`asyncio_mode = "auto"` means all `async def` test functions are automatically treated as coroutines — no `@pytest.mark.asyncio` decorator needed. `pythonpath = ["."]` is required because `tests` is excluded from the package install.

---

## Phase 3b — End-to-End Tests (`unittest` + Playwright)

**What:** Real browser, full rendering, visual screenshot evidence.  
**Target:** Full page render, user flows, notification visibility.  
**Location:** `tests/app/test_ui_playwright.py`

**Pattern:**
```python
class TestUIPlaywright(unittest.TestCase):
    def setUp(self):
        # Fresh temp DB path (delete so dev_main re-seeds from scratch)
        self._tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._tmp_db.close()
        os.unlink(self._tmp_db.name)

        # Free OS port — no hardcoded port numbers
        self._port = _free_port()  # uses socket.bind(('127.0.0.1', 0))
        self._base_url = f"http://127.0.0.1:{self._port}"

        env = os.environ.copy()
        env["FAKE_DB_PATH"] = self._tmp_db.name
        self._server_proc = subprocess.Popen([sys.executable, "-m", "uvicorn", ...], env=env)
        _wait_for_server(self._base_url)

        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=True)
        self.page = self._browser.new_page()
        self.page.goto(self._base_url, wait_until="networkidle")

    def tearDown(self):
        self.page.screenshot(...)  # always save screenshot
        self._browser.close()
        self._playwright.stop()
        self._server_proc.terminate()
        self._server_proc.wait(timeout=10)
        os.unlink(self._tmp_db.name)
```

- Use `dev_main.py` as the server target (pre-seeded fake DB, no OIDC).
- Each test gets its own uvicorn process, its own temp SQLite DB, and its own free port. No shared state between tests — fully parallel-safe.
- Pass the DB path to the server via the `FAKE_DB_PATH` environment variable (read by `dev_main.py` at startup).
- Save screenshots to `tests/screenshots/<test_name>.png` — useful for visual regression and human review.

**Browser install:** Playwright Chromium is installed into the devcontainer via `postCreateCommand`:
```
playwright install chromium --with-deps
```
Do not add a separate chromium service — the existing `chromium` service in `docker-compose.yaml` is used by the TypeScript bank scraper and must not be modified.

---

## Test Isolation Rules

**Every test must be fully independent: it must pass regardless of which tests ran before it, after it, or in parallel.** A test that only passes when run in a specific order is a broken test.

**Sequential independence** means a test is unaffected by what previous tests wrote or deleted.  
**Parallel independence** means tests can run concurrently without racing on shared resources (ports, files, in-process state).  
All phases must achieve both.

1. **SQLite files:** Every test that touches the DB must use its own temp path (`tempfile.TemporaryDirectory` or `tmp_path`). Never share a path between tests. Never use a hardcoded path like `/tmp/test.db`.
2. **In-process state:** Do not rely on global or class-level state left by a previous test. Use fixtures to set up and tear down all state explicitly.
3. **`AccountsManagerUI.db`:** The `account_page` fixture saves and restores the class-level `db` attribute. Always use this fixture when testing UI — never patch `AccountsManagerUI.db` directly in a test.
4. **Ports:** Never hardcode a port number shared across tests. Use `socket.bind(('127.0.0.1', 0))` to get a free port per test.
5. **No cross-test state assumptions:** Tests must not assume the absence or presence of data added by other tests. Each test must explicitly set up every precondition it needs.

---

## Seed Data

`tests/sources/utils/fake_db.py` provides `create_fake_db(path)` and `_SEED` — a list of `BudgetProvider` objects with two budgets (`budget-alice`, `budget-bob`) and realistic providers (Isracard, Bank Leumi, Visa Cal, Max).

- Reuse `_SEED` and `create_fake_db` in all test phases that need pre-populated data.
- `create_fake_db` deletes the file and re-seeds when called with a fresh path. It will **not** re-seed if the file already exists — so call `os.unlink(path)` first when you need a clean reset. This is what `GET /dev/reset-db` in `dev_main.py` does automatically.

---

## Dependencies

All testing dependencies are declared in `pyproject.toml` under `[project.optional-dependencies] dev`:

```toml
dev = [
    "black",
    "pylint",
    "coverage",
    "pytest",
    "pytest-asyncio",
    "httpx",
    "selenium",    # required by nicegui.testing.plugin import
]
```

Install with: `pip install -e .[dev] -e .`

Playwright is a system-level install (not a pip package for the binary): `playwright install chromium --with-deps`

---

---

## Phase 4 — Manual Test Checklist (Human)

**What:** End-to-end smoke test with real external services — Authelia OIDC, Actual Budget server, real credentials, real browser.
**When to run:** Before merging to `main`; after any change to OIDC flow, session handling, or the Actual Budget API integration.
**Location:** `tests/app/manual_checklist.md`

**Prerequisites:**
- Devcontainer running with both services up: `supervisorctl status` shows `authelia` and `actual-server` as `RUNNING`
- A real (or test) budget created in Actual Budget at `http://localhost:5006`
- App running: `python -m src.app.main` or `uvicorn src.app.main:app --reload`

**Checklist items:**

1. **Login flow** — navigate to `http://localhost:8080/`; should redirect to Authelia login; log in; should land on the accounts manager page showing the logged-in username.
2. **Budget selector** — verify the budget dropdown is populated with budgets from the Actual server (not hardcoded stubs).
3. **Load accounts** — switch between budgets; table updates to show providers for the selected budget.
4. **Add account** — fill in bank name, account, username, password; click Add; row appears in table; reload page and verify it persists.
5. **Edit account** — click Edit on an existing row; modify a field; click Save; verify change persists after page reload.
6. **Delete account** — click Delete on a row; row disappears; reload and verify it's gone.
7. **Validation** — attempt to add a row with a required field empty; verify error notification appears and row is NOT added.
8. **Logout** — click logout; session cleared; accessing `/` redirects to login again.
9. **Session expiry** — let the session expire (or manually clear cookies); accessing `/` redirects to login.
10. **Notification visibility** — verify success/error/warning notifications appear with a visible close button.

**Note:** Phase 4 intentionally covers scenarios that automated tests cannot: real OIDC token exchange, real Actual Budget API responses, and visual notification rendering.

---

## File Structure

```
tests/
├── app/
│   ├── conftest.py              # pytest fixtures: seeded_db, account_page
│   ├── dev_main.py              # Manual dev server (no OIDC, fake DB)
│   ├── test_main_integration.py # Phase 2: routing, factory, middleware
│   ├── test_ui_backend.py       # Phase 1: UIBackend unit tests
│   ├── test_ui_nicegui.py       # Phase 3a: NiceGUI User simulation
│   ├── test_ui_playwright.py    # Phase 3b: Playwright E2E (headless browser)
│   └── manual_checklist.md      # Phase 4: Human smoke test checklist
├── sources/
│   └── utils/
│       └── fake_db.py           # Seed data factory (used by all phases)
├── utils/
│   ├── test_credential_encryption.py  # Phase 1: encryption unit tests
│   └── test_db_interface.py           # Phase 1: DB layer unit tests
└── screenshots/                 # Playwright screenshots (auto-generated)
```
