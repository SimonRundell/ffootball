<?php
/**
 * POST { "username": "...", "password": "..." }
 * Verifies credentials, regenerates the session id, and stores the user
 * in session. Returns the same shape as me.php on success.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($body['username'] ?? '');
$password = (string) ($body['password'] ?? '');

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !$user['is_active'] || !password_verify($password, $user['password_hash'])) {
    json_out(['error' => 'Invalid username or password'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['role'] = $user['role'];

json_out([
    'id' => (int) $user['id'],
    'username' => $user['username'],
    'display_name' => $user['display_name'],
    'role' => $user['role'],
    'must_change_password' => (bool) $user['must_change_password'],
]);
