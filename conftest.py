def pytest_configure(config):
    """Conditionally load NiceGUI's user simulation plugin.

    Only loads when tests/app is in scope (i.e. the NiceGUI UI tests may be collected).
    Skipped when running only tests/utils or other non-app paths, avoiding unnecessary
    asyncio fixture setup for pure unittest phases.

    Using user_plugin directly avoids loading screen_plugin which requires Selenium.
    pytest 9.x requires pytest_plugins to be at root level; using pytest_configure
    instead allows conditional loading.
    """
    args = [a for a in config.invocation_params.args if not str(a).startswith("-")]
    # Skip only when all explicit path args are outside tests/app
    skip = args and all("app" not in str(a) for a in args)
    if not skip:
        config.pluginmanager.import_plugin("nicegui.testing.user_plugin")
