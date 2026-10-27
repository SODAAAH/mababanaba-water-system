<?php
$rawPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($rawPath);

// Prevent path traversal and null-byte injection
if (str_contains($uri, '..') || str_contains($uri, "\0")) {
    http_response_code(400);
    echo "Bad Request: Invalid path traversal sequence.";
    return true;
}

// Forbid access to hidden files and protected configuration/data files
$basename = basename($uri);
if (str_starts_with($basename, '.') || preg_match('/\.(env|sql|bak|config|ini|log|sh|md)$/i', $basename)) {
    http_response_code(403);
    echo "Forbidden: Direct access to configuration, secrets, or logs is denied.";
    return true;
}

// Handle API requests through strict allowed entry points
if (str_starts_with($uri, '/api/')) {
    // Forbid direct browsing or execution of internal session/controller files
    if (str_starts_with($uri, '/api/sessions/') || str_starts_with($uri, '/api/controllers/') || str_starts_with($uri, '/api/services/')) {
        http_response_code(403);
        echo "Forbidden: Direct access to internal API subsystems is prohibited.";
        return true;
    }

    if ($uri === '/api/cron.php' && file_exists(__DIR__ . '/api/cron.php')) {
        require __DIR__ . '/api/cron.php';
        return true;
    }

    if (file_exists(__DIR__ . '/api/api.php')) {
        require __DIR__ . '/api/api.php';
        return true;
    }
}

$checkUri = rtrim(strtolower($uri), '/');
if ($checkUri === '/download' || $checkUri === '/downlaod') {
    require __DIR__ . '/public/download.php';
    return true;
}

$publicRoot = realpath(__DIR__ . '/public');
$targetPath = realpath(__DIR__ . '/public' . $uri);

if ($uri !== '/' && $targetPath && str_starts_with($targetPath, $publicRoot) && is_file($targetPath)) {
    $mimeTypes = [
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'html' => 'text/html; charset=UTF-8',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject',
        'map' => 'application/json'
    ];
    $ext = strtolower(pathinfo($targetPath, PATHINFO_EXTENSION));
    if (isset($mimeTypes[$ext])) {
        header("Content-Type: " . $mimeTypes[$ext]);
    }
    header("X-Content-Type-Options: nosniff");
    header("Content-Length: " . filesize($targetPath));
    readfile($targetPath);
    return true;
}

if (file_exists(__DIR__ . '/public/index.html')) {
    require __DIR__ . '/public/index.html';
    return true;
}

http_response_code(404);
echo "Not Found";

