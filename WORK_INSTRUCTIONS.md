# WORK INSTRUCTIONS — FPL Data Lab (FFootball)

Instructions for the Claude Code agent building this project in `E:\FFootball`.
Read [PLAN.md](PLAN.md) first; it holds the architecture, schema, endpoint
contracts and sandbox design. This file tells you what to build, in what
order, and how to prove each phase works before moving on.

House rules (apply to every phase):

- JavaScript, never TypeScript. React + Vite frontend, PHP + MariaDB backend.
- No inline CSS. All app styling in a single `src/App.css`. The student CSS
  tab inside the sandbox is the only exception, by design.
- Every JS function/component gets JSDoc; every PHP file and function gets
  PHPDoc. Comments explain constraints, not narrate lines.
- Frontend config comes from `.config.json` at the project root (imported by
  Vite): `{ "apiBaseUrl": "http://localhost/ffootball/api" }`.
- Every PHP endpoint begins:
  ```php
  require_once __DIR__ . '/cors.php';   // always first
  require_once __DIR__ . '/db.php';
  ```
- cors.php: reflect the Origin header back when it matches
  `http://localhost:<any port>` or `https://football.toolsforteaching.co.uk`;
  set `Content-Type: application/json; charset=utf-8`,
  `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`,
  `Access-Control-Allow-Headers: Authorization, Content-Type`,
  `Access-Control-Allow-Credentials: true`; answer OPTIONS with HTTP 200 and
  `exit()`. Session cookies require the credentials header and
  `axios.defaults.withCredentials = true` on the frontend.
- All DB access via PDO prepared statements. Never interpolate user input.
- No em-dashes in any documentation or UI copy.
- Commit at the end of each phase with a message naming the phase.

Local environment: Laragon (Apache on localhost:80, MariaDB) already runs on
this machine. Vite serves only the frontend. No Vite proxy.

---

## Phase 0 — Scaffold

1. In `E:\FFootball`, scaffold with `npm create vite@latest . -- --template react`
   (JavaScript template). Keep the standard Vite structure.
2. Install runtime deps: `npm i axios @monaco-editor/react @babel/standalone`.
3. Install the react-doctor skill: `npx -y react-doctor@latest install`
   (pre-approved).
