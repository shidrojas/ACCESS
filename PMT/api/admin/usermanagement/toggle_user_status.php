<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$userId = $data['userId'] ?? 0;
$adminId = $data['adminId'] ?? 0;

if (!$userId || !$adminId) {
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

/* Fetch current user status */
$stmt = $conn->prepare("SELECT FirstName, LastName, Status FROM user WHERE UserID = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

$user = $result->fetch_assoc();
$newStatus = ($user['Status'] === 'Active') ? 'Deactivated' : 'Active';

/* Update user status */
$update = $conn->prepare("UPDATE user SET Status = ? WHERE UserID = ?");
$update->bind_param("si", $newStatus, $userId);
$update->execute();

/* Fetch admin name for event log */
$stmtAdmin = $conn->prepare("SELECT LastName FROM user WHERE UserID = ?");
$stmtAdmin->bind_param("i", $adminId);
$stmtAdmin->execute();
$resAdmin = $stmtAdmin->get_result();

if ($resAdmin->num_rows === 1) {
    $admin = $resAdmin->fetch_assoc();
    $handledBy = "Admin: {$admin['LastName']}";
} else {
    $handledBy = "Admin";
}
$stmtAdmin->close();

/* Insert event log */
$action = ($newStatus === 'Active') 
    ? "Activated user account: {$user['FirstName']} {$user['LastName']}" 
    : "Deactivated user account: {$user['FirstName']} {$user['LastName']}";

$logStmt = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
$logStmt->bind_param("iss", $adminId, $action, $handledBy);
$logStmt->execute();
$logStmt->close();

echo json_encode([
    "status" => "success",
    "message" => "User account status updated successfully",
    "newStatus" => $newStatus
]);
?>