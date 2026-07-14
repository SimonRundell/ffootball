# FPL Data Lab (working title: FFootball)

A classroom web application for Exeter College that lets students browse live UK
Premier League Fantasy Football (FPL) data, write their own JSX and CSS in a
browser-based editor, and see the result rendered live in an output window.
Students ultimately use it to build their own fantasy football team/league pages
as coursework. Teachers can view all student work; admins additionally manage
accounts and system settings.

Author: Simon Rundell, Exeter College.
License: Creative Commons BY-NC-SA 4.0.

---

## 1. Feasibility verdict

**Feasible, and well-trodden ground.** This is essentially a small CodePen-style
playground with a data proxy and simple auth bolted on. Every part uses boring,
proven techniques:

| Concern | Verdict |
|---|---|
| Live JSX compilation in the browser | Solved problem. `@babel/standalone` transpiles JSX in memory in a few ms. No server round-trip. |
| Code editor | `@monaco-editor/react` gives the full VS Code editor as a React component. |
| Running student code safely | Sandboxed `<iframe>` with React UMD builds loaded inside it. Errors caught and reported back. Standard playground architecture. |
| FPL data access | The FPL API is open and keyless but **sends no CORS headers**, so the browser cannot call it directly. A PHP proxy is required (see modification 1). |
| Accounts and stored work | Plain PHP sessions + MariaDB. Nothing exotic. |
| Hostinger deployment | Static Vite build + PHP + MariaDB is exactly what shared hosting is good at. No Node needed on the server. |

## 2. Modifications to the original idea

These change the design as originally described, each for a concrete reason.

