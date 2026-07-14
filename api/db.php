<?php
/**
 * PDO connection factory and small JSON response helper.
 * Requires api/config.php (git-ignored; see config.sample.php) to exist.
 */

/**
 * Returns a shared PDO connection to the MariaDB database.
 *
 * @return PDO
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset']
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

/**
 * Sends a JSON response and terminates the script.
 *
 * @param mixed $data   Value to encode as JSON.
 * @param int   $status HTTP status code.
 */
function json_out($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit();
}
