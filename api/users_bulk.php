<?php
/**
 * Bulk student account creation, for a teacher/admin uploading a class
 * list. The frontend parses the CSV and previews it; this endpoint only
 * ever receives already-parsed rows, never a raw file.
 *
 * POST /users_bulk.php
 * {
 *   "default_password": "...",
 *   "force_change": true,
 *   "students": [ { "username": "...", "display_name": "..." }, ... ]
 * }
 *
 * Every row is processed independently (one bad row does not block the
 * rest); the response lists a per-row outcome so the UI can report
 * exactly what happened. Role is always 'student'; only teacher+ may
 * call this, matching users.php's own rules for creating student
 * accounts.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/starter_templates.php';

require_role('teacher');
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$defaultPassword = (string) ($body['default_password'] ?? '');
$forceChange = !isset($body['force_change']) || $body['force_change'] ? 1 : 0;
$students = is_array($body['students'] ?? null) ? $body['students'] : [];

if (strlen($defaultPassword) < 8) {
    json_out(['error' => 'default_password must be at least 8 characters'], 400);
}

if (count($students) === 0) {
    json_out(['error' => 'No student rows supplied'], 400);
}

if (count($students) > 500) {
    json_out(['error' => 'Too many rows in one upload (limit 500)'], 400);
}

$hash = password_hash($defaultPassword, PASSWORD_DEFAULT);
$results = [];
$createdCount = 0;

$insertUser = $pdo->prepare(
    'INSERT INTO users (username, display_name, password_hash, role, is_active, must_change_password)
     VALUES (?, ?, ?, \'student\', 1, ?)'
);
$insertWorkspace = $pdo->prepare(
    'INSERT INTO workspaces (user_id, jsx_code, css_code, notes) VALUES (?, ?, ?, ?)'
);

$seenUsernames = [];

foreach ($students as $row) {
    $username = trim((string) ($row['username'] ?? ''));
    $displayName = trim((string) ($row['display_name'] ?? ''));

    if ($username === '' || $displayName === '') {
        $results[] = ['username' => $username, 'status' => 'skipped', 'reason' => 'Missing username or display name'];
        continue;
    }

    $usernameKey = strtolower($username);
    if (isset($seenUsernames[$usernameKey])) {
        $results[] = ['username' => $username, 'status' => 'skipped', 'reason' => 'Duplicate username in this upload'];
        continue;
    }
    $seenUsernames[$usernameKey] = true;

    try {
        $pdo->beginTransaction();
        $insertUser->execute([$username, $displayName, $hash, $forceChange]);
        $newId = (int) $pdo->lastInsertId();
        $insertWorkspace->execute([$newId, starter_jsx(), starter_css(), '']);
        $pdo->commit();

        $results[] = ['username' => $username, 'status' => 'created', 'id' => $newId];
        $createdCount++;
    } catch (PDOException $e) {
        $pdo->rollBack();
        $reason = $e->getCode() === '23000' ? 'Username already exists' : 'Database error';
        $results[] = ['username' => $username, 'status' => 'skipped', 'reason' => $reason];
    }
}

json_out([
    'created_count' => $createdCount,
    'skipped_count' => count($results) - $createdCount,
    'results' => $results,
]);
