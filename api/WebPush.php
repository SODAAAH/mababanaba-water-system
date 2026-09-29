<?php

class WebPush {
    public static function getVapidPublicKey() {
        if (defined('VAPID_PUBLIC_KEY') && VAPID_PUBLIC_KEY) {
            return VAPID_PUBLIC_KEY;
        }
        return $_ENV['VAPID_PUBLIC_KEY'] ?? '';
    }

    public static function getVapidPrivateKey() {
        if (defined('VAPID_PRIVATE_KEY') && VAPID_PRIVATE_KEY) {
            return VAPID_PRIVATE_KEY;
        }
        return $_ENV['VAPID_PRIVATE_KEY'] ?? '';
    }

    public static function getVapidSubject() {
        if (defined('VAPID_SUBJECT') && VAPID_SUBJECT) {
            return VAPID_SUBJECT;
        }
        return $_ENV['VAPID_SUBJECT'] ?? 'mailto:admin@mbbnbwater.com';
    }

    public static function isValidPushEndpoint($endpoint) {
        if (!filter_var($endpoint, FILTER_VALIDATE_URL)) {
            return false;
        }
        $parsed = parse_url($endpoint);
        $scheme = strtolower($parsed['scheme'] ?? '');
        $host = strtolower($parsed['host'] ?? '');

        if ($scheme !== 'https') {
            return false;
        }

        $validDomains = [
            'googleapis.com',
            'push.services.mozilla.com',
            'push.apple.com',
            'notify.windows.com',
            'web.push.apple.com'
        ];

        foreach ($validDomains as $domain) {
            if ($host === $domain || (strlen($host) > strlen($domain) && substr($host, -strlen('.' . $domain)) === '.' . $domain)) {
                return true;
            }
        }

        return false;
    }

