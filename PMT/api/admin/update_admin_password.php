<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['adminId']) || !isset($data['newPassword'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Admin ID and new password are required"
    ]);
    exit;
}

$adminId = intval($data['adminId']);
$newPassword = password_hash($data['newPassword'], PASSWORD_DEFAULT);

// Start transaction
$conn->begin_transaction();

try {
    // Update password in admin_passwords table
    $query = $conn->prepare("UPDATE admin_passwords SET password_hash = ?, updated_at = NOW() WHERE admin_id = ?");
    $query->bind_param("si", $newPassword, $adminId);
    
    if (!$query->execute()) {
        throw new Exception("Failed to update password");
    }

    // Clear OTP after successful password change
    $clearOtp = $conn->prepare("UPDATE user SET reset_otp = NULL, reset_otp_expires = NULL WHERE UserID = ?");
    $clearOtp->bind_param("i", $adminId);
    
    if (!$clearOtp->execute()) {
        throw new Exception("Failed to clear OTP");
    }

    // 🔥 Get admin's name for the event log
    $adminQuery = $conn->prepare("SELECT FirstName, LastName FROM user WHERE UserID = ?");
    $adminQuery->bind_param("i", $adminId);
    $adminQuery->execute();
    $adminResult = $adminQuery->get_result();
    $admin = $adminResult->fetch_assoc();
    
    // Format handler name as "Admin: Lastname" (matching your other logs)
    $handledBy = "Admin: " . $admin['LastName'];

    // Log ONLY the password change event
    $action = "Changed admin password";
    $logQuery = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
    $logQuery->bind_param("iss", $adminId, $action, $handledBy);
    
    if (!$logQuery->execute()) {
        throw new Exception("Failed to log event");
    }

    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Password updated successfully"
    ]);

} catch (Exception $e) {
    $conn->rollback();
    
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>