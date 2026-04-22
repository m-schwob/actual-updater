from nicegui import ui

from src.app import constants
from src.app.ui_backend import UIBackend
from src.utils.constants import DB_PATH
from nicegui.events import ValueChangeEventArguments

# Theme colors
PAGE_BG = '#243B53'
TABLE_HEADER_BG = '#102A43'
TABLE_BG = '#334E68'
TABLE_ADD_BG = '#486581'
TEXT_COLOR = '#D9E2EC'
BUTTON_COLOR = '#9446ED'
DELETE_COLOR = '#E11D48'
TITLE_COLOR = '#96ABC1'

COLUMN_WIDTH = '11rem'
NOTIFICATION_TIMEOUT = 8000


def _notify_error(message: str) -> None:
    ui.notify(
        message,
        type='negative',
        timeout=NOTIFICATION_TIMEOUT,
        actions=[{'icon': 'close', 'color': 'white', 'round': True, 'dense': True}],
    )


def _notify_warning(message: str) -> None:
    ui.notify(
        message,
        type='warning',
        timeout=NOTIFICATION_TIMEOUT,
        actions=[{'icon': 'close', 'color': 'dark', 'round': True, 'dense': True}],
    )


def _notify_success(message: str) -> None:
    ui.notify(
        message,
        type='positive',
        timeout=NOTIFICATION_TIMEOUT,
        actions=[{'icon': 'close', 'color': 'white', 'round': True, 'dense': True}],
    )


