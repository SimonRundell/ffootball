# FFootball / FPL Data Lab — project instructions

Classroom sandbox for Exeter College: students browse Fantasy Premier League
data through our PHP proxy and write JSX/CSS in a Monaco editor, rendered in a
sandboxed iframe. Three roles: student, teacher, admin.

Read [PLAN.md](PLAN.md) (architecture, schema, contracts) and
[WORK_INSTRUCTIONS.md](WORK_INSTRUCTIONS.md) (phased build steps and
acceptance checks) before making changes. Build in phase order; commit per
phase.

## Non-negotiables

- React + Vite + **JavaScript** (no TypeScript). Backend PHP 8 + MariaDB (PDO,
  prepared statements only).
- Frontend never calls fantasy.premierleague.com directly (no CORS upstream);
  everything goes through `api/fpl.php` with its endpoint whitelist and cache.
- The admin-editable FPL target lives in the `settings` DB table, not in
  `.config.json`. `.config.json` holds only `apiBaseUrl`.
- Every PHP endpoint starts with `require_once __DIR__ . '/cors.php';` then
  db.php. Never inline CORS headers. cors.php reflects localhost:ANY and
  https://football.toolsforteaching.co.uk, with credentials allowed.
- Single `src/App.css` for all app styling; no inline CSS. The student CSS
  tab in the sandbox is the only exception.
- JSDoc / PHPDoc on every function. UI copy and docs: no em-dashes, write
  plainly.
- Auth: PHP sessions, `password_hash`/`password_verify`,
  `axios.defaults.withCredentials = true`. Server-side role checks are the
  security boundary, never the UI.
- Student sandbox: iframe rebuilt on every Run; axios wrapper locked to
  `apiBaseUrl`; console/errors piped back to the console panel.

## Environments

- Dev: Laragon (Apache localhost:80 for PHP + MariaDB), Vite dev server for
  the frontend, no Vite proxy. DB name `ffootball`.
- Prod: Hostinger shared hosting at https://football.toolsforteaching.co.uk
  (static `dist/` + `api/` + hPanel MariaDB). No Node on the server.

## License

Creative Commons BY-NC-SA 4.0, Simon Rundell / Exeter College.
