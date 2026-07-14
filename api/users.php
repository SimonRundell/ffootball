<?php
/**
 * Account management. Method + role decide what happens:
 *
 * GET    /users.php            list accounts (teacher: students only, admin: all)
 * GET    /users.php?id=N       single account
 * POST   /users.php            create account { username, display_name, password, role }
 * PUT    /users.php?id=N       update { display_name?, role?, is_active?, reset_password? }
 * DELETE /users.php?id=N       deactivate; add &hard=1 (admin, already-inactive only) to hard-delete
 *
 * Teachers may only manage role=student accounts and may not grant a role
 * above student. Admins may manage everyone. Passwords are always hashed
 * with password_hash(); DELETE without &hard=1 only flips is_active off so
 * a student's saved work is preserved.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/starter_templates.php';

$session = require_role('teacher');
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

/**
 * True if the given target role is one the current session may manage.
 *
 * @param string $targetRole
 * @return bool
 */
function can_manage_role(array $session, string $targetRole): bool
{
    if ($session['role'] === 'admin') {
        return true;
    }

    // Teachers manage students only.
    return $targetRole === 'student';
}

/**
 * Generates a readable temporary password for admin/teacher resets.
 *
 * @return string
 */
function generate_temp_password(): string
{
    return 'Temp-' . bin2hex(random_bytes(4));
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    if ($id !== null) {
        $stmt = $pdo->prepare(
            'SELECT id, username, display_name, role, is_active, must_change_password, created_at
             FROM users WHERE id = ?'
        );
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!$user || !can_manage_role($session, $user['role'])) {
            json_out(['error' => 'Not found'], 404);
        }

        json_out($user);
    }

    if ($session['role'] === 'admin') {
        $rows = $pdo->query(
            "SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at,
                    w.updated_at AS last_saved_at
             FROM users u
             LEFT JOIN workspaces w ON w.user_id = u.id
             ORDER BY u.role, u.display_name"
        )->fetchAll();
    } else {
        $rows = $pdo->query(
            "SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at,
                    w.updated_at AS last_saved_at
             FROM users u
             LEFT JOIN workspaces w ON w.user_id = u.id
             WHERE u.role = 'student'
             ORDER BY u.display_name"
        )->fetchAll();
    }

    json_out($rows);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $username = trim($body['username'] ?? '');
    $displayName = trim($body['display_name'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $role = $body['role'] ?? 'student';

    if ($username === '' || $displayName === '' || strlen($password) < 8) {
        json_out(['error' => 'username, display_name and a password of at least 8 characters are required'], 400);
    }

    if (!in_array($role, ['student', 'teacher', 'admin'], true) || !can_manage_role($session, $role)) {
        json_out(['error' => 'You may not create an account with that role'], 403);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO users (username, display_name, password_hash, role, is_active, must_change_password)
             VALUES (?, ?, ?, ?, 1, 1)'
        );
        $stmt->execute([$username, $displayName, $hash, $role]);
        $newId = (int) $pdo->lastInsertId();

        if ($role === 'student') {
            $ws = $pdo->prepare('INSERT INTO workspaces (user_id, jsx_code, css_code, notes) VALUES (?, ?, ?, ?)');
            $ws->execute([$newId, starter_jsx(), starter_css(), '']);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === '23000') {
            json_out(['error' => 'That username is already taken'], 409);
        }
        throw $e;
    }

    json_out(['id' => $newId, 'username' => $username, 'display_name' => $displayName, 'role' => $role], 201);
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();

    if (!$target || !can_manage_role($session, $target['role'])) {
        json_out(['error' => 'Not found'], 404);
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $updates = [];
    $params = [];

    if (isset($body['display_name'])) {
        $updates[] = 'display_name = ?';
        $params[] = trim($body['display_name']);
    }

    if (isset($body['role'])) {
        if (!can_manage_role($session, $body['role'])) {
            json_out(['error' => 'You may not grant that role'], 403);
        }
        $updates[] = 'role = ?';
        $params[] = $body['role'];
    }

    if (isset($body['is_active'])) {
        $updates[] = 'is_active = ?';
        $params[] = $body['is_active'] ? 1 : 0;
    }

    $tempPassword = null;
    if (!empty($body['reset_password'])) {
        $tempPassword = generate_temp_password();
        $updates[] = 'password_hash = ?';
        $params[] = password_hash($tempPassword, PASSWORD_DEFAULT);
        $updates[] = 'must_change_password = 1';
    }

    if (empty($updates)) {
        json_out(['error' => 'Nothing to update'], 400);
    }

    $params[] = $id;
    $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    $result = ['id' => $id];
    if ($tempPassword !== null) {
        $result['temp_password'] = $tempPassword;
    }

    json_out($result);
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $hard = isset($_GET['hard']) && $_GET['hard'] === '1';

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();

    if (!$target || !can_manage_role($session, $target['role'])) {
        json_out(['error' => 'Not found'], 404);
    }

    if ($hard) {
        if ($session['role'] !== 'admin' || $target['is_active']) {
            json_out(['error' => 'Only an inactive account may be hard-deleted, by an admin'], 403);
        }
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        json_out(['message' => 'Account permanently deleted']);
    }

    $pdo->prepare('UPDATE users SET is_active = 0 WHERE id = ?')->execute([$id]);
    json_out(['message' => 'Account deactivated']);
}

json_out(['error' => 'Method not allowed'], 405);
