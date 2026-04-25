def pytest_configure(config):
    """Conditionally load NiceGUI's user simulation plugin.

    Only loads when tests/app is (or may be) in scope.
    Skipped when running only tests/utils or other non-app paths, avoiding
    unnecessary asyncio fixture setup for pure unittest phases.

    Using user_plugin directly avoids loading screen_plugin which requires Selenium.
    pytest 9.x requires pytest_plugins to be at root level; using pytest_configure
    instead allows conditional loading.
    """
    args = [a for a in config.invocation_params.args if not str(a).startswith("-")]
    # Load when: no explicit path args (full run), or at least one arg could
    # include app tests (contains "app", is "tests", "tests/", or ".").
    load = not args or any("app" in str(a) or str(a).rstrip("/") in ("tests", ".") for a in args)
    if load:
        config.pluginmanager.import_plugin("nicegui.testing.user_plugin")
