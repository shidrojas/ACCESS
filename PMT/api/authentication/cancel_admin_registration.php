<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email   = $data['Email'] ?? '';
$adminId = intval($data['AdminID'] ?? 0);

if (!$email || !$adminId) {
    echo json_encode([
        "status" => "error",
        "message" => "Email and AdminID required"
    ]);
    exit;
}

/* Delete unverified admin-created user */
$stmt = $conn->prepare("
    DELETE FROM user
    WHERE Email = ? 
    AND is_verified = 0
");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->close();

/* 🔥 Fetch admin last name for event log */
$stmtAdmin = $conn->prepare("SELECT LastName FROM user WHERE UserID=?");
$stmtAdmin->bind_param("i", $adminId);
$stmtAdmin->execute();
$resAdmin = $stmtAdmin->get_result();
$admin = $resAdmin->fetch_assoc();
$stmtAdmin->close();

$handledBy = "Admin: {$admin['LastName']}";
$action = "Admin-Created Account Cancelled: $email";

/* Insert event log */
$logStmt = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
$logStmt->bind_param("iss", $adminId, $action, $handledBy);
$logStmt->execute();
$logStmt->close();

echo json_encode([
    "status" => "success",
    "message" => "Unverified admin-created account removed and event logged"
]);

$conn->close();
?>