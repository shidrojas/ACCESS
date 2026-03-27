<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

/* 🔥 AUTO-EXPIRE OTPs (5 minutes) */
$conn->query("
    DELETE FROM user
    WHERE OTP IS NOT NULL
      AND is_verified = 0
      AND created_at < NOW() - INTERVAL 5 MINUTE
");

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['Email'] ?? '';
$otp   = $data['OTP'] ?? '';

if (empty($email) || empty($otp)) {
    echo json_encode(["status" => "error", "message" => "Missing OTP or email"]);
    exit;
}

/* Verify OTP */
$stmt = $conn->prepare("
    SELECT UserID, FirstName, LastName, Role FROM user
    WHERE Email = ? AND OTP = ? AND is_verified = 0
");
$stmt->bind_param("ss", $email, $otp);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(["status" => "error", "message" => "Invalid or expired OTP"]);
    $stmt->close();
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

/* Activate user */
$update = $conn->prepare("
    UPDATE user
    SET is_verified = 1,
        Status = 'Active',
        OTP = NULL
    WHERE Email = ?
");
$update->bind_param("s", $email);

if (!$update->execute()) {
    echo json_encode(["status" => "error", "message" => "Failed to activate account"]);
    $update->close();
    exit;
}
$update->close();

/* 🔥 Event log for self-registered student */
$action = "Student Account Registered: {$user['FirstName']} {$user['LastName']}";
$handledBy = "Student: {$user['LastName']}";

$logStmt = $conn->prepare("
    INSERT INTO event_logs (UserID, Action, HandledBy) 
    VALUES (?, ?, ?)
");
$logStmt->bind_param("iss", $user['UserID'], $action, $handledBy);
$logStmt->execute();
$logStmt->close();

/* Success response */
echo json_encode(["status" => "success", "message" => "OTP verified and account activated"]);
?>