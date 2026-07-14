<?php
/**
 * One-time installer: creates the first admin account.
 * Refuses to run if any admin already exists. Delete this file (or block
 * it in your web server config) once installation is complete.
 *
 * POST { "username": "...", "display_name": "...", "password": "..." }
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$pdo = db();

$existing = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
if ($existing > 0) {
    json_out(['error' => 'An admin account already exists. Delete install.php.'], 403);
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($body['username'] ?? '');
$displayName = trim($body['display_name'] ?? '');
$password = (string) ($body['password'] ?? '');

if ($username === '' || $displayName === '' || strlen($password) < 8) {
    json_out(['error' => 'username, display_name and a password of at least 8 characters are required'], 400);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO users (username, display_name, password_hash, role, is_active, must_change_password)
     VALUES (?, ?, ?, \'admin\', 1, 0)'
);
$stmt->execute([$username, $displayName, $hash]);

json_out([
    'message' => 'Admin account created. Delete install.php now.',
    'username' => $username,
]);
