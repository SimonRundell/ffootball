<?php
/**
 * Session bootstrap and role-check helpers. Requires db.php to be loaded
 * first (for json_out).
 */

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
        'httponly' => true,
    ]);
    session_start();
}

/** Role rank used to compare "at least this role" checks. */
const ROLE_RANK = ['student' => 1, 'teacher' => 2, 'admin' => 3];

/**
 * Returns the logged-in user's session data, or null if not logged in.
 *
 * @return array{id:int,role:string}|null
 */
function current_user(): ?array
{
    if (!isset($_SESSION['user_id'], $_SESSION['role'])) {
        return null;
    }

    return ['id' => (int) $_SESSION['user_id'], 'role' => $_SESSION['role']];
}

/**
 * Ends the request with 401 unless a session user is present.
 *
 * @return array{id:int,role:string} The current user.
 */
function require_login(): array
{
    $user = current_user();

    if ($user === null) {
        json_out(['error' => 'Not logged in'], 401);
    }

    return $user;
}

/**
 * Ends the request with 403 unless the current user's role is at least
 * $minRole in the student < teacher < admin hierarchy.
 *
 * @param string $minRole One of 'student', 'teacher', 'admin'.
 * @return array{id:int,role:string} The current user.
 */
function require_role(string $minRole): array
{
    $user = require_login();

    if (ROLE_RANK[$user['role']] < ROLE_RANK[$minRole]) {
        json_out(['error' => 'Forbidden'], 403);
    }

    return $user;
}
