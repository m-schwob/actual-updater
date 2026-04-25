---
applyTo: ".devcontainer/**"
description: "Devcontainer environment requirements and decisions for Actual Updater. Reference when updating Dockerfile, services, or dependencies."
---

# Devcontainer Environment

## Required Services

Both services below must always be running inside the devcontainer. Their versions must be explicitly pinned so the environment is reproducible.

| Service | Config Location | Reference Docs & Releases |
|---------|----------------|--------------------------|
| **Actual Server** | `.devcontainer/actual-server/config.json` | [Docs](https://actualbudget.org/docs/) · [GitHub](https://github.com/actualbudget/actual-server) ·  |
| **Authelia** | `.devcontainer/authelia/configuration.yaml` | [Docs](https://www.authelia.com/configuration/) · [GitHub](https://github.com/authelia/authelia/releases) |

## Key Project Packages

These packages are central to the project's function. Their versions must be compatible with each other and with the Actual Server version running in the devcontainer.

| Package | Purpose |
|---------|---------|
| `israeli-bank-scrapers` | Bank data scraping |
| `@actual-app/api` | Actual Budget API client |
| `@actual-app/sync-server` | Actual Server (devcontainer service) |

## Decisions

**Config changes vs version changes** — Changing a service's runtime configuration (Authelia YAML, Actual config.json) must not require rebuilding the container image; only a service restart is needed. Version changes to packages or services require a container rebuild.

**Version pinning** — All service and package versions must be explicit (no `latest` or unbound ranges) so the environment is reproducible across rebuilds.
