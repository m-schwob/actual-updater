from nicegui import ui

# Theme colors
PAGE_BG = '#243B53'
TABLE_HEADER_BG = '#102A43'
TABLE_BG = '#334E68'
TABLE_ADD_BG = '#486581'
TEXT_COLOR = '#D9E2EC'
BUTTON_COLOR = '#9446ED'
DELETE_COLOR = '#E11D48'
TITLE_COLOR = '#96ABC1'

class AccountsManagerUI:
    def __init__(self, accounts=[], account_list=[]):
        self.accounts = accounts
        self.account_list = account_list
        self.container = None

    def refresh_table(self):
        self.container.clear()

        # Header
        with self.container:
            with ui.row().classes('font-bold items-center gap-2 p-2 rounded-xl shadow-md w-full').style(f'background-color: {TABLE_HEADER_BG}; font-size: 1rem;'):
                ui.label('Bank Name').classes('w-32').style(f'color:{TITLE_COLOR};')
                ui.label('Account').classes('w-32').style(f'color:{TITLE_COLOR};')
                ui.label('Password').classes('w-32').style(f'color:{TITLE_COLOR};')
                ui.label('').classes('w-10')
                ui.label('').classes('w-10')

        # Data rows
        for index, entry in enumerate(self.accounts):
            with self.container:
                with ui.row().classes('items-center gap-2 p-2 rounded-xl shadow-md  w-full').style(f'background-color: {TABLE_ADD_BG};'):
                    if entry["editable"]:
                        bank_input = ui.input(value=entry["bank_name"]).classes('w-32').props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                        account_input = ui.input(value=entry["account"]).classes('w-32').props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                        password_input = ui.input(value=entry["password"]).classes('w-32 password').props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                        ui.button(icon='save', on_click=lambda i=index, b=bank_input, a=account_input, p=password_input: self.save_row(i, b, a, p), color=BUTTON_COLOR).classes('w-10')
                    else:
                        ui.label(entry["bank_name"]).classes('w-32')
                        ui.label(entry["account"]).classes('w-32')
                        ui.label("••••••••").classes('w-32')
                        ui.button(icon='edit', on_click=lambda i=index: self.edit_row(i), color=BUTTON_COLOR).classes('w-10')

                    # Delete icon (except new-entry row)
                    if index < len(self.accounts):
                        ui.button(icon='delete', on_click=lambda i=index: self.delete_row(i), color=BUTTON_COLOR).classes('w-10')

        # Add new-entry row (editable + add button)
        with self.container:
            with ui.row().classes('items-center gap-2 p-2 rounded-xl shadow-md w-full').style(f'background-color: {TABLE_BG};'):
                new_bank = ui.select(options=self.account_list, label="Bank").classes('w-32').props(f'label-color=grey-5')
                new_account = ui.input("Account").classes('w-32')\
                    .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                new_password = ui.input("Password").classes('w-32 password')\
                    .props(f'label-color=grey-5 input-style="color: {TEXT_COLOR}"')
                ui.label('').classes('w-10')  # Placeholder for edit button
                ui.button(icon='add', on_click=lambda: self.add_row(new_bank, new_account, new_password), color=BUTTON_COLOR).classes('w-10')

    def edit_row(self, index):
        self.accounts[index]["editable"] = True
        self.refresh_table()

    def save_row(self, index, bank_input, account_input, password_input):
        self.accounts[index] = {
            "bank_name": bank_input.value,
            "account": account_input.value,
            "password": password_input.value,
            "editable": False
        }
        self.refresh_table()

    def delete_row(self, index):
        if 0 <= index < len(self.accounts):
            del self.accounts[index]
            self.refresh_table()

    def add_row(self, bank_input, account_input, password_input):
        if not bank_input.value or not account_input.value or not password_input.value:
            ui.notify('All fields required', color='negative')
            return
        self.accounts.append({
            "bank_name": bank_input.value,
            "account": account_input.value,
            "password": password_input.value,
            "editable": False
        })
        self.refresh_table()

    def start_ui(self):
        ui.dark_mode().enable()
        ui.query('body').style(f'background-color: {PAGE_BG}; color: {TEXT_COLOR};')

        ui.label('Actual Accounts Manager')\
            .classes('text-2xl mb-6 text-center w-full font-bold')\
            .style(f'color:{TITLE_COLOR};')
        
        with ui.row().classes('w-full justify-center'):
            with ui.column().classes('items-center') as self.container:
                pass

        self.refresh_table()


