# FPL Data Lab (FFootball)

A classroom web application for Exeter College. Students browse live UK
Premier League Fantasy Football (FPL) data through a PHP proxy and write
their own JSX and CSS in a browser-based Monaco editor, seeing the result
rendered live in a sandboxed output panel. Teachers can view any student's
work; admins additionally manage accounts and system settings.

Author: Simon Rundell, Exeter College.

Full architecture, schema and endpoint contracts are in [PLAN.md](PLAN.md).
The phased build log and acceptance checks are in
[WORK_INSTRUCTIONS.md](WORK_INSTRUCTIONS.md).

## Features by role

### Student

- Sign in, land on the Workbench.
- Three-tab Monaco editor: DataDisplay.jsx (with a read-only preamble
  above it), DataDisplay.css, and Notes.
- Run compiles the JSX with Babel and renders it in a sandboxed iframe,
  with console output piped back to a console panel.
- API explorer panel to browse the four whitelisted FPL endpoints before
  writing code against them, with a "copy axios snippet" button.
- Save button plus 30-second autosave; a "Saved HH:MM" indicator; a
  warning if you try to close the tab with unsaved changes.
- Backups drawer: the last 20 saves, restorable at any time (restoring
  itself takes a backup first, so it's reversible).
- Forced password change on first login.

### Teacher (everything a student has, for their own account, plus)

- Students screen: every student account, last-saved time, active flag.
- Open a student's work in a read-only Workbench (Run works, Save is
  hidden) with a "viewing X's work" banner.
- View and restore a student's backups.
- Reset a student's password (shown once) and create new student
  accounts.
- Deactivate a student account (their work is preserved, not deleted).

### Admin (everything a teacher has, plus)

- Create and manage teacher and admin accounts too.
- Hard-delete an account, but only once it is already deactivated.
- Edit the FPL base URL and cache TTL, and clear the FPL cache.
- A status card: FPL cache row count and age, workspace data size,
  student count.

## Tech stack

React + Vite + JavaScript (no TypeScript) on the frontend, PHP 8 +
MariaDB (PDO, prepared statements) on the backend. Monaco is the code
editor; `@babel/standalone` compiles student JSX in the browser;
student code runs inside a sandboxed iframe loading local React 18 UMD
builds, never a CDN. See PLAN.md section 4 for the full stack table.

## Local setup (Laragon)

1. **Clone the repo** into a folder Laragon's Apache can reach. This
   project was built at `E:\FFootball` with a Laragon `www` folder
   junction pointing at it:

   ```bat
   mklink /J C:\laragon\www\ffootball E:\FFootball
   ```

   With Laragon's default vhost, the API ends up reachable at
   `http://localhost/api/...`. If your Laragon setup instead serves each
   `www` subfolder at its own path, your API base URL will be
   `http://localhost/ffootball/api` instead; adjust `.config.json`
   accordingly.

2. **Install frontend dependencies:**

   ```bash
   npm install
   ```

3. **Create the database.** In Laragon's MariaDB (or phpMyAdmin), run
   `db/schema.sql`. It creates the `ffootball` database, all tables, and
   seeds the two default settings rows.

4. **Configure the backend.** Copy `api/config.sample.php` to
   `api/config.php` (git-ignored) and fill in your MariaDB credentials.

5. **Configure the frontend.** Copy `.config.sample.json` to
   `.config.json` (git-ignored) and set `apiBaseUrl` to wherever step 1
   put the API, for example:

   ```json
   { "apiBaseUrl": "http://localhost/api" }
   ```

6. **Create the first admin account.** With Apache and MariaDB running,
   POST to `install.php` once:

   ```bash
   curl -X POST http://localhost/api/install.php \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","display_name":"Your Name","password":"a-strong-password"}'
   ```

   `install.php` refuses to run again once an admin exists. Delete or
   rename it after use, especially in production.

7. **Run the frontend dev server:**

   ```bash
   npm run dev
   ```

   Vite serves only the frontend (no proxy needed); the PHP API is
   served directly by Apache. Log in with the admin account from step 6.

## Production deployment (Hostinger)

1. `npm run build` and upload the contents of `dist/` to the
   subdomain's `public_html/`.
2. Upload the `api/` folder to `public_html/api/`, with a real
   `config.php` (never commit this file).
3. Create the MariaDB database and user in hPanel, then run
   `db/schema.sql` via phpMyAdmin.
4. Run `install.php` once via curl or a browser POST tool, then delete
   it from the server.
