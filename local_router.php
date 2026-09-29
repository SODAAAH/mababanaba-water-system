<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (str_starts_with($uri, '/api/')) {
    $apiFile = __DIR__ . $uri;
    if (file_exists($apiFile) && !is_dir($apiFile)) {
        require $apiFile;
        return true;
    }
    if (file_exists(__DIR__ . '/api/api.php')) {
        require __DIR__ . '/api/api.php';
        return true;
    }
}

$publicFile = __DIR__ . '/public' . $uri;
if ($uri !== '/' && file_exists($publicFile) && !is_dir($publicFile)) {
    $mimeTypes = [
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'html' => 'text/html; charset=UTF-8',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject',
        'map' => 'application/json'
    ];
    $ext = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));
    if (isset($mimeTypes[$ext])) {
        header("Content-Type: " . $mimeTypes[$ext]);
    }
    header("Content-Length: " . filesize($publicFile));
    readfile($publicFile);
    return true;
}

if (file_exists(__DIR__ . '/public/index.html')) {
    require __DIR__ . '/public/index.html';
    return true;
}

http_response_code(404);
echo "Not Found";
