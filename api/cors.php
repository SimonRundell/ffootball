<?php
/**
 * Shared CORS handler. Must be required first by every endpoint.
 *
 * Reflects the request Origin back when it is localhost on any port (dev)
 * or the production subdomain, so the browser accepts the response and
 * session cookies can flow with credentials: true.
 */

$allowedOrigin = null;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '') {
    $isLocalhost = (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin);
    $isProdOrigin = $origin === 'https://football.toolsforteaching.co.uk';

    if ($isLocalhost || $isProdOrigin) {
        $allowedOrigin = $origin;
    }
}

if ($allowedOrigin !== null) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
