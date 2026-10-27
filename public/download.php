<?php
$candidates = [
    __DIR__ . '/water-system-full-backup.zip',
    dirname(__DIR__) . '/water-system-full-backup.zip'
];

$zipPath = null;
foreach ($candidates as $c) {
    if (file_exists($c) && is_file($c)) {
        $zipPath = $c;
        break;
    }
}

if ($zipPath) {
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="water-system-full-backup.zip"');
    header('Content-Length: ' . filesize($zipPath));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    readfile($zipPath);
    exit;
}

http_response_code(404);
echo "Backup archive not found.";
exit;
