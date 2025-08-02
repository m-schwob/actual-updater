# Design Documentation - Actual Updater

## Project Overview

Actual Updater is a comprehensive solution for automatically synchronizing Israeli bank transactions with Actual Budget, featuring secure multi-user support through OIDC authentication. The system replaces the previous password-based authentication approach with a more secure and scalable OIDC-based architecture.

## Architecture Decisions

### 1. Three-Component Architecture

**Decision**: Split the system into three distinct components:
- **App** (Python): Web GUI for credential management
- **Service** (TypeScript): Transaction scraping and importing
- **Utils** (Multi-language): Shared utilities

**Rationale**:
- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Technology Optimization**: Use Python for UI (FastAPI + NiceGUI) and TypeScript for Actual API integration
- **Scalability**: Components can be deployed and scaled independently
- **Maintainability**: Easier to debug, test, and modify individual components

### 2. OIDC Authentication Migration

**Decision**: Move from Actual's password authentication to OIDC with Authelia

**Rationale**:
- **Security**: Better security model with proper authentication flows
- **Multi-user Support**: Native support for multiple users with separate credentials
- **Industry Standard**: OIDC is a widely adopted standard
- **Integration**: Better integration with enterprise environments

### 3. Per-User Credential Storage

**Decision**: Store encrypted credentials separately for each user/budget

**Rationale**:
- **Privacy**: Each user's credentials remain isolated
- **Security**: Encryption keys tied to budget/user context
- **Compliance**: Better data protection practices
- **Scalability**: Support for multiple users without credential conflicts

### 4. Technology Stack Choices

#### App Component - Python
**Technologies**: FastAPI + NiceGUI + SQLite
**Rationale**:
- **FastAPI**: Modern, fast web framework with automatic API documentation
- **NiceGUI**: Simple, reactive UI framework perfect for internal tools
- **SQLite**: Lightweight, serverless database suitable for credential storage
- **Python**: Rapid development, excellent ecosystem for web apps

#### Service Component - TypeScript
**Technologies**: Node.js + israeli-bank-scrapers + @actual-app/api
**Rationale**:
- **israeli-bank-scrapers**: Only available in JavaScript/TypeScript
- **@actual-app/api**: Official Actual API client
- **TypeScript**: Type safety for complex data transformations
- **Node.js**: Mature ecosystem for scraping and API integration

#### Utils Component - Multi-language
**Decision**: Prefer Python, use TypeScript when necessary
**Rationale**:
- **Python Preference**: Simpler syntax, better for utility functions
- **TypeScript When Needed**: For Actual API integration requiring type safety
- **Code Reuse**: Shared functionality across components

### 5. Development Environment

**Decision**: Complete dev container with Actual + Authelia

**Rationale**:
- **Consistency**: Same environment for all developers
- **Isolation**: No conflicts with local installations
- **Testing**: Complete testing environment included
- **Productivity**: Immediate development setup

## Component Design

### App Component (`src/app/`)

```
src/app/
├── main.py           # FastAPI application entry point
├── ui.py             # NiceGUI interface for credential management
└── oidc.py           # OIDC authentication logic
```

**Responsibilities**:
- Credential management interface
- User authentication via OIDC for the credential management interface
- use utils for secure credential storage and getting information form actual

**Key Design Patterns**:
- **MVC Pattern**: Separation of UI, authentication, and data logic
- **Component-based UI**: Reusable UI components with NiceGUI
- **Session Management**: Secure session handling with OIDC tokens

### Service Component (`src/service/`)

```
src/service/
├── index.ts          # Main service entry point
├── scraper.ts        # Bank scraping orchestration
├── importer.ts       # Actual Budget transaction import
└── types.ts          # TypeScript interfaces and types
```

**Responsibilities**:
- Transaction scraping from Israeli banks using israeli-bank-scrapers
- Data transformation and cleaning
- Actual Budget API integration using admin account access
- Automatic account creation and mapping
- Loading encrypted credentials from database for each budget

**Key Design Patterns**:
- **Repository Pattern**: Abstract data access for different sources
- **Factory Pattern**: Dynamic scraper creation based on bank type
- **Pipeline Pattern**: Data processing through transformation stages

