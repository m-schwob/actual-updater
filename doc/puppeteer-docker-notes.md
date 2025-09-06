## Notes on running Puppeteer in Docker

When running Puppeteer (headless Chromium) in Docker, there are several important considerations to ensure stability, security, and performance. Below are explanations for the key choices made in the current setup, along with potential future improvements.

### 🔹 Why use a **non-root user**?

* **Reason**: Chromium’s sandbox is designed to run under an unprivileged user. Running as `root` forces you into `--no-sandbox` mode.
* **If skipped**: You’ll be forced to use `--no-sandbox`, which weakens Chromium’s own security sandbox (a malicious page could escape into your app’s context).

---

### 🔹 Why avoid `--no-sandbox` mode?

* **Reason**: The sandbox is Chromium’s main defense against malicious web content. With it, even if bank websites have compromised JS, they can’t reach your container’s filesystem or secrets.
* **If skipped**: Chromium runs, but without sandboxing — any exploit in the page could access your cookies, session storage, or other sensitive data.

---

### 🔹 Why use the **Puppeteer image**?

* **Reason**: It comes preloaded with all the tricky system dependencies (fonts, GTK/X11 libs, nss, etc.) needed for Chromium to start. Saves you from manually figuring out dozens of packages.
* **If skipped**: If you start from `node:slim` or `debian`, you’ll spend time chasing missing libraries and runtime errors like *“error while loading shared libraries”*.

---

### 🔹 Why `--init` and `--ipc=host`?

* **`--init` (tini)**

  * **Reason**: Handles zombie processes and forwards signals correctly. Without it, Chromium subprocesses can hang forever and `puppeteer.launch()` just stalls.
  * **If skipped**: You risk zombie processes piling up and Puppeteer freezing on launch/close.

* **`--ipc=host`**

  * **Reason**: Shares the host’s `/dev/shm` (shared memory). Chromium relies on large shared memory segments for rendering and IPC.
  * **If skipped**: Docker’s default `/dev/shm` (64 MB) is too small, so Chromium may crash or hang when multiple tabs/pages are open.

---

### 🔹 Letting Israeli bank scraper launch the browser (vs. manual control)

* **Current (simple) approach**: Less code, works fine now that the container is configured.
* **Potential future benefits of manual control**:

  * Add flags (`--disable-dev-shm-usage`, `--disable-gpu`, etc.) for portability in CI/K8s.
  * Control the Chromium binary used (`system` vs `cache`).
  * Reuse a single browser instance across multiple scrapers (performance).
  * Easier debugging/logging (`dumpio: true`).

---

### 🔹 Using system Chromium vs Puppeteer-downloaded cache Chromium

* **System Chromium** (`apt-get install chromium`):

  * Matches the container’s libraries, often more stable.
  * You can enable the setuid sandbox properly (`chrome-sandbox` with 4755 perms).
  * No redundant Chromium download at install time.
* **Cache Chromium** (`~/.cache/puppeteer/...`):

  * Guaranteed version match with Puppeteer.
  * But may depend on dbus/X11 features not present in slim containers.
* **If skipped**: sticking with cache Chromium works but may cause “random” hangs in minimal images. Switching to system Chromium is a future improvement for stability and startup speed.

---

### 🔹 Scraping multiple sources in parallel

* **With correct setup (non-root + sandbox + init + shm)**: You can open multiple pages/tabs in the same browser or even multiple browsers without issue.
* **If missing optimizations**:

  * Without `--ipc=host` → multiple pages will quickly exhaust `/dev/shm` and crash.
  * Without `--init` → zombie Chromium processes will pile up and eventually block launches.
  * Without non-root sandbox → all parallel sessions are unsandboxed, a bigger security hole.
  * Using cache Chromium → parallel scraping stresses edge cases (e.g. dbus, missing libs).

So the “hardening” we did isn’t just academic — it becomes essential when scraping multiple banks in parallel reliably.

---

✅ **Bottom line:**

* Non-root + sandbox = security
* Puppeteer image = convenience
* `--init` + `--ipc=host` = stability & performance
* Manual browser control & system Chromium = future improvements for portability and scaling
* These choices matter *more* when running many scrapers at once, where stability and resource limits become bottlenecks.

---
