<?php
/**
 * FPL data proxy. GET fpl.php?endpoint=<name>[&id=N][&gw=N]
 *
 * The FPL API sends no CORS headers, so the browser cannot call it
 * directly; this endpoint fetches it server-side (no CORS problem with
 * cURL) and caches the JSON in fpl_cache for cache_ttl_seconds. Any
 * logged-in user (student, teacher, admin) may call this.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_out(['error' => 'Method not allowed'], 405);
}

/** Whitelisted endpoint names mapped to upstream path templates. */
const ENDPOINT_MAP = [
    'bootstrap-static' => '/bootstrap-static/',
    'fixtures' => '/fixtures/',
    'element-summary' => '/element-summary/{id}/',
    'event-live' => '/event/{gw}/live/',
];

$endpoint = $_GET['endpoint'] ?? '';

if (!array_key_exists($endpoint, ENDPOINT_MAP)) {
    json_out(['error' => 'Unknown endpoint'], 400);
}

$path = ENDPOINT_MAP[$endpoint];
$cacheKey = $endpoint;

if (strpos($path, '{id}') !== false) {
    $id = $_GET['id'] ?? '';
    if (!ctype_digit((string) $id)) {
        json_out(['error' => 'id must be numeric'], 400);
    }
    $path = str_replace('{id}', $id, $path);
    $cacheKey .= ':' . $id;
}

if (strpos($path, '{gw}') !== false) {
    $gw = $_GET['gw'] ?? '';
    if (!ctype_digit((string) $gw) || (int) $gw < 1 || (int) $gw > 38) {
        json_out(['error' => 'gw must be between 1 and 38'], 400);
    }
    $path = str_replace('{gw}', $gw, $path);
    $cacheKey .= ':' . $gw;
}

/**
 * Reads a setting value, falling back to a default if unset.
 *
 * @param PDO    $pdo
 * @param string $key
 * @param string $default
 * @return string
 */
function read_setting(PDO $pdo, string $key, string $default): string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value !== false ? $value : $default;
}

$baseUrl = read_setting($pdo, 'fpl_base_url', 'https://fantasy.premierleague.com/api');
$ttl = (int) read_setting($pdo, 'cache_ttl_seconds', '900');

$cacheStmt = $pdo->prepare('SELECT payload, fetched_at FROM fpl_cache WHERE endpoint = ?');
$cacheStmt->execute([$cacheKey]);
$cached = $cacheStmt->fetch();

if ($cached) {
    $age = time() - strtotime($cached['fetched_at']);
    if ($age < $ttl) {
        header('X-FPL-Cache: hit');
        echo $cached['payload'];
        exit();
    }
}

$ch = curl_init($baseUrl . $path);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        . '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]);
$body = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($body === false || $httpCode !== 200) {
    if ($cached) {
        header('X-FPL-Cache: stale');
        echo $cached['payload'];
        exit();
    }
    json_out(['error' => 'Upstream FPL API unavailable', 'detail' => $curlError ?: "HTTP $httpCode"], 502);
}

$upsert = $pdo->prepare(
    'INSERT INTO fpl_cache (endpoint, payload, fetched_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = NOW()'
);
$upsert->execute([$cacheKey, $body]);

header('X-FPL-Cache: miss');
echo $body;
