from fastapi import FastAPI
from nicegui import ui

from ui import AccountsManagerUI  # your UI setup function

# Create FastAPI app
app = FastAPI()

# Bind FastAPI to NiceGUI
ui.run_with(app)

# Instantiate and start the UI
password_manager_ui = AccountsManagerUI(account_list=["Bank A", "Bank B", "Bank C"])
ui.page('/')(password_manager_ui.start_ui)