4. Download React 18 and ReactDOM 18 UMD production builds into
   `public/sandbox/react.production.min.js` and
   `public/sandbox/react-dom.production.min.js` (from the react@18 npm
   package's umd folder, not a CDN reference at runtime).
5. Create `.config.json` (dev values) and `.config.sample.json`.
6. Create `api/` folder with `config.sample.php` (DB credentials template).
   Git-ignore `api/config.php` and nothing else unusual.
7. `git init` if needed; sensible `.gitignore` (node_modules, dist,
   api/config.php).

**Check:** `npm run dev` shows the Vite starter page with no console errors.

## Phase 1 — Database and core API

1. Write `db/schema.sql` exactly as specified in PLAN.md section 5, including
   the settings seed rows.
2. Create the `ffootball` database in Laragon MariaDB and apply the schema
   (document the command used in README).
3. Build in `api/`:
   - `cors.php` per house rules above.
   - `db.php`: PDO connection factory reading `config.php`; utf8mb4;
     ERRMODE_EXCEPTION; helper `json_out($data, $status = 200)`.
   - `auth_check.php`: `session_start()` handling, `current_user()`,
     `require_login()`, `require_role($minRole)` with student < teacher < admin.
   - `login.php` (POST): verify with `password_verify`, regenerate session id,
     store user id + role in session, return user JSON. Generic 401 message on
     failure (do not reveal which part was wrong).
   - `logout.php` (POST), `me.php` (GET).
   - `users.php`: CRUD per the role matrix in PLAN.md section 6. Teachers
     manage student accounts only; admins manage everyone. Passwords hashed
     with `password_hash()`. DELETE deactivates rather than hard-deletes
     (preserves work); admin may hard-delete an inactive account.
   - `install.php`: creates the first admin (credentials printed once),
     refuses to run if any admin already exists. README must say to delete it
     after use in production.
4. On user creation with role student, also insert an empty `workspaces` row
   seeded with the starter JSX and CSS templates (store the starter text in
   `api/starter_templates.php` so PHP and docs share one source).

**Check:** From a REST client or curl: install admin, login (cookie set),
me.php returns the user, create a student as admin, login as that student,
users.php as student returns 403.

## Phase 2 — FPL proxy, cache, settings

1. `settings.php`: GET (admin) returns all settings; PUT updates
   `fpl_base_url` and `cache_ttl_seconds` with validation (URL must be https,
   TTL 60-86400).
2. `fpl.php` (GET, any logged-in user) implementing exactly the whitelist and
   cache contract in PLAN.md section 6, including the stale-cache fallback and
   `X-FPL-Cache: hit|miss|stale` header. cURL with a 10-second timeout and a
   desktop User-Agent string (FPL rejects some default agents).
3. Add `clear_cache` action to settings.php (admin) that truncates `fpl_cache`.
4. Make sure Apache gzip/deflate applies to these JSON responses; if not
   configurable, gzip in PHP when the client accepts it.

**Check:** Logged in, `fpl.php?endpoint=bootstrap-static` returns JSON with
`X-FPL-Cache: miss`, then `hit` on the second call. `endpoint=element-summary&id=abc`
returns 400. Not logged in returns 401.

## Phase 3 — Frontend shell

1. Set `axios.defaults.withCredentials = true` once, in a small
   `src/api.js` module that also builds URLs from `.config.json`. All
   components call the API through this module.
2. Login page; on success route by role. Use react-router or a simple
   state-based router, whichever keeps the code most readable for students to
   later study; document the choice.
3. App layout: header with app name, logged-in user, role badge, logout.
   Route guards: students see only the Workbench; teachers see Workbench +
   Students; admins additionally see Admin.
4. First-login forced password change screen (flag comes from me.php).
5. All styling in `App.css`.

**Check:** Login as each role in the browser; correct navigation appears;
refresh keeps you logged in (session cookie); logout works.

## Phase 4 — Workbench: editor, compiler, sandbox

The heart of the app. Components under `src/components/workbench/`.

1. **Editor**: `@monaco-editor/react` with three tabs (DataDisplay.jsx,
   DataDisplay.css, Notes). The JSX preamble (imports + JSDoc header from
   PLAN.md / starter template) renders above the editor as a read-only
   syntax-highlighted block, visually joined to the editor but not editable.
   Notes tab is plain text (Monaco markdown mode is fine).
2. **Compile pipeline** in `src/sandbox/compile.js`:
   - join preamble + student code, strip `import`/`export` lines;
   - `Babel.transform(..., { presets: ['react'] })`;
   - on syntax error, surface message + line number to the console panel and
     do not touch the running iframe.
3. **Sandbox host** `src/components/workbench/OutputFrame.jsx`:
   - on every Run, remove and recreate the iframe
     (`sandbox="allow-scripts allow-same-origin"`);
   - srcdoc loads `/sandbox/react.production.min.js`,
     `/sandbox/react-dom.production.min.js`, and an inline bootstrap script;
   - bootstrap listens for one postMessage `{ code, css, apiBaseUrl }`,
     injects css into a style tag, builds scope `{ React, useState, useEffect,
     axios: lockedAxios, config: { apiBaseUrl } }`, evaluates code with
     `new Function`, renders `<DataDisplay />` into `#root`;
   - `lockedAxios` is a tiny fetch-based wrapper exposing `get/post` that
     resolves every URL against apiBaseUrl and throws
     "This sandbox can only call the class API" for anything else
     (absolute URLs to other hosts included);
   - `window.onerror`, `unhandledrejection`, and wrapped
     `console.log/warn/error` post back `{ type, text }` messages.
4. **Console panel** below the output: renders those messages with
   log/warn/error styling and a Clear button.
5. Run button and Ctrl+Enter both trigger the pipeline.

**Check:** Paste the starter DataDisplay code, Run, see the JSON of
`get_items.php` fail gracefully (endpoint does not exist: error state renders,
which proves the error path). Change it to
`fpl.php?endpoint=bootstrap-static` and see data render. `console.log` output
appears in the panel. A `while(true){}` then Run again: page stays alive
because the old iframe is destroyed. An axios call to `https://example.com`
is refused with the sandbox message.

## Phase 5 — Persistence and API explorer

1. `workspace.php` (GET/PUT). PUT saves the three fields, inserts a
   `workspace_backups` row, prunes to the newest 20 per user. GET with
   `?user_id=` allowed for teacher+ (read-only use).
2. `backups.php`: GET lists (id, saved_at, byte sizes); POST restores one into
   the live workspace (which itself triggers a backup of the current state
   first, so a restore is always reversible).
3. Frontend: load workspace on Workbench mount; Save button; autosave
   debounced 30 s after last edit; "Saved HH:MM" / "Unsaved changes"
   indicator; warn on tab close with unsaved changes (`beforeunload`).
4. Backup drawer for students: list of their backups with Restore.
5. **API explorer panel**: the four whitelisted endpoints with parameter
   inputs (id, gameweek), Fetch button, collapsible JSON tree (write a small
   recursive `JsonTree` component, no heavy dependency), and a "Copy axios
   snippet" button that emits a ready-to-paste call for the current endpoint.
   Show a size warning next to bootstrap-static.

**Check:** Type code, wait for autosave, hard-refresh: work returns. Wreck the
code, Save, restore yesterday's backup: both directions work. Explorer
fetches all four endpoints and the snippet pastes into the editor and runs.

## Phase 6 — Teacher dashboard and admin panel

1. **Students screen (teacher+)**: table of student accounts with display
   name, username, last save time, active flag. Actions: open work
   (read-only Workbench with banner and Run enabled but Save hidden),
   view/restore backups, reset password (generates temp password shown once,
   sets the force-change flag), create student account, deactivate.
2. **Admin panel**: everything teachers get, plus create/edit teacher and
   admin accounts, hard-delete inactive users, edit FPL base URL and cache
   TTL, clear FPL cache, and a small status card (cache rows + age, DB size
   of workspaces).
3. Backend guards enforce all of this server-side; the UI hiding buttons is
   not the security boundary.

**Check:** Teacher can see and run a student's work but PUT workspace.php for
that student returns 403. Student calling users.php or settings.php gets 403.
Admin changes cache TTL and it takes effect.

## Phase 7 — Documentation and handover

1. **README.md** (thorough, human tone, no em-dashes):
   overview and screenshot, feature list per role, full local setup for
   Laragon (DB creation, api placement, `.config.json`, install.php, first
   admin), Hostinger deployment walkthrough per PLAN.md section 9, the
   sandbox security model and its accepted trade-offs, endpoint reference
   table, backup/restore behaviour, and a short "for students" section
   explaining the editor, the fixed preamble, and the axios wrapper limits.
2. **LICENSE**: Creative Commons BY-NC-SA 4.0 full text with attribution to
   Simon Rundell / Exeter College.
3. `db/schema.sql` and `.config.sample.json` / `api/config.sample.php`
   verified current against the code.
4. Run react-doctor; fix what it flags.
5. Full end-to-end pass of every phase Check above, in the browser, as all
   three roles. Record results in a short TESTING.md checklist with pass/fail.

**Done means:** a colleague could clone the repo, follow README on a fresh
Laragon machine, and have a working class instance in under an hour.
