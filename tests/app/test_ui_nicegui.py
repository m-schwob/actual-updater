"""NiceGUI User simulation tests for AccountsManagerUI.

Uses NiceGUI's built-in `User` fixture — no real browser required.
The `user` fixture is provided by `nicegui.testing.plugin` (activated in conftest.py).
The `account_page` fixture (also in conftest.py) registers the UI page against a
seeded temp database and restores global state after each test.

NiceGUI User API rules (v2.x):
  - find(Type)                  — positional type: finds by kind, content/marker IGNORED
  - find(kind=Type, content=X)  — keyword form: filters by both kind AND content ✓
  - find("string")              — positional string: finds by marker OR content ✓
  - click()  is SYNCHRONOUS — do NOT await it
  - type(text) only works on ui.input / ui.editor — not ui.select
  - For ui.select: set value directly via ElementFilter (see _set_select_value helper)
  - After interactions that rebuild container, await should_see() to let loop settle

Run with:
    pytest tests/app/test_ui_nicegui.py -v
"""

import pytest
from nicegui import ElementFilter, ui
from nicegui.testing import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _set_select_value(user: User, label: str, value: str) -> None:
    """Directly set a ui.select value by its label prop and trigger on_change.

    user.find(ui.select).click() two-step pattern requires self.target to be a string
    matching the option value — but when target is a type, content is ignored and
    self.target becomes the class object.  Direct value assignment is simpler and reliable.
    """
    with user.client:
        select = next(
            (e for e in ElementFilter(kind=ui.select) if e._props.get('label') == label),
            None,
        )
        assert select is not None, f"No ui.select with label='{label}' found"
        select.set_value(value)


def _click_first(user: User, kind, content: str) -> None:
    """Click only the FIRST element matching kind and content.

    user.find(kind=..., content=...).click() iterates ALL matching elements.
    When the first handler rebuilds the container (container.clear()), the
    remaining elements are stale — their parent slots are deleted — causing
    RuntimeErrors on subsequent iterations.  This helper clicks exactly one.

    Uses ElementFilter directly (not user.find) because user.find() stores
    matches in a Python set which loses DOM order — ElementFilter yields in
    DOM (insertion) order, ensuring we always click the first row's button.
    """
    from nicegui.testing.user_interaction import UserInteraction

    with user.client:
        first = next(iter(ElementFilter(kind=kind, content=content)), None)
    assert first is not None, f"No {kind.__name__} with content='{content}' found"
    UserInteraction(user, {first}, content).click()


# ---------------------------------------------------------------------------
# Page load
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_page_loads_table_headers(user: User, account_page):
    """Table column headers must be visible after page load."""
    await user.open("/")
    await user.should_see("Bank Name")
    await user.should_see("Account")
    await user.should_see("User")
    await user.should_see("Password")


@pytest.mark.asyncio
async def test_page_loads_seeded_provider(user: User, account_page):
    """budget-alice has an Isracard provider — it must appear in the table."""
    await user.open("/")
    await user.should_see("Isracard")


@pytest.mark.asyncio
async def test_page_loads_logged_in_user(user: User, account_page):
    """Logged-in user name must be visible."""
    await user.open("/")
    await user.should_see("Test User")


# ---------------------------------------------------------------------------
# Add row
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_row_missing_required_fields_shows_error(user: User, account_page):
    """Clicking Add with empty fields must trigger the 'All fields required' error notification."""
    await user.open("/")
    # kind= keyword form ensures content is respected — finds only the 'add' icon button
    user.find(kind=ui.button, content="add").click()
    assert user.notify.contains("All fields required")


@pytest.mark.asyncio
async def test_add_row_success_shows_notification(user: User, account_page):
    """Filling all required fields and clicking Add must show a success notification."""
    await user.open("/")

    _set_select_value(user, label="Bank", value="Visa Cal")
    user.find(kind=ui.input, content="Account").type("12345678")
    user.find(kind=ui.input, content="Password").type("secret-pw")

    user.find(kind=ui.button, content="add").click()
    await user.should_see("Account added successfully")
    assert user.notify.contains("Account added successfully")


# ---------------------------------------------------------------------------
# Edit row
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_edit_row_shows_save_and_cancel_buttons(user: User, account_page):
    """Clicking Edit on a row must reveal Save and Cancel (close) buttons."""
    await user.open("/")
    _click_first(user, ui.button, "edit")
    # Wait for container to rebuild after edit_row() → refresh_table()
    await user.should_see(kind=ui.button, content="save")
    await user.should_see(kind=ui.button, content="close")


@pytest.mark.asyncio
async def test_cancel_edit_restores_row(user: User, account_page):
    """Clicking Cancel (close) after opening edit must remove the Save button."""
    await user.open("/")
    _click_first(user, ui.button, "edit")
    await user.should_see(kind=ui.button, content="save")  # wait for edit mode
    _click_first(user, ui.button, "close")
    await user.should_not_see(kind=ui.button, content="save")


@pytest.mark.asyncio
async def test_save_row_shows_success_notification(user: User, account_page):
    """Saving an edited row must show a success notification."""
    await user.open("/")
    _click_first(user, ui.button, "edit")
    await user.should_see(kind=ui.button, content="save")  # wait for edit mode
    user.find(kind=ui.button, content="save").click()
    await user.should_see("Saved successfully")
    assert user.notify.contains("Saved successfully")


# ---------------------------------------------------------------------------
# Delete row
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_row_removes_provider_from_table(user: User, account_page):
    """Deleting the first row must reduce the row count by one."""
    await user.open("/")
    with user.client:
        before = len(list(ElementFilter(kind=ui.button, content="delete")))
    assert before > 0
    _click_first(user, ui.button, "delete")
    with user.client:
        after = len(list(ElementFilter(kind=ui.button, content="delete")))
    assert after == before - 1


# ---------------------------------------------------------------------------
# Budget switch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_budget_switch_without_editing_loads_other_budget(user: User, account_page):
    """Switching budget without any open edit must load the new budget's providers."""
    await user.open("/")
    await user.should_see("Isracard")
    _set_select_value(user, label="Budget", value="budget-bob")
    await user.should_see("Visa Cal")
    await user.should_not_see("Isracard")


@pytest.mark.asyncio
async def test_budget_switch_during_edit_shows_dialog(user: User, account_page):
    """Switching budget while a row is in edit mode must show the warning dialog."""
    await user.open("/")
    _click_first(user, ui.button, "edit")
    await user.should_see(kind=ui.button, content="save")  # wait for edit mode
    _set_select_value(user, label="Budget", value="budget-bob")
    await user.should_see("Discard & Switch")


@pytest.mark.asyncio
async def test_budget_switch_during_edit_cancel_keeps_edit(user: User, account_page):
    """Cancelling the budget-switch dialog must keep the current budget and edit open."""
    await user.open("/")
    _click_first(user, ui.button, "edit")
    await user.should_see(kind=ui.button, content="save")  # wait for edit mode
    _set_select_value(user, label="Budget", value="budget-bob")
    await user.should_see("Discard & Switch")
    user.find(kind=ui.button, content="Cancel").click()
    # Edit mode must still be active — save button still visible
    await user.should_see(kind=ui.button, content="save")