5. Set the production `.config.json` to
   `{ "apiBaseUrl": "https://football.toolsforteaching.co.uk/api" }`
   before building.
6. `cors.php` already accepts `https://football.toolsforteaching.co.uk`
   alongside any `localhost` port, so no changes are needed there.
7. Force HTTPS and confirm PHP's `session.cookie_secure` is on in
   production (the app sets `secure` on the session cookie automatically
   whenever `$_SERVER['HTTPS']` is set).

## The sandbox security model

Student code never runs on the host page. On **Run**, the app:

1. Prepends the fixed, read-only preamble to the student's JSX, strips
   `import`/`export` lines (they can't work inside a `new Function` eval
   anyway), and compiles it with `@babel/standalone` using the classic
   JSX runtime (`React.createElement`, not the automatic runtime, which
   would otherwise inject an `import` the sandbox can't resolve).
2. Destroys the previous output iframe and creates a fresh one, so an
   infinite loop or crash in student code can't take down the editor or
   lose unsaved work.
3. Posts the compiled code and CSS into the new iframe, which evaluates
   it with the real `React`, `useState`, `useEffect`, `axios` and
   `config` injected into scope; nothing is imported at runtime.
4. The `axios` given to student code is a locked-down wrapper: any
   request that doesn't resolve to the class API base URL is refused
   with a clear error, so student code cannot call arbitrary hosts.
5. `console.log/warn/error`, uncaught errors and unhandled promise
   rejections inside the iframe are all posted back to the host and
   shown in the console panel.

The iframe uses `sandbox="allow-scripts allow-same-origin"`. Combining
those two normally lets a page escape its sandbox, but that is an
accepted, deliberate trade-off here: `allow-same-origin` is required so
the sandbox shares the session cookie for its API calls, and the code
running inside is always the logged-in student's own work on a closed
college system. This is the same model CodePen used for years.

## Backups and restore

Every save writes a `workspace_backups` row in addition to updating the
live workspace; the server prunes each student down to their newest 20
backups. Restoring a backup itself takes a backup of the current state
first, so restoring is always reversible in both directions. Students
manage their own backups; teachers and admins can view and restore a
student's backups too.

## API reference

All endpoints require `require_once cors.php` then `require_once
db.php` first, per house style, and use PHP sessions for auth.

| Endpoint | Method | Role | Purpose |
| --- | --- | --- | --- |
| `install.php` | POST | public, once | creates the first admin account |
| `login.php` | POST | public | starts a session |
| `logout.php` | POST | any | destroys the session |
| `me.php` | GET | any | current user + role, used on app boot |
| `change_password.php` | POST | any | change your own password |
| `users.php` | GET/POST/PUT/DELETE | teacher (students only) / admin (all) | account CRUD, password reset, activate/deactivate |
| `workspace.php` | GET/PUT | student (own) / teacher+ (read-only via `?user_id=`) | load/save the workspace |
| `backups.php` | GET/POST | student (own) / teacher+ | list/restore backups |
| `settings.php` | GET/PUT/POST | admin | FPL base URL, cache TTL, clear cache, stats |
| `fpl.php` | GET | any logged-in | FPL proxy, see below |

`fpl.php?endpoint=<name>[&id=N][&gw=N]` whitelists exactly four
endpoints: `bootstrap-static`, `fixtures`, `element-summary` (needs
`id`), `event-live` (needs `gw`, 1-38). Anything else is HTTP 400.
Responses are cached in `fpl_cache` for `cache_ttl_seconds`; if the
upstream FPL API is unreachable, a stale cached copy is served instead
of failing, with an `X-FPL-Cache: stale` header.

## For students

Your workbench has three things: an editor, an output panel, and an API
explorer.

- The greyed-out block above the JSX editor is fixed. It's the imports
  and header comment you'd normally write by hand; you can't edit it,
  but everything below it is yours.
- `axios` inside your code can only talk to the class API
  (`fpl.php?endpoint=...` and similar). Trying to call any other web
  address will fail with a clear error message, on purpose.
- Click **Run** (or press Ctrl+Enter) to see your component render.
  Errors and `console.log` output show up in the console panel below
  the output.
- Use the **API explorer** to see what an endpoint's data actually looks
  like before you write code against it, and copy a ready-made snippet
  into your editor.
- Your work saves automatically 30 seconds after you stop typing, and
  you can hit **Save** any time. If you ever wreck something, open
  **Backups** and restore an earlier version.

## License

Creative Commons BY-NC-SA 4.0. See [LICENSE](LICENSE).
