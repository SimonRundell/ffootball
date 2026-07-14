<?php
/**
 * GET. Returns the logged-in user, or 401 if there is no session.
 * The frontend calls this on boot to decide routing and the forced
 * password-change screen.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

$session = require_login();

$stmt = db()->prepare('SELECT id, username, display_name, role, must_change_password FROM users WHERE id = ?');
$stmt->execute([$session['id']]);
$user = $stmt->fetch();

if (!$user) {
    json_out(['error' => 'Not logged in'], 401);
}

json_out([
    'id' => (int) $user['id'],
    'username' => $user['username'],
    'display_name' => $user['display_name'],
    'role' => $user['role'],
    'must_change_password' => (bool) $user['must_change_password'],
]);
