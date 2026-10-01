<?php
$envCandidates = [
    __DIR__ . '/../.env',
    __DIR__ . '/.env'
];

foreach ($envCandidates as $envPath) {
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                $pos = strpos($line, '=');
                if ($pos !== false) {
                    $key = trim(substr($line, 0, $pos));
                    $val = trim(substr($line, $pos + 1));
                    if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                        (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                        $val = substr($val, 1, -1);
                    }
                    $_ENV[$key] = $val;
                    putenv("$key=$val");
                }
            }
        }
        break;
    }
}

$host = $_ENV['DB_HOST'] ?? '127.0.0.1'; 
$db   = $_ENV['DB_NAME'] ?? ''; 
$user = $_ENV['DB_USER'] ?? ''; 
$pass = $_ENV['DB_PASS'] ?? '';

define('SEMAPHORE_API_KEY', $_ENV['SEMAPHORE_API_KEY'] ?? '');
define('SEMAPHORE_SENDER_NAME', $_ENV['SEMAPHORE_SENDER_NAME'] ?? '');
define('VAPID_PUBLIC_KEY', $_ENV['VAPID_PUBLIC_KEY'] ?? '');
define('VAPID_PRIVATE_KEY', $_ENV['VAPID_PRIVATE_KEY'] ?? '');
define('VAPID_SUBJECT', $_ENV['VAPID_SUBJECT'] ?? '');
define('CRON_SECRET', $_ENV['CRON_SECRET'] ?? '');
define('MAPBOX_TOKEN', $_ENV['MAPBOX_TOKEN'] ?? '');
