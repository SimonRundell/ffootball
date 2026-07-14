<?php
/**
 * Workspace backup history.
 *
 * GET  /backups.php                    own backups (student)
 * GET  /backups.php?user_id=N          a student's backups (teacher+)
 * POST /backups.php { "backup_id": N } restore that backup into the
 *                                       caller's own live workspace (a
 *                                       backup of the current state is
 *                                       taken first, so this is reversible)
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

    $stmt = $pdo->prepare(
        'SELECT id, saved_at, LENGTH(jsx_code) AS jsx_bytes, LENGTH(css_code) AS css_bytes, LENGTH(notes) AS notes_bytes
         FROM workspace_backups WHERE user_id = ? ORDER BY saved_at DESC'
    );
    $stmt->execute([$userId]);
    json_out($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $backupId = (int) ($body['backup_id'] ?? 0);

    $stmt = $pdo->prepare('SELECT * FROM workspace_backups WHERE id = ? AND user_id = ?');
    $stmt->execute([$backupId, $session['id']]);
    $backup = $stmt->fetch();

    if (!$backup) {
        json_out(['error' => 'Backup not found'], 404);
    }

    $current = $pdo->prepare('SELECT jsx_code, css_code, notes FROM workspaces WHERE user_id = ?');
    $current->execute([$session['id']]);
    $currentState = $current->fetch();

    if (!$currentState) {
        json_out(['error' => 'No workspace for this account'], 404);
    }

    $pdo->beginTransaction();

    // Back up the current state first so restoring is itself reversible.
    $pdo->prepare(
        'INSERT INTO workspace_backups (user_id, jsx_code, css_code, notes) VALUES (?, ?, ?, ?)'
    )->execute([$session['id'], $currentState['jsx_code'], $currentState['css_code'], $currentState['notes']]);

    $pdo->prepare(
        'UPDATE workspaces SET jsx_code = ?, css_code = ?, notes = ? WHERE user_id = ?'
    )->execute([$backup['jsx_code'], $backup['css_code'], $backup['notes'], $session['id']]);

    $pdo->prepare(
        'DELETE FROM workspace_backups WHERE user_id = ? AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM workspace_backups WHERE user_id = ? ORDER BY saved_at DESC LIMIT 20
            ) recent
        )'
    )->execute([$session['id'], $session['id']]);

    $pdo->commit();

    json_out(['message' => 'Restored']);
}

json_out(['error' => 'Method not allowed'], 405);
