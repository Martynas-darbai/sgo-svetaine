<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Metodas neleidžiamas.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);

if (!is_array($data)) {
    $data = $_POST;
}

function field(string $key): string {
    global $data;
    return trim((string)($data[$key] ?? ''));
}

function cleanHeader(string $value): string {
    return trim(str_replace(["\r", "\n"], '', $value));
}

/*
 * RFC 2047 header encoding that does not depend on the server's
 * mbstring defaults (those turned "ž" into "Å¾" in the subject).
 * Splits on whole UTF-8 characters so no letter is cut in half.
 */
function encodeHeader(string $text): string {
    if (preg_match('/^[\x20-\x7E]*$/', $text)) {
        return $text;
    }
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    if ($chars === false) {
        return '=?UTF-8?B?' . base64_encode($text) . '?=';
    }
    $words = [];
    $buf = '';
    foreach ($chars as $ch) {
        if (strlen($buf . $ch) > 45) {
            $words[] = '=?UTF-8?B?' . base64_encode($buf) . '?=';
            $buf = '';
        }
        $buf .= $ch;
    }
    if ($buf !== '') {
        $words[] = '=?UTF-8?B?' . base64_encode($buf) . '?=';
    }
    return implode(' ', $words);
}

/*
 * Apsauga nuo šlamšto (lankytojui nieko nematyti):
 * 1) paslėptas spąstų laukas, kurį užpildo tik robotai,
 * 2) per greitai išsiųsta forma (mažiau nei 3 s nuo puslapio atidarymo),
 * 3) daugiausia 5 žinutės per valandą iš vieno IP adreso.
 * Robotui rodome „sėkmę“, kad jis nebandytų dar kartą.
 */
