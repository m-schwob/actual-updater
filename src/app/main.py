from fastapi import FastAPI
from nicegui import ui

from ui import start_ui  # your UI setup function

# Create FastAPI app
app = FastAPI()

# Bind FastAPI to NiceGUI
ui.run_with(app)

# Call your UI setup function (registers pages/components)
start_ui()

# Start the app
if __name__ == '__main__':
    ui.run()
