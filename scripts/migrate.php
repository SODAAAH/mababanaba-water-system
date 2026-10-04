<?php
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit("Access Denied: This script can only be run via the CLI.\n");
}

require_once __DIR__ . '/../api/config.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    echo "Running database migrations...\n";
    require_once __DIR__ . '/../api/migrations.php';
    run_migrations($pdo);
    echo "Migrations completed successfully.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Migration failed: " . $e->getMessage() . "\n");
    exit(1);
}
