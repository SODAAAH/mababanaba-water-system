<?php
class SmsService {
    public static function send(PDO $pdo, string $number, string $message) {
        $cleanNumber = self::normalizeNumber($number);
        if (empty($cleanNumber)) {
            error_log("SmsService: Invalid recipient number: {$number}");
            return false;
        }

        $apiKey = defined('SEMAPHORE_API_KEY') ? SEMAPHORE_API_KEY : ($_ENV['SEMAPHORE_API_KEY'] ?? '');
        $senderName = defined('SEMAPHORE_SENDER_NAME') ? SEMAPHORE_SENDER_NAME : ($_ENV['SEMAPHORE_SENDER_NAME'] ?? '');

        if (empty($apiKey)) {
            error_log("SmsService: Semaphore API key is not configured.");
            return false;
        }

        $parameters = [
            'apikey' => $apiKey,
            'number' => $cleanNumber,
            'message' => $message,
            'sendername' => $senderName
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.semaphore.co/api/v4/messages');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($parameters));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $output = curl_exec($ch);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            error_log("SmsService cURL error: " . $curlErr);
        }

        try {
            $maskedMessage = preg_replace('/\b\d{6}\b/', '******', $message);
            $stmt = $pdo->prepare("INSERT INTO SMS_LOGS (contact_number, message, api_response) VALUES (?, ?, ?)");
            $stmt->execute([$cleanNumber, $maskedMessage, $output ?: $curlErr]);
        } catch (Exception $e) {
            error_log("SmsService DB log error: " . $e->getMessage());
        }

        return $output;
    }

    public static function normalizeNumber(string $number): string {
        $clean = preg_replace('/[^0-9]/', '', $number);
        if (strlen($clean) === 12 && str_starts_with($clean, '639')) {
            $clean = '0' . substr($clean, 2);
        } elseif (strlen($clean) === 10 && str_starts_with($clean, '9')) {
            $clean = '0' . $clean;
        }
        return $clean;
    }
}
