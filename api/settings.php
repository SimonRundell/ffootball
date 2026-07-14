<?php
/**
 * Admin-only system settings.
 *
 * GET  /settings.php                    all settings
 * PUT  /settings.php                    { fpl_base_url?, cache_ttl_seconds? }
 * POST /settings.php?action=clear_cache truncates fpl_cache
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

require_role('admin');
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    json_out($settings);
}

if ($method === 'POST' && ($_GET['action'] ?? '') === 'clear_cache') {
    $pdo->exec('TRUNCATE TABLE fpl_cache');
    json_out(['message' => 'FPL cache cleared']);
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $pdo->prepare(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );

    if (isset($body['fpl_base_url'])) {
        $url = trim($body['fpl_base_url']);
        if (!preg_match('#^https://#i', $url)) {
            json_out(['error' => 'fpl_base_url must start with https://'], 400);
        }
        $stmt->execute(['fpl_base_url', rtrim($url, '/')]);
    }

    if (isset($body['cache_ttl_seconds'])) {
        $ttl = (int) $body['cache_ttl_seconds'];
        if ($ttl < 60 || $ttl > 86400) {
            json_out(['error' => 'cache_ttl_seconds must be between 60 and 86400'], 400);
        }
        $stmt->execute(['cache_ttl_seconds', (string) $ttl]);
    }

    $rows = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    json_out($settings);
}

json_out(['error' => 'Method not allowed'], 405);
