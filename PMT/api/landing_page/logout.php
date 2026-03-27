<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

session_start();
require_once "../db.php";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Read input
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Get UserID and LogID from POST or session
$userID = $data['UserID'] ?? $_SESSION['UserID'] ?? null;
$logID = $data['LogID'] ?? $_SESSION['LogID'] ?? null;

// If LogID not provided, get the latest log for this user where TimeOut is NULL
if ($userID && !$logID) {
    $findLog = $conn->query("
        SELECT LogID FROM user_logs 
        WHERE UserID = $userID AND TimeOut IS NULL 
        ORDER BY TimeIn DESC 
        LIMIT 1
    ");
    if ($findLog && $findLog->num_rows > 0) {
        $log = $findLog->fetch_assoc();
        $logID = $log['LogID'];
    }
}

// Validate
if (!$userID || !$logID) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing UserID or LogID",
        "debug" => [
            "userID_received" => $userID,
            "logID_received" => $logID,
            "input_data" => $data
        ]
    ]);
    exit;
}

// Update TimeOut for this log
$stmt = $conn->prepare("UPDATE user_logs SET TimeOut = NOW() WHERE LogID = ? AND UserID = ?");
$stmt->bind_param("ii", $logID, $userID);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    $success = true;
    $message = "Logout successful, TimeOut recorded.";
} else {
    $success = false;
    $message = "Could not update logout record. Maybe already logged out.";
}

$stmt->close();

// Clear session
if (session_status() === PHP_SESSION_ACTIVE) {
    session_unset();
    session_destroy();
}

// Response
echo json_encode([
    "status" => $success ? "success" : "error",
    "message" => $message
]);

$conn->close();
exit;