if (field('hp_check') !== '') {
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$startedAt = (int)field('form_t');
if ($startedAt > 0) {
    $elapsedMs = (int)(microtime(true) * 1000) - $startedAt;
    if ($elapsedMs >= 0 && $elapsedMs < 3000) {
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$clientIp  = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile  = sys_get_temp_dir() . '/sgo_rate_' . md5($clientIp) . '.json';
$nowTs     = time();
$recent    = [];
if (is_readable($rateFile)) {
    $decodedHits = json_decode((string)file_get_contents($rateFile), true);
    if (is_array($decodedHits)) {
        foreach ($decodedHits as $hitTime) {
            if (is_int($hitTime) && ($nowTs - $hitTime) < 3600) {
                $recent[] = $hitTime;
            }
        }
    }
}
if (count($recent) >= 5) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Per daug užklausų iš šio adreso. Pabandykite vėliau arba skambinkite +370 606 06222.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$name    = field('name');
$email   = cleanHeader(field('email'));
$phone   = field('phone');
$city    = field('city');
$service = field('service');
$power   = field('power');
$message = field('message');

if ($name === '' || $message === '' || $email === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error' => 'Prašome užpildyti visus privalomus laukus.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error' => 'Neteisingas el. pašto adresas.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($message) > 8000) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error' => 'Žinutė per ilga (daugiausia apie 8000 simbolių).'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
 * Šlamšto žinutėse paprastai būna daug nuorodų. Daugiau nei 2 nuorodos žinutėje = laikome šlamštu
 * (robotui rodome „sėkmę“, laiško nesiunčiame).
 */
if (preg_match_all('~https?://|www\.~i', $message) > 2) {
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
 * Optional attachments (service pages send multipart/form-data with files[]).
 * Files are checked and attached to the e-mail; nothing is stored on the server.
 */
$maxFiles = 5;
$maxTotal = 15 * 1024 * 1024;
$allowedExt = ['jpg','jpeg','png','webp','gif','heic','heif','pdf','csv','xls','xlsx','doc','docx','txt'];
$allowedMime = [
    'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
    'application/pdf','text/csv','text/plain','application/csv',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip','application/octet-stream','application/CDFV2','application/x-ole-storage'
];

function failUpload(string $msg): void {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$attachments = [];
if (!empty($_FILES['files']) && is_array($_FILES['files']['name'])) {
    $f = $_FILES['files'];
    $count = count($f['name']);
    $total = 0;
    for ($i = 0; $i < $count; $i++) {
        $err = $f['error'][$i];
        if ($err === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        if ($err !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'][$i])) {
            failUpload('Nepavyko įkelti failo. Pabandykite mažesnį failą.');
        }
        if (count($attachments) >= $maxFiles) {
            failUpload('Galima pridėti daugiausia 5 failus.');
        }
        $total += (int)$f['size'][$i];
        if ($total > $maxTotal) {
            failUpload('Failų dydis viršija 15 MB.');
        }
        $origName = (string)$f['name'][$i];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $mime = 'application/octet-stream';
        if (function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            if ($fi) {
                $mime = (string)finfo_file($fi, $f['tmp_name'][$i]);
                finfo_close($fi);
            }
        }
        if (!in_array($ext, $allowedExt, true) || !in_array($mime, $allowedMime, true)) {
            failUpload('Netinkamas failo tipas: ' . $origName);
        }
        // safe file name for the e-mail (letters incl. Lithuanian, digits, dot, dash, underscore, space)
        $safe = preg_replace('/[^\p{L}\p{N}._ -]+/u', '_', basename($origName));
        $safe = trim((string)$safe, ' .');
        if ($safe === '') {
            $safe = 'failas.' . $ext;
        }
        $attachments[] = [
            'name' => $safe,
            'mime' => $mime,
            'data' => (string)file_get_contents($f['tmp_name'][$i]),
        ];
    }
}

/*
 * Laiškas siunčiamas iš jūsų domeno adreso.
 * Reply-To nukreipia tiesiai į formą užpildžiusio žmogaus el. paštą.
 */
$to = 'info@sgo.lt';

$subjectText = 'Užklausa iš sgo.lt — ' . cleanHeader($name !== '' ? $name : 'be vardo');
$subject = encodeHeader($subjectText);

$body = "Nauja užklausa iš sgo.lt\n\n"
      . "Vardas: " . $name . "\n"
      . "El. paštas: " . $email . "\n"
      . "Tel. nr.: " . ($phone !== '' ? $phone : 'nenurodyta') . "\n"
      . "Miestas: " . ($city !== '' ? $city : 'nenurodytas') . "\n"
      . "Paslauga: " . ($service !== '' ? $service : 'nenurodyta') . "\n"
      . "Elektrinės galia: " . ($power !== '' ? $power : 'nenurodyta') . "\n\n"
      . "Žinutė:\n"
      . $message . "\n";

$headers = [
    'MIME-Version: 1.0',
    'From: ' . encodeHeader('SGO svetainė') . ' <info@sgo.lt>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION
];

if ($attachments) {
    $names = array_map(function ($a) { return '- ' . $a['name']; }, $attachments);
    $body .= "\nPridėti failai (" . count($attachments) . "):\n" . implode("\n", $names) . "\n";

    $boundary = 'sgo_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $mailBody = "--$boundary\r\n"
              . "Content-Type: text/plain; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($body)) . "\r\n";
    foreach ($attachments as $a) {
        $encodedName = encodeHeader($a['name']);
        $mailBody .= "--$boundary\r\n"
                   . 'Content-Type: ' . $a['mime'] . '; name="' . $encodedName . "\"\r\n"
                   . "Content-Transfer-Encoding: base64\r\n"
                   . 'Content-Disposition: attachment; filename="' . $encodedName . "\"; filename*=UTF-8''" . rawurlencode($a['name']) . "\r\n\r\n"
                   . chunk_split(base64_encode($a['data'])) . "\r\n";
    }
    $mailBody .= "--$boundary--\r\n";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: 8bit';
    $mailBody = $body;
}

$recent[] = $nowTs;
@file_put_contents($rateFile, json_encode($recent), LOCK_EX);

$sent = mail(
    $to,
    $subject,
    $mailBody,
    implode("\r\n", $headers),
    '-finfo@sgo.lt'
);

if (!$sent) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Nepavyko perduoti laiško siuntimo serveriui.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true
], JSON_UNESCAPED_UNICODE);
