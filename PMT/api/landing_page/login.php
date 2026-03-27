<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

session_start();
require_once "../db.php";

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$max_attempts = 5;
$lock_minutes = 3;
$lock_seconds = $lock_minutes * 60;

// Initialize session vars
$_SESSION['login_attempts'] = $_SESSION['login_attempts'] ?? 0;
$_SESSION['lock_until'] = $_SESSION['lock_until'] ?? null;

// Check lock
if ($_SESSION['lock_until'] && time() < $_SESSION['lock_until']) {
    $remaining = $_SESSION['lock_until'] - time();
    echo json_encode([
        "status" => "error",
        "message" => "Too many failed attempts. Try again in {$lock_minutes} minutes.",
        "locked" => true,
        "remaining_seconds" => $remaining,
        "clear_password" => true
    ]);
    exit;
}

// Reset lock if expired
if ($_SESSION['lock_until'] && time() >= $_SESSION['lock_until']) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['lock_until'] = null;
}

// Read input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['Email']) || empty($data['Password'])) {
    failAttempt();
}

$email = $conn->real_escape_string($data['Email']);
$password = $data['Password'];

// Fetch verified user
$query = $conn->query("
    SELECT UserID, Email, Password, role, Status
    FROM user
    WHERE Email = '$email' AND is_verified = 1
    LIMIT 1
");

if (!$query || $query->num_rows === 0) {
    failAttempt();
}

$user = $query->fetch_assoc();

// Deactivated check
if ($user['Status'] === 'Deactivated') {
    echo json_encode([
        "status" => "error",
        "message" => "Account is deactivated. Please contact administrator.",
        "clear_password" => true
    ]);
    exit;
}

// Wrong password
if (!password_verify($password, $user['Password'])) {
    failAttempt();
}

// ✅ SUCCESS
$_SESSION['login_attempts'] = 0;
$_SESSION['lock_until'] = null;
$_SESSION['UserID'] = $user['UserID'];

// Insert login session
$stmt = $conn->prepare("INSERT INTO user_logs (UserID, TimeIn) VALUES (?, NOW())");
$stmt->bind_param("i", $user['UserID']);
$stmt->execute();

$_SESSION['LogID'] = $stmt->insert_id;

$stmt->close();

// Return user info + debug info
echo json_encode([
    "status" => "success",
    "message" => "Login successful",
    "user" => [
        "user_id" => $user['UserID'],
        "email" => $user['Email'],
        "role" => $user['role']
    ],
    "LogID" => $_SESSION['LogID']
]);

$conn->close();
exit;

function failAttempt() {
    global $max_attempts, $lock_seconds;

    $_SESSION['login_attempts']++;

    if ($_SESSION['login_attempts'] >= $max_attempts) {
        $_SESSION['lock_until'] = time() + $lock_seconds;
        echo json_encode([
            "status" => "error",
            "message" => "Too many failed attempts. Login locked for 3 minutes.",
            "locked" => true,
            "remaining_seconds" => $lock_seconds,
            "clear_password" => true
        ]);
        exit;
    }

    echo json_encode([
        "status" => "error",
        "message" => "Invalid email or password",
        "attempts_left" => $max_attempts - $_SESSION['login_attempts'],
        "clear_password" => true
    ]);
    exit;
}
?>
