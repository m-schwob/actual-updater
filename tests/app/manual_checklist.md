# Phase 4 — Manual Test Checklist

End-to-end smoke test with real external services: Authelia OIDC, Actual Budget server, real credentials, real browser.

**Run before:** merging to `main`; after any change to OIDC flow, session handling, or the Actual Budget API integration.

---

## Prerequisites

- [ ] Devcontainer is running: `supervisorctl status` shows both `authelia` and `actual-server` as `RUNNING`
- [ ] At least one budget exists in Actual Budget at `http://localhost:5006` (create one if needed)
- [ ] App is running: `uvicorn src.app.main:app --reload` (port 8080)

---

## Checklist

### 1. Login Flow
- [ ] Navigate to `http://localhost:8080/`
- [ ] Page redirects to Authelia login at `http://localhost:9091`
- [ ] Log in with valid credentials
- [ ] Redirected back to the accounts manager page
- [ ] Logged-in username is displayed on the page

### 2. Budget Selector
- [ ] Budget dropdown is visible and populated
- [ ] Budgets shown match those configured in Actual Budget (not hardcoded stubs)
- [ ] Selecting a different budget updates the table

### 3. Load Accounts
- [ ] Switch between budgets using the dropdown
- [ ] Table updates to show providers for the selected budget
- [ ] Empty budget shows an empty table (no stale rows from a previous budget)

### 4. Add Account
- [ ] Fill in: bank name, account ID, username, password
- [ ] Click **Add**
- [ ] Success notification appears
- [ ] New row is visible in the table immediately
- [ ] Reload the page — row persists

### 5. Edit Account
- [ ] Click **Edit** on an existing row
- [ ] Row switches to edit mode (Save / Cancel buttons appear)
- [ ] Modify a field (e.g. username)
- [ ] Click **Save**
- [ ] Success notification appears
- [ ] Row reflects the change
- [ ] Reload the page — change persists

### 6. Delete Account
- [ ] Click **Delete** on a row
- [ ] Row disappears from the table
- [ ] Reload the page — row is gone

### 7. Validation
- [ ] Click **Add** with one or more required fields empty
- [ ] Error notification appears
- [ ] No row is added to the table

### 8. Logout
- [ ] Click the logout button / link
- [ ] Session is cleared (cookie gone)
- [ ] Navigating to `http://localhost:8080/` redirects to Authelia login again

### 9. Session Expiry
- [ ] Clear browser cookies manually (or wait for session to expire)
- [ ] Navigating to `http://localhost:8080/` redirects to Authelia login
- [ ] No unhandled server error is shown

### 10. Notification Visibility
- [ ] Success, error, and warning notifications each display with visible text
- [ ] Each notification has a working close button
- [ ] Notifications disappear automatically or on close without leaving ghost elements

---

## Notes

Phase 4 intentionally covers scenarios that automated tests cannot:
- Real OIDC token exchange and session cookie lifecycle
- Real Actual Budget API responses (dynamic budget list)
- Visual notification rendering in a real browser window
