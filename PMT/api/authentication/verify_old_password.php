<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$userId = $data['UserID'] ?? 0;
$oldPassword = $data['OldPassword'] ?? '';

if (!$userId || !$oldPassword) {
    echo json_encode(["status" => "error", "message" => "User ID and old password required"]);
    exit;
}

// Get user's current password
$stmt = $conn->prepare("SELECT Password FROM user WHERE UserID = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

$user = $result->fetch_assoc();

// Verify old password
if (password_verify($oldPassword, $user['Password'])) {
    echo json_encode(["status" => "success", "message" => "Password verified"]);
} else {
    echo json_encode(["status" => "error", "message" => "Current password is incorrect"]);
}

$stmt->close();
$conn->close();
?>