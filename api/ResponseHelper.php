<?php
/**
 * ResponseHelper
 * Standardized HTTP and JSON response helper for API endpoints.
 */
class ResponseHelper {
    public static function json(int $statusCode, array $data): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($data);
        exit;
    }

    public static function success(array $data = []): void {
        self::json(200, array_merge(['success' => true], $data));
    }

    public static function error(string $message, int $statusCode = 400, array $extra = []): void {
        self::json($statusCode, array_merge(['error' => $message], $extra));
    }

    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }

    public static function notFound(string $message = 'Not Found'): void {
        self::error($message, 404);
    }
}
