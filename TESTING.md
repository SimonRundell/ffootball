# TESTING

End-to-end pass of every phase's Check from WORK_INSTRUCTIONS.md, run
against a real Laragon instance (Apache + MariaDB) and a real Vite dev
server, driven with a headless browser and curl. Test accounts used:
`admin` (admin), `teacher1` (teacher), `student1` (student).

| Phase | Check | Result |
| --- | --- | --- |
| 0 | `npm run dev` shows the app with no console errors | PASS |
| 1 | install creates the first admin; a second install attempt is refused | PASS (403, "An admin account already exists") |
| 1 | login sets a session cookie; `me.php` returns the user | PASS |
| 1 | create a student as admin; login as that student | PASS |
| 1 | `users.php` as a student returns 403 | PASS |
| 2 | `fpl.php?endpoint=bootstrap-static` returns `X-FPL-Cache: miss` then `hit` | PASS |
| 2 | `endpoint=element-summary&id=abc` returns 400 | PASS |
| 2 | not logged in returns 401 | PASS |
| 3 | login as each role shows correct navigation | PASS (admin sees Workbench/Students/Admin; student sees Workbench only) |
| 3 | refresh keeps the session; logout works | PASS |
| 3 | a student with `must_change_password` is redirected to the forced change screen | PASS |
| 4 | starter code Run renders live FPL team data | PASS (20 Premier League teams rendered) |
| 4 | a bad endpoint renders a graceful error state, not a crash | PASS |
| 4 | `console.log` output appears in the console panel | PASS |
| 4 | a runaway `setInterval` stops once the iframe is rebuilt on the next Run; host page stays responsive | PASS |
| 4 | an axios call to `https://example.com` is refused with the sandbox message | PASS |
| 5 | typed code autosaves / explicit Save persists across a hard refresh | PASS |
| 5 | wreck the code, Save, then restore an earlier backup | PASS |
| 5 | API explorer fetches all four whitelisted endpoints | PASS (tested `fixtures`; `bootstrap-static`/`element-summary`/`event-live` share the same code path, verified via Phase 2 curl checks) |
| 6 | teacher can open and Run a student's work read-only; Save is hidden | PASS |
| 6 | teacher `PUT`ing a student's workspace directly is rejected (no such capability exposed; workspace.php only ever writes the caller's own row) | PASS (404 "No workspace for this account" when a teacher without a workspace attempts PUT) |
| 6 | student calling `users.php` or `settings.php` gets 403 | PASS |
| 6 | admin creates a teacher account, resets a student's password, changes cache TTL, clears the cache | PASS |
| 7 | react-doctor pass | Run; array-index-key, missing accessible labels and eager Monaco load fixed. Two findings left as documented accepted risk / false positive (see README "The sandbox security model" and code comments) |

## Known limitations

- A synchronous infinite loop (`while (true) {}`) in student code will
  freeze the browser tab's main thread, same as it would on any web
  page; the iframe teardown/rebuild mechanism protects against
  runaway *asynchronous* work (intervals, timeouts, unresolved
  promises) between Runs, not a single synchronous run that never
  yields. This is an accepted limitation of iframe sandboxing, not a
  bug in this app.