class AccountsManagerUI:
    # Shared DB backend; can be overridden per-instance or at class level
    db: UIBackend = UIBackend(DB_PATH)

    def __init__(self, user_data: dict = {}):
        """Initialise the UI.

        Args:
            user_data: Dict with keys:
                - name (str): logged-in user's display name
                - budgets (list[str]): list of budget IDs available to the user
                - default_budget (str): budget ID to select on load
        """
        if not user_data.get('name') or not user_data.get('budgets'):
            pass  # TODO think how to raise an error if there is no user or budgets

        self.user_data = user_data
        self.current_budget = user_data.get('default_budget', '')
        self.accounts = self._get_accounts(self.current_budget)
        self.container = None
        self.budget_select = None
        self._programmatic_budget_change = False

    def refresh_table(self):
        self.container.clear()

        # Header
        with self.container:
            with (
                ui.row()
                .classes('font-bold items-center gap-2 p-2 rounded-xl shadow-md w-full')
                .style(f'background-color: {TABLE_HEADER_BG}; font-size: 1rem;')
            ):
                ui.label('Bank Name').classes('w-32').style(f'color:{TITLE_COLOR}; width: {COLUMN_WIDTH};')
                ui.label('Account').classes('w-32').style(f'color:{TITLE_COLOR}; width: {COLUMN_WIDTH};')
                ui.label('User').classes('w-32').style(f'color:{TITLE_COLOR}; width: {COLUMN_WIDTH};')
                ui.label('Password').classes('w-32').style(f'color:{TITLE_COLOR}; width: {COLUMN_WIDTH};')
                ui.label('').classes('w-10')
                ui.label('').classes('w-10')

        # Data rows
        for index, entry in enumerate(self.accounts):
            with self.container:
                with (
                    ui.row()
                    .classes('items-center gap-2 p-2 rounded-xl shadow-md  w-full')
                    .style(f'background-color: {TABLE_ADD_BG};')
                ):
                    if entry.get('editable', False):
                        # Bank name is immutable once created — displayed as a label
                        ui.label(entry['bank_name']).classes('w-32').style(
                            f'width: {COLUMN_WIDTH}; color: {TEXT_COLOR};'
                        )
                        account_input = (
                            ui.input(value=entry['account'])
                            .classes('w-32')
                            .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                            .style(f'width: {COLUMN_WIDTH};')
                        )
                        user_input = (
                            ui.input(value=entry.get('user', ''))
                            .classes('w-32')
                            .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                            .style(f'width: {COLUMN_WIDTH};')
                        )
                        password_input = (
                            ui.input(value=entry.get('password', '••••••••'))
                            .classes('w-32 password')
                            .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                            .style(f'width: {COLUMN_WIDTH};')
                        )
                        ui.button(
                            icon='save',
                            on_click=lambda i=index, bank=entry[
                                'bank_name'
                            ], a=account_input, u=user_input, p=password_input: self.save_row(i, bank, a, u, p),
                            color=BUTTON_COLOR,
                        ).classes('w-10')
                        ui.button(
                            icon='close',
                            on_click=lambda i=index: self.cancel_edit(i),
                            color=BUTTON_COLOR,
                        ).classes('w-10')
                    else:
                        ui.label(entry['bank_name']).classes('w-32').style(f'width: {COLUMN_WIDTH};')
                        ui.label(entry['account']).classes('w-32').style(f'width: {COLUMN_WIDTH};')
                        ui.label(entry.get('user', '')).classes('w-32').style(f'width: {COLUMN_WIDTH};')
                        ui.label('••••••••').classes('w-32').style(f'width: {COLUMN_WIDTH};')
                        ui.button(icon='edit', on_click=lambda i=index: self.edit_row(i), color=BUTTON_COLOR).classes(
                            'w-10'
                        )
                        ui.button(
                            icon='delete', on_click=lambda i=index: self.delete_row(i), color=BUTTON_COLOR
                        ).classes('w-10')

        # Add new-entry row (editable + add button)
        with self.container:
            with (
                ui.row()
                .classes('items-center gap-2 p-2 rounded-xl shadow-md w-full')
                .style(f'background-color: {TABLE_BG};')
            ):
                new_bank = (
                    ui.select(options=constants.SUPPORTED_BANKS, label='Bank')
                    .classes('w-32')
                    .props('label-color=grey-5')
                    .style(f'width: {COLUMN_WIDTH};')
                )
                new_account = (
                    ui.input('Account')
                    .classes('w-32')
                    .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                    .style(f'width: {COLUMN_WIDTH};')
                )
                new_user = (
                    ui.input('User')
                    .classes('w-32')
                    .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                    .style(f'width: {COLUMN_WIDTH};')
                )
                new_password = (
                    ui.input('Password')
                    .classes('w-32 password')
                    .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                    .style(f'width: {COLUMN_WIDTH};')
                )
                ui.label('').classes('w-10')  # Placeholder for edit button
                ui.button(
                    icon='add',
                    on_click=lambda: self.add_row(new_bank, new_account, new_user, new_password),
                    color=BUTTON_COLOR,
                ).classes('w-10')

    def edit_row(self, index):
        self.accounts[index]['_original'] = dict(self.accounts[index])
        self.accounts[index]['editable'] = True
        self.refresh_table()

    def cancel_edit(self, index):
        original = self.accounts[index].pop('_original', None)
        if original is not None:
            self.accounts[index] = original
        else:
            self.accounts[index]['editable'] = False
        self.refresh_table()

    def save_row(self, index, bank_name, account_input, user_input, password_input):
        entry = {
            'bank_name': bank_name,
            'account': account_input.value,
            'user': user_input.value,
            'password': password_input.value,
            'editable': False,
        }
        try:
            self.db.save_account(self.current_budget, entry)
        except Exception as e:
            _notify_error(f'Failed to save: {e}')
            entry['editable'] = True  # keep the row open so the user can correct and retry
            self.accounts[index] = entry
            self.refresh_table()
            return
        self.accounts[index] = entry
        _notify_success('Saved successfully')
        self.refresh_table()

    def delete_row(self, index):
        if 0 <= index < len(self.accounts):
            try:
                self.db.delete_account(self.current_budget, self.accounts[index])
            except Exception as e:
                _notify_error(f'Failed to delete: {e}')
                return
            del self.accounts[index]
            self.refresh_table()

    def add_row(self, bank_input, account_input, user_input, password_input):
        if not bank_input.value or not account_input.value or not password_input.value:
            _notify_error('All fields required')
            return
        entry = {
            'bank_name': bank_input.value,
            'account': account_input.value,
            'user': user_input.value,
            'password': password_input.value,
            'editable': False,
        }
        try:
            self.db.save_account(self.current_budget, entry)
        except Exception as e:
            _notify_error(f'Failed to add: {e}')
            return
        self.accounts.append(entry)
        _notify_success('Account added successfully')
        self.refresh_table()

    def change_budget(self, event_handler: ValueChangeEventArguments):
        if self._programmatic_budget_change:
            return
        new_budget = event_handler.value
        editing_in_progress = any(a.get('editable', False) for a in self.accounts)
        if editing_in_progress:
            # Revert the select immediately; let the dialog decide whether to proceed
            self._set_budget_select(self.current_budget)
            with ui.dialog() as dialog, ui.card().style(f'background-color: {TABLE_HEADER_BG}; color: {TEXT_COLOR};'):
                ui.label('You have unsaved changes.').style(
                    f'color: {TEXT_COLOR}; font-weight: bold; font-size: 1.2rem;'
                )
                ui.label('Discard changes and switch budget?').style(f'color: {TEXT_COLOR};')
                with ui.row().classes('justify-end gap-2 w-full'):
                    ui.button('Cancel', on_click=dialog.close)
                    ui.button(
                        'Discard & Switch',
                        on_click=lambda: self._confirm_budget_switch(dialog, new_budget),
                        color=BUTTON_COLOR,
                    )
            dialog.open()
            return
        self._apply_budget_switch(new_budget)

    def _set_budget_select(self, value: str) -> None:
        """Update the budget select value without triggering the on_change handler."""
        self._programmatic_budget_change = True
        self.budget_select.value = value
        self._programmatic_budget_change = False

    def _confirm_budget_switch(self, dialog, new_budget: str) -> None:
        dialog.close()
        self._set_budget_select(new_budget)
        self._apply_budget_switch(new_budget)

    def _apply_budget_switch(self, new_budget: str) -> None:
        self.current_budget = new_budget
        self.accounts = self._get_accounts(self.current_budget)
        self.refresh_table()

    def start_ui(self):
        ui.dark_mode().enable()
        ui.query('body').style(f'background-color: {PAGE_BG}; color: {TEXT_COLOR};')

        ui.label('Actual Accounts Manager').classes('text-2xl text-center w-full font-bold').style(
            f'color:{TITLE_COLOR};'
        )

        # Parent container to control width
        with ui.row().classes('w-full justify-center'):
            with ui.column().classes('items-center').style('width: fit-content; min-width: 40rem;'):
                # User info row with open list, fills parent width, no shadow, smaller and not bold
                with (
                    ui.row()
                    .classes('items-center gap-2 p-2 rounded-xl w-full')
                    .style('font-size: 0.95rem; font-weight: 400; width: 100%;')
                ):
                    ui.label(f'Logged in as: {self.user_data.get("name")}').classes('text-base').style(
                        f'color:{TEXT_COLOR}; width: calc(2 * {COLUMN_WIDTH}); font-weight: 400;'
                    )
                    ui.label('').style('flex:1')  # Spacer to push select to the right

                    self.budget_select = (
                        ui.select(
                            options=self._get_budgets(),
                            value=self._get_default_budget(),
                            label='Budget',
                            on_change=self.change_budget,
                        )
                        .classes('w-32')
                        .style(f'width: 13rem; color: {TEXT_COLOR}; text-align: right;')
                    )

                # Accounts table, fills parent width
                with ui.row().classes('w-full'):
                    with ui.column().classes('items-center w-full') as self.container:
                        pass

        self.refresh_table()

    def _get_budgets(self) -> list[str]:
        budgets = self.user_data.get('budgets', [])
        return list(budgets) if budgets else []

    def _get_default_budget(self) -> str:
        return self.user_data.get('default_budget', '')

    def _get_accounts(self, budget_id: str) -> list:
        """Load accounts for budget_id from the database."""
        if not budget_id:
            return []
        return self.db.load_accounts(budget_id)