**Implementation Notes**:
- **New Implementation**: Create from scratch in `src/service/` folder
- **Admin Access**: Use admin OIDC token to access all user budgets
- **Reference Pattern**: Follow `production-oidc-example.ts` for Actual API usage
- **Legacy Files**: Don't edit old TypeScript files in `src/` root - they will be deleted

### Utils Component (`src/utils/`)

```
src/utils/
├── credential_encryption.py  # Password encryption/decryption (complete)
├── db_interface.py           # SQLite database operations (needs SQL injection fixes)
├── actual_api.ts            # Actual API utilities (to be created)
└── constants.py             # Shared constants
```

**Responsibilities**:
- Encryption/decryption services
- Database operations
- Actual API connection management
- Shared utilities and constants

**Key Design Patterns**:
- **Facade Pattern**: Simple interface to complex encryption operations
- **Singleton Pattern**: Single database connection instance
- **Factory Pattern**: API connection creation

**Implementation Notes**:
- **credential_encryption.py**: Complete and valid implementation
- **db_interface.py**: Basic implementation, needs SQL injection fixes
- **actual_api.ts**: To be created to replace legacy `dataLayer.ts`
- **Legacy**: `dataLayer.ts` is a poor first attempt and should be deleted

## Data Flow

### 1. Credential Management Flow
```
User → OIDC Auth → Budget Selection → Credential Entry → Encrypted Storage
```

### 2. Transaction Sync Flow
```
Service → Load Credentials → Scrape Banks → Transform Data → Import to Actual → Update Mappings
```

### 3. Security Flow
```
User Credentials → Per-Budget Encryption → Keyring Storage → Secure Retrieval
```

## Security Architecture

### Encryption Strategy
- **Per-Budget Keys**: Each budget gets unique encryption keys
- **System Keyring**: Keys stored in OS-level secure storage
- **Fernet Encryption**: Industry-standard symmetric encryption
- **Key Format**: `<budget-name>-<budget-id>` for key identification

### Authentication Flow
- **OIDC Provider**: Authelia for authentication
- **Session Management**: Secure session tokens
- **Budget Access**: User access validated per budget
- **Admin Service**: Separate admin account for service operations

## Configuration and Database Schema

### File Structure
```
data/
├── config.yaml         # System configuration (OIDC, chron job)
└── sqlite.db           # Database for user bank credentials and budget mappings
```

### Budgets Table
```sql
CREATE TABLE budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL UNIQUE,
    default_account_id INTEGER,
    FOREIGN KEY (default_account_id) REFERENCES accounts (id)
);
```

### Accounts Table
```sql
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_provider TEXT NOT NULL,
    account TEXT NOT NULL,
    password TEXT NOT NULL,  -- Encrypted
    budget_id INTEGER,
    FOREIGN KEY (budget_id) REFERENCES budgets (id)
);
```

## Error Handling Strategy

### App Component
- **Validation**: Form validation with user-friendly messages
- **OIDC Errors**: Proper redirect handling for auth failures
- **Database Errors**: Graceful degradation with error notifications

### Service Component
- **Scraping Failures**: Retry logic with exponential backoff
- **API Errors**: Proper error categorization and logging
- **Network Issues**: Timeout handling and connection recovery

### Utils Component
- **Encryption Errors**: Secure error messages without key exposure
- **Database Corruption**: Backup and recovery procedures
- **Key Management**: Fallback key generation strategies

## Testing Strategy

### Unit Tests
- **Simple Approach**: Focus on core business logic
- **Mock External Services**: Bank scrapers and Actual API
- **Encryption Testing**: Verify encryption/decryption cycles

### Integration Tests
- **Dev Container**: Full stack testing in controlled environment
- **Database Operations**: Test full CRUD operations
- **OIDC Flow**: End-to-end authentication testing

### Performance Tests
- **Scraping Load**: Test with multiple concurrent bank connections
- **Database Performance**: Test with realistic data volumes
- **Memory Usage**: Monitor memory consumption during long runs
