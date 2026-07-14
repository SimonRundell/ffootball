<?php
/**
 * A student's single workspace (jsx_code, css_code, notes).
 *
 * GET /workspace.php               own workspace (student)
 * GET /workspace.php?user_id=N     read-only view of a student's workspace (teacher+)
 * PUT /workspace.php               save own workspace; also writes a backup row
 *                                  and prunes workspace_backups to the newest 20
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

$session = require_login();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $session['id'];

    if (isset($_GET['user_id'])) {
        require_role('teacher');
        $userId = (int) $_GET['user_id'];
    }

    $stmt = $pdo->prepare('SELECT user_id, jsx_code, css_code, notes, updated_at FROM workspaces WHERE user_id = ?');
    $stmt->execute([$userId]);
    $workspace = $stmt->fetch();

    if (!$workspace) {
        json_out(['error' => 'No workspace for that user'], 404);
    }

    json_out($workspace);
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $jsxCode = $body['jsx_code'] ?? '';
    $cssCode = $body['css_code'] ?? '';
    $notes = $body['notes'] ?? '';

    $stmt = $pdo->prepare('SELECT id FROM workspaces WHERE user_id = ?');
    $stmt->execute([$session['id']]);
    if (!$stmt->fetch()) {
        json_out(['error' => 'No workspace for this account'], 404);
    }

    $pdo->beginTransaction();

    $pdo->prepare(
        'UPDATE workspaces SET jsx_code = ?, css_code = ?, notes = ? WHERE user_id = ?'
    )->execute([$jsxCode, $cssCode, $notes, $session['id']]);

    $pdo->prepare(
        'INSERT INTO workspace_backups (user_id, jsx_code, css_code, notes) VALUES (?, ?, ?, ?)'
    )->execute([$session['id'], $jsxCode, $cssCode, $notes]);

    // Prune to the newest 20 backups for this user.
    $pdo->prepare(
        'DELETE FROM workspace_backups WHERE user_id = ? AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM workspace_backups WHERE user_id = ? ORDER BY saved_at DESC LIMIT 20
            ) recent
        )'
    )->execute([$session['id'], $session['id']]);

    $pdo->commit();

    json_out(['message' => 'Saved']);
}

json_out(['error' => 'Method not allowed'], 405);