    public static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }

    private static function pemFromPrivateKey($rawPrivateKey) {
        $privHex = bin2hex(self::base64UrlDecode($rawPrivateKey));
        $pubHex = bin2hex(self::base64UrlDecode(self::getVapidPublicKey()));
        
        $der = hex2bin(
            '30770201010420' . $privHex .
            'a00a06082a8648ce3d030107' .
            'a144034200' . $pubHex
        );

        return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
    }

    private static function createVapidJwt($endpoint) {
        $parsedUrl = parse_url($endpoint);
        $audience = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];

        $header = ['typ' => 'JWT', 'alg' => 'ES256'];
        $payload = [
            'aud' => $audience,
            'exp' => time() + (12 * 3600),
            'sub' => self::getVapidSubject()
        ];

        $encodedHeader = self::base64UrlEncode(json_encode($header));
        $encodedPayload = self::base64UrlEncode(json_encode($payload));
        $dataToSign = $encodedHeader . '.' . $encodedPayload;

        $privKey = self::getVapidPrivateKey();
        if (empty($privKey)) {
            error_log('WebPush: VAPID private key is empty');
            return null;
        }

        $pem = self::pemFromPrivateKey($privKey);
        $privateKeyResource = openssl_pkey_get_private($pem);
        if (!$privateKeyResource) {
            error_log('WebPush: Failed to parse VAPID private key');
            return null;
        }

        $signature = '';
        $signSuccess = openssl_sign($dataToSign, $signature, $privateKeyResource, OPENSSL_ALGO_SHA256);
        if (!$signSuccess) {
            error_log('WebPush: openssl_sign failed');
            return null;
        }

        $p1363Sig = self::derToP1363Signature($signature);

        return $dataToSign . '.' . self::base64UrlEncode($p1363Sig);
    }

    private static function derToP1363Signature($der) {
        if (strlen($der) < 8) return $der;
        $offset = 2;
        if (ord($der[1]) & 0x80) {
            $offset += (ord($der[1]) & 0x7f);
        }
        $rLen = ord($der[$offset + 1]);
        $r = substr($der, $offset + 2, $rLen);
        $sOffset = $offset + 2 + $rLen;
        $sLen = ord($der[$sOffset + 1]);
        $s = substr($der, $sOffset + 2, $sLen);

        if (strlen($r) > 32) {
            $r = substr($r, -32);
        } else {
            $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
        }

        if (strlen($s) > 32) {
            $s = substr($s, -32);
        } else {
            $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);
        }

        return $r . $s;
    }

    private static function encryptPayload($payload, $userPublicKeyRaw, $userAuthTokenRaw) {
        $salt = random_bytes(16);
        $localKeyPair = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC
        ]);
        if (!$localKeyPair) {
            error_log('WebPush: Failed to create EC key pair');
            return null;
        }
        
        $localDetails = openssl_pkey_get_details($localKeyPair);
        $localPublicKeyRaw = "\x04" . str_pad($localDetails['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($localDetails['ec']['y'], 32, "\x00", STR_PAD_LEFT);

        $clientDer = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200' . bin2hex($userPublicKeyRaw));
        $clientPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($clientDer), 64, "\n") . "-----END PUBLIC KEY-----\n";
        $clientKeyResource = openssl_pkey_get_public($clientPem);
        if (!$clientKeyResource) {
            error_log('WebPush: Failed to parse user public key');
            return null;
        }

        $sharedSecret = openssl_pkey_derive($clientKeyResource, $localKeyPair, 0);
        if (!$sharedSecret) {
            error_log('WebPush: Failed to derive ECDH shared secret');
            return null;
        }

        $keyInfo = "WebPush: info\x00" . $userPublicKeyRaw . $localPublicKeyRaw;
        $ikm = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $userAuthTokenRaw);

        $contentEncryptionKey = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

        $paddedPayload = $payload . "\x02";
        $tag = '';
        $ciphertext = openssl_encrypt(
            $paddedPayload,
            'aes-128-gcm',
            $contentEncryptionKey,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            '',
            16
        );

        if ($ciphertext === false) {
            error_log('WebPush: AES-128-GCM encryption failed');
            return null;
        }

        $recordSize = pack('N', 4096);
        $keyLen = pack('C', strlen($localPublicKeyRaw));
        $encryptedBody = $salt . $recordSize . $keyLen . $localPublicKeyRaw . $ciphertext . $tag;

        return $encryptedBody;
    }

    public static function sendPush($endpoint, $p256dh, $auth, $payloadData) {
        if (!self::isValidPushEndpoint($endpoint)) {
            error_log('WebPush: Attempted push to invalid/untrusted endpoint: ' . substr($endpoint, 0, 80));
            return ['success' => false, 'error' => 'Invalid or untrusted push endpoint'];
        }

        $jwt = self::createVapidJwt($endpoint);
        if (!$jwt) return ['success' => false, 'error' => 'JWT generation failed'];

        $userPublicKeyRaw = self::base64UrlDecode($p256dh);
        $userAuthTokenRaw = self::base64UrlDecode($auth);
        $payloadJson = is_string($payloadData) ? $payloadData : json_encode($payloadData);

        $body = self::encryptPayload($payloadJson, $userPublicKeyRaw, $userAuthTokenRaw);
        if (!$body) return ['success' => false, 'error' => 'Payload encryption failed'];

        $pubKey = self::getVapidPublicKey();
        $headers = [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400',
            'Urgency: high',
            'Authorization: vapid t=' . $jwt . ', k=' . $pubKey,
            'Crypto-Key: p256ecdsa=' . $pubKey
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        $success = ($httpCode === 201 || $httpCode === 200 || $httpCode === 202);
        if (!$success) {
            error_log("WebPush HTTP $httpCode: Response: $response | CurlErr: $curlError");
        }

        return [
            'success' => $success,
            'http_code' => $httpCode,
            'response' => $response,
            'curl_error' => $curlError
        ];
    }

    public static function sendToCustomer($pdo, $customerId, $title, $body, $url = '/#customer_orders') {
        try {
            $stmt = $pdo->prepare("SELECT id, endpoint, p256dh, auth FROM PUSH_SUBSCRIPTIONS WHERE customer_id = ?");
            $stmt->execute([$customerId]);
            $subs = $stmt->fetchAll();

            preg_match('/#(\d+)/', $title, $m);
            $tag = !empty($m[1]) ? ('mbbnb-order-' . $m[1]) : ('mbbnb-' . time());

            $payload = [
                'title' => $title,
                'body' => $body,
                'icon' => './logo.png',
                'url' => $url,
                'tag' => $tag
            ];

            foreach ($subs as $sub) {
                $res = self::sendPush($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payload);
                if (isset($res['http_code']) && ($res['http_code'] === 410 || $res['http_code'] === 404)) {
                    $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE id = ?")->execute([$sub['id']]);
                }
            }
        } catch (Exception $e) {
            error_log("WebPush sendToCustomer error: " . $e->getMessage());
        }
    }

    public static function sendToStationAdmins($pdo, $stationId, $title, $body, $url = '/#admin_dashboard') {
        try {
            $stmt = $pdo->prepare("SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, a.role FROM PUSH_SUBSCRIPTIONS ps JOIN ADMIN a ON ps.user_id = a.admin_id WHERE (a.station_id = ? OR a.role = 'Super Admin')");
            $stmt->execute([$stationId]);
            $subs = $stmt->fetchAll();

            preg_match('/#(\d+)/', $title, $m);
            $tag = !empty($m[1]) ? ('mbbnb-order-' . $m[1]) : ('mbbnb-' . time());

            foreach ($subs as $sub) {
                $targetUrl = ($sub['role'] === 'Delivery Staff') ? '/#delivery_dashboard' : $url;
                $payload = [
                    'title' => $title,
                    'body' => $body,
                    'icon' => './logo.png',
                    'url' => $targetUrl,
                    'tag' => $tag
                ];
                $res = self::sendPush($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payload);
                if (isset($res['http_code']) && ($res['http_code'] === 410 || $res['http_code'] === 404)) {
                    $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE id = ?")->execute([$sub['id']]);
                }
            }
        } catch (Exception $e) {
            error_log("WebPush sendToStationAdmins error: " . $e->getMessage());
        }
    }
}
