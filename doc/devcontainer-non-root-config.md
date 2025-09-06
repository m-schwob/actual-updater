## Dev Container Non-Root User Configuration

This dev container runs as a non-root user (`dev`) primarily for **Puppeteer/Chromium compatibility** in production environments. For detailed technical reasons, see [puppeteer-docker-notes.md](./puppeteer-docker-notes.md).

This choice has implications on several configuration files that had to be adapted to work with the non-root VS Code dev container while still maintaining the previous functionality of the container services.

---

### 🔹 Supervisord Configuration

Running the `supervisord` service as root while the container runs as non-root complicates handling files and services. So it's better to run `supervisord` itself as the non-root user too.

To achieve this, some adjustments to the `supervisord.conf` file are necessary:

**1. Change socket and PID file locations** to a directory writable by the `dev` user.

The `/tmp/supervisord/` directory is owned by `dev` and used for both socket and PID files (the default socket file at `/var/run/supervisor.sock` is not writable by non-root users).

> *Why `/tmp/supervisord/` over other options?*
> - `/var/run/` - Standard location but requires root ❌
> - `/run/user/<uid>/` - User-specific but complex setup ❌  
> - `/home/dev/` - User-owned but wrong purpose ❌
> - `/tmp/` - Always writable but cluttered ⚠️
> - `/tmp/supervisord/` - Organized, writable, follows convention ✅

**Impact**: All `supervisorctl` commands must now specify the config file with `-c .devcontainer/supervisord.conf` (otherwise it looks for the default socket file).

**2. Explicitly specify the `dev` user** for all programs.

For example:
```conf
[program:authelia]
user=dev  
```

---

### 🔹 Dockerfile and Dev Container Adaptations

Many tweaks to the Dockerfile were necessary to set up the `dev` non-root user and ensure proper permissions while installing dependencies as root:

1. Creating the `dev` user and group
2. Granting `dev` sudo rights without password for development convenience
3. Changing ownership of `/tmp/supervisord/` and Python venv installation folder to `dev:dev` to ensure smooth development in VS Code dev containers
4. Setting `"remoteUser": "dev"` in devcontainer.json to ensure VS Code connects as the `dev` user

