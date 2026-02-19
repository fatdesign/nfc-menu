<?php
// ============================================
// SHAKER MENU - GITHUB PROXY
// ============================================
// Platziere diese Datei auf deinem Server:
// https://deine-agentur.at/shaker-proxy/proxy.php
//
// Der GitHub Token bleibt sicher auf dem Server
// und wird nie an den Browser gesendet!
// ============================================

// --- KONFIGURATION (NUR HIER ÄNDERN) ---
define('ADMIN_PASSWORD', 'shaker2024');       // Passwort für das Admin-Panel
define('GITHUB_TOKEN', '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'); // GitHub Personal Access Token
define('GITHUB_OWNER', 'fatdesign'); // Dein GitHub Benutzername
define('GITHUB_REPO', 'shaker-menu');        // Name des Repositories
define('MENU_FILE_PATH', 'menu.json');             // Pfad zur Menü-Datei im Repo

// --- ERLAUBTE ORIGINS (Sicherheit) ---
// Trage hier die GitHub Pages URL des Restaurants ein
define('ALLOWED_ORIGIN', 'https://fatdesign.github.io');

// ============================================
// AB HIER NICHTS MEHR ÄNDERN
// ============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Passwort prüfen ---
$providedPassword = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
if ($providedPassword !== ADMIN_PASSWORD) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$apiBase = 'https://api.github.com/repos/' . GITHUB_OWNER . '/' . GITHUB_REPO . '/contents/' . MENU_FILE_PATH;

$headers = [
    'Authorization: Bearer ' . GITHUB_TOKEN,
    'Accept: application/vnd.github.v3+json',
    'User-Agent: ShakerMenuAdmin/1.0',
    'Content-Type: application/json',
];

// --- GET: Aktuelle Speisekarte laden ---
if ($method === 'GET') {
    $ch = curl_init($apiBase);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($status);
    echo $response;
    exit;
}

// --- PUT: Speisekarte aktualisieren ---
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!isset($body['content']) || !isset($body['sha'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Fehlende Felder: content und sha sind erforderlich']);
        exit;
    }

    $payload = json_encode([
        'message' => 'Admin: Speisekarte aktualisiert',
        'content' => $body['content'], // base64-encoded JSON
        'sha' => $body['sha'],
    ]);

    $ch = curl_init($apiBase);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($status);
    echo $response;
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
