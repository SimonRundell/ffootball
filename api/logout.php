<?php
/**
 * POST. Destroys the current session.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$_SESSION = [];
session_destroy();

json_out(['message' => 'Logged out']);
