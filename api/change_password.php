<?php
/**
 * POST { "current_password": "...", "new_password": "..." }
 * Any logged-in user changes their own password. Clears the
 * must_change_password flag. Used by the forced first-login screen and by
 * a normal "change my password" action.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$session = require_login();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$currentPassword = (string) ($body['current_password'] ?? '');
$newPassword = (string) ($body['new_password'] ?? '');

if (strlen($newPassword) < 8) {
    json_out(['error' => 'New password must be at least 8 characters'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$session['id']]);
$row = $stmt->fetch();

if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
    json_out(['error' => 'Current password is incorrect'], 401);
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$update = $pdo->prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
$update->execute([$hash, $session['id']]);

json_out(['message' => 'Password changed']);