1. **All FPL traffic goes through a PHP proxy (`api/fpl.php`).**
   The FPL API rejects cross-origin browser requests, so the frontend cannot
   fetch it directly. The proxy also lets us cache responses in MariaDB
   (bootstrap-static is about 2 MB; thirty students refreshing at once should
   hit our cache, not FPL's servers) and lets us whitelist which endpoints
   students may reach.

2. **The "REST API target" the admin can change lives in the database, not in
   `.config.json`.** The frontend `.config.json` stays fixed and only ever
   points at our own PHP API. The admin settings screen edits a `settings`
   table row (`fpl_base_url`) that the proxy reads. This gives the admin
   control without redeploying the frontend, and students can never point
   their code at an arbitrary URL.

3. **The preset portion of DataDisplay.jsx (imports, JSDoc header) is shown
   read-only and prepended at compile time.** Students edit only the body.
   At compile time the import lines are stripped anyway (imports do not work
   inside an in-memory sandbox) and the real objects (`React`, `useState`,
   `useEffect`, `axios`, `config`) are injected into scope inside the iframe.
   Pedagogically the students still *see* correct, idiomatic import syntax.

4. **Student code runs in a sandboxed iframe, not the host page.** An infinite
   loop or thrown error in student code must not take down the editor and
   lose unsaved work. The iframe can be killed and rebuilt on every run.
   The iframe also captures `console.log` output and runtime errors and
   reports them to a small console panel, which is a genuinely useful
   teaching aid.

5. **Single workspace per student, but with automatic server-side backups.**
   You chose the single-workspace model. To stop one accidental
   select-all-delete-save from destroying six weeks of work, every save also
   inserts a row into `workspace_backups`, and the server keeps the most
   recent 20 per student. Teachers and the student can restore from a backup.
   The UX stays "one workspace"; the safety net is invisible until needed.

6. **The axios available inside the sandbox is a thin wrapper locked to our
   API base URL.** Students call `axios.get('/fpl.php?endpoint=...')` style
   relative paths against `config.apiBaseUrl`. Requests elsewhere are refused
   by the wrapper with a clear error message.

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (React + Vite, JavaScript)                        │
│                                                            │
│  ┌──────────────┐  ┌───────────────────────────────────┐   │
│  │ Monaco       │  │ Output iframe (sandboxed)         │   │
│  │  JSX tab     │  │  React + ReactDOM UMD (local)     │   │
│  │  CSS tab     │──▶  student code, Babel-compiled     │   │
│  │  Notes tab   │  │  axios wrapper → our API only     │   │
│  └──────────────┘  └───────────────────────────────────┘   │
│  @babel/standalone compiles JSX in memory on "Run"         │
└───────────────┬────────────────────────────────────────────┘
                │ axios (JSON, session cookie)
┌───────────────▼───────────────────────────────────────────┐
│  PHP API  (Apache: Laragon locally, Hostinger in prod)    │
│  cors.php → db.php → session auth → endpoint logic        │
│                                                           │
│  login/logout/me · users · workspace · backups            │
│  settings · fpl.php (proxy + cache, endpoint whitelist)   │
└───────┬──────────────────────────────┬────────────────────┘
        │ PDO                          │ cURL (server-side, no CORS issue)
┌───────▼─────────┐          ┌─────────▼──────────────────┐
│  MariaDB        │          │  fantasy.premierleague.com │
│  users,         │          │  /api/...                  │
│  workspaces,    │          └────────────────────────────┘
│  backups,       │
│  settings,      │
│  fpl_cache      │
└─────────────────┘
```

## 4. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + JavaScript | `npm create vite@latest` template, no TypeScript |
| Editor | `@monaco-editor/react` | JSX and CSS tabs |
| Compiler | `@babel/standalone` | preset `react`, runs in the browser |
| HTTP | axios | all API calls |
| App styling | single `App.css` | no inline CSS; student CSS tab is separate by design |
| Backend | PHP 8.x, flat endpoint files under `api/` | PHPDoc throughout |
| Auth | PHP sessions, httpOnly cookie | `password_hash()` / `password_verify()` |
| DB | MariaDB via PDO, utf8mb4 | Laragon locally, Hostinger MySQL in prod |
| Config (frontend) | `.config.json` | `apiBaseUrl` only |
| Config (backend) | `api/config.php` | DB credentials; git-ignored, sample file committed |

## 5. Database schema

```sql
CREATE DATABASE IF NOT EXISTS ffootball
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Accounts. Roles: student < teacher < admin.
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One workspace per student. The LONGTEXT fields are the student's work.
CREATE TABLE workspaces (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL UNIQUE,
  jsx_code   LONGTEXT NULL,
  css_code   LONGTEXT NULL,
  notes      LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ws_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Safety net: last 20 saves per student (server prunes older rows).
CREATE TABLE workspace_backups (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL,
  jsx_code LONGTEXT NULL,
  css_code LONGTEXT NULL,
  notes    LONGTEXT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bk_user (user_id, saved_at),
  CONSTRAINT fk_bk_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- System settings editable by admin (fpl_base_url, cache_ttl_seconds).
CREATE TABLE settings (
  setting_key   VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL
);

-- FPL proxy cache. bootstrap-static payload is ~2 MB, hence LONGTEXT.
CREATE TABLE fpl_cache (
  endpoint   VARCHAR(120) PRIMARY KEY,
  payload    LONGTEXT  NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings VALUES
  ('fpl_base_url', 'https://fantasy.premierleague.com/api'),
  ('cache_ttl_seconds', '900');
```

Seed data: one admin account created by `api/install.php` (run once, then
delete or disable), default password forced to change on first login.

## 6. PHP API endpoints

All endpoints start with `require_once __DIR__ . '/cors.php';` then
`require_once __DIR__ . '/db.php';` per house style. Auth is a PHP session;
`require_role('teacher')` style guards in a shared `auth_check.php`.

| Endpoint | Method | Role | Purpose |
|---|---|---|---|
| `login.php` | POST | public | username + password, starts session |
| `logout.php` | POST | any | destroys session |
| `me.php` | GET | any | current user + role (frontend boot) |
| `users.php` | GET/POST/PUT/DELETE | teacher (students only) / admin (all) | account CRUD, password reset, activate/deactivate |
| `workspace.php` | GET/PUT | student (own) / teacher+ (any, read-only via `?user_id=`) | load/save the three LONGTEXT fields; PUT also writes a backup row |
| `backups.php` | GET/POST | student (own) / teacher+ | list backups, restore one |
| `settings.php` | GET/PUT | admin | fpl_base_url, cache TTL |
| `fpl.php` | GET | any logged-in | proxy, see below |

### fpl.php proxy contract

`GET fpl.php?endpoint=<name>[&id=N][&gw=N]`

Whitelist (anything else is HTTP 400):

| `endpoint` value | Upstream path |
|---|---|
| `bootstrap-static` | `/bootstrap-static/` |
| `fixtures` | `/fixtures/` |
| `element-summary` | `/element-summary/{id}/` (id must be numeric) |
| `event-live` | `/event/{gw}/live/` (gw must be 1-38) |

Logic: look up `fpl_cache`; if younger than `cache_ttl_seconds`, serve it;
otherwise cURL the upstream (server-side, so no CORS problem), store, serve.
If upstream is down, serve stale cache with an `X-FPL-Cache: stale` header
rather than failing the class.

## 7. The editor and sandbox in detail

### Editor pane
Three Monaco tabs: **DataDisplay.jsx**, **DataDisplay.css**, **Notes**.
Above the JSX editor, the fixed preamble (imports + JSDoc header from your
example) is rendered as a read-only, visually distinct block so students see
correct idiom but cannot break it. Buttons: **Run**, **Save** (plus a 30-second
debounced autosave with a "Saved 14:02" indicator).

### Run pipeline
1. Concatenate preamble + student JSX; strip `import`/`export` lines with a
   simple line filter.
2. `Babel.transform(code, { presets: ['react'] })` in the host page. Syntax
   errors are shown in the console panel with line numbers, and the iframe is
   left untouched.
3. Tear down and recreate the output iframe (`sandbox="allow-scripts
   allow-same-origin"`). Its srcdoc loads **local copies** of React 18 and
   ReactDOM UMD builds from `public/sandbox/` (no CDN dependency in a
   classroom), a small bootstrap script, and an empty `<div id="root">`.
4. `postMessage` the compiled JS and the CSS tab content into the iframe. The
   bootstrap script injects the CSS as a `<style>` tag, builds the scope
   (`React`, `useState`, `useEffect`, `axios` wrapper, `config`), evaluates
   the compiled code with `new Function`, and renders `<DataDisplay />` into
   `#root`.
5. Inside the iframe, `window.onerror` and a wrapped `console.log/warn/error`
   post messages back to the host, which displays them in the console panel.

Note on the sandbox attributes: `allow-same-origin` is needed so the iframe
shares the session cookie and origin for API calls. The code running there is
our own students', on a closed college system, so this is an accepted and
documented trade-off (it is the same model CodePen used for years).

### API explorer pane
A third panel listing the four whitelisted FPL endpoints with parameter
inputs, a "Fetch" button, and a collapsible JSON tree viewer. This is the
"browse the data" requirement: students explore the shape of the data before
writing code against it, and can copy a ready-made axios snippet for the
endpoint they are looking at.

## 8. Roles and screens

| Screen | Student | Teacher | Admin |
|---|---|---|---|
| Login | yes | yes | yes |
| Workbench (editor + output + explorer) | own work | read-only view of any student | same as teacher |
| Student list dashboard | no | yes: list, open work, restore backups, reset passwords, create student accounts | yes |
| Admin panel | no | no | yes: all user CRUD incl. teachers, FPL base URL, cache TTL, clear cache |

Teacher viewing a student's workspace gets the same workbench in read-only
mode with a "viewing Jane Smith's work" banner, and can Run their code to see
the output without being able to alter the saved copy.

## 9. Environments and deployment

### Local development (Laragon)
- Frontend: `npm run dev` (Vite, any port; cors.php reflects any localhost port).
- API: `E:\FFootball\api` served via Laragon virtual host or
  `http://localhost/ffootball/api` (symlink or copy into Laragon www; document
  the chosen mechanism in README).
- DB: Laragon MariaDB, database `ffootball`.
- `.config.json`: `{ "apiBaseUrl": "http://localhost/ffootball/api" }`.

### Production (Hostinger, https://football.toolsforteaching.co.uk)
- `npm run build`, upload `dist/` contents to the subdomain's public_html.
- Upload `api/` alongside it (`public_html/api/`).
- Create the MariaDB database + user in hPanel; run `schema.sql` via
  phpMyAdmin; run `install.php` once to seed the admin; then delete it.
- Production `.config.json`: `{ "apiBaseUrl": "https://football.toolsforteaching.co.uk/api" }`.
- cors.php accepts localhost:ANY (dev) plus the production origin.
- Force HTTPS and set `session.cookie_secure` in production.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| FPL changes or blocks its unofficial API | Proxy isolates the app; stale-cache fallback keeps lessons running; admin can repoint `fpl_base_url` at a mirror or a canned-data endpoint |
| Student writes an infinite loop | Iframe is destroyed and rebuilt per Run; host page and unsaved work unaffected |
| Student wipes their own work | 20-generation backup table, teacher-restorable |
| 2 MB bootstrap-static payload on classroom Wi-Fi | Server gzip (~300 KB on the wire); cache header so repeat fetches are cheap; explorer warns on the big endpoint |
| Shared-hosting session quirks | Plain PHP sessions are the most boring, best-supported mechanism Hostinger has; no JWT infrastructure needed |
| Password reuse by students | Only teacher/admin set passwords; no self-registration; forced change on first login |

## 11. Suggested build order

Seven phases, detailed in [WORK_INSTRUCTIONS.md](WORK_INSTRUCTIONS.md):

0. Scaffold (Vite app, deps, react-doctor, repo hygiene)
1. Database + core API (cors, db, auth, install)
2. FPL proxy + cache + settings
3. Frontend shell: login, routing, role gates
4. Workbench: Monaco, Babel pipeline, sandbox iframe, console panel
5. Workspace save/load/autosave/backups + API explorer
6. Teacher dashboard + admin panel
7. Documentation, LICENSE, deployment guide, end-to-end test pass
