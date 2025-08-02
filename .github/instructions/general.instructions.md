---
applyTo: '**'
---

# GitHub Copilot Instructions for Actual Updater

## Project Context
This is the **Actual Updater** project - a comprehensive system for automatically importing Israeli bank transactions into Actual Budget with OIDC authentication. The project consists of three main components: App (Python GUI), Service (TypeScript scraper), and Utils (shared utilities).

## Architecture Overview
- **App Component** (`src/app/`): Python web GUI using FastAPI + NiceGUI for credential management
- **Service Component** (`src/service/`): TypeScript service for bank scraping and Actual API integration  
- **Utils Component** (`src/utils/`): Shared utilities for encryption, database operations, and API connections

## Technology Stack
- **Frontend**: NiceGUI (Python-based reactive UI)
- **Backend**: FastAPI (Python) + Node.js/TypeScript
- **Database**: SQLite for credential storage
- **Authentication**: OIDC via Authelia
- **Bank Integration**: israeli-bank-scrapers library
- **Budget Integration**: @actual-app/api

## Coding Standards

### TypeScript/JavaScript
- **Module System**: Use ES Modules (`import/export`) for new TypeScript files in the service component. 
- **Type Safety**: Always use TypeScript interfaces for data structures
- **Error Handling**: Use try-catch blocks with proper error categorization
- **Async/Await**: Prefer async/await over promises for readability
- **File Organization**: One class/interface per file, descriptive file names

### Python
- **Style**: Follow PEP 8 conventions
- **Type Hints**: Use type hints for function parameters and return values
- **Error Handling**: Use proper exception handling with specific exception types
- **Docstrings**: Include docstrings for all public functions and classes
- **Imports**: Group imports (standard library, third-party, local)

### General Conventions
- **Naming**: 
  - Variables: camelCase (TypeScript), snake_case (Python)
  - Functions: camelCase (TypeScript), snake_case (Python)
  - Classes: PascalCase (both languages)
  - Constants: UPPER_SNAKE_CASE (both languages)
- **Comments**: Write clear, concise comments explaining the "why" not the "what"
- **File Paths**: Always use absolute paths in configuration

## Security Guidelines
- **Credential Handling**: Never log or expose plain-text passwords
- **Encryption**: Use the established encryption pattern from `utils/credential_encryption.py`
- **Key Management**: Use per-budget encryption keys following pattern `<budget-name>-<budget-id>`
- **OIDC**: Validate tokens and handle auth errors gracefully

## Component-Specific Guidelines

### App Component (Python)
- **UI Components**: Use NiceGUI's reactive patterns
- **Session Management**: Properly handle OIDC sessions
- **Form Validation**: Validate all user inputs before processing
- **Database Operations**: Use the established `db_interface.py` patterns

### Service Component (TypeScript)
- **New Service Structure**: Create new files in `src/service/` folder, don't edit old TypeScript files
- **Bank Scraping**: Handle scraping failures with retry logic using israeli-bank-scrapers
- **Actual API**: Follow patterns from `production-oidc-example.ts` for proper API usage
- **Data Transformation**: Validate and transform data between bank and Actual formats
- **Admin Access**: Use admin account to access all user budgets

### Utils Component (Multi-language)
- **Python Preference**: Use Python for new utilities unless TypeScript is required
- **Error Handling**: Return meaningful error messages without exposing sensitive data
- **Database**: Use parameterized queries to prevent SQL injection (fix current SQL injection in db_interface.py)
- **API Connections**: Implement proper connection pooling and timeout handling
- **Encryption**: Use `credential_encryption.py` for all password encryption/decryption

## Testing Approach
- **Unit Tests**: Focus on core business logic, keep tests simple
- **Mocking**: Mock external services (banks, Actual API) in tests
- **Integration**: Use dev container for full-stack testing
- **Test Files**: Place tests in `tests/` directory with descriptive names

## Development Environment
- **Dev Container**: Use the provided dev container with Actual + Authelia
- **Node Version**: Use Node.js 18.19.0 (specified in .nvmrc)
- **Dependencies**: Install via `yarn` for TypeScript, `pip` for Python
- **Services**: Start Actual (port 5006) and Authelia (port 9091) for development

## Key Dependencies
- **israeli-bank-scrapers**: For bank data scraping
- **@actual-app/api**: For Actual Budget integration
- **keytar**: For secure credential storage (Python equivalent: keyring)
- **fastapi**: For Python web framework
- **nicegui**: For Python UI components
- **authlib**: For OIDC implementation

## File Structure Conventions
```
src/
├── app/                 # Python GUI application
│   ├── main.py         # FastAPI + NiceGUI entry point
│   ├── ui.py           # UI components and logic
│   └── oidc.py         # OIDC authentication
├── service/            # NEW: TypeScript service (to be created)
├── utils/              # Shared utilities (Python + TypeScript)
│   ├── credential_encryption.py  # Password encryption (complete)
│   ├── db_interface.py           # SQLite operations (needs SQL injection fix)
│   └── constants.py              # Shared constants
├── configManager/      # OLD: Will be deprecated, don't edit
└── *.ts                # OLD: Legacy files, don't edit except production-oidc-example.ts
tests/                  # Test files (mirror src structure)
data/                   # Database and runtime data
```

## Legacy Code Guidance
- **Don't Edit**: Old TypeScript files (configManager/, app-globals.ts, commonTypes.ts, importer.ts, index.ts, scraper.ts, updateAccount.ts)
- **Reference Only**: Use old files for context and understanding
- **Delete Later**: Old files will be removed when new service is complete
- **Exception**: production-oidc-example.ts is a reference example, can be used as guide

## When Making Changes
1. **Read Context**: Always check DESIGN.md for architectural context
2. **Security First**: Consider security implications of any credential handling
3. **Error Handling**: Implement proper error handling for all external calls
4. **Documentation**: Update relevant documentation if changing interfaces
5. **Testing**: Add tests for new functionality, especially business logic

## Debugging Guidelines
- **Logs**: Use structured logging with appropriate log levels
- **Sensitive Data**: Never log passwords, tokens, or encrypted data
- **Dev Tools**: Use VS Code debugger for TypeScript, Python debugger for Python code
- **Browser**: Use browser dev tools for NiceGUI interface debugging
