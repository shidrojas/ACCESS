<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email   = $data['Email'] ?? '';
$otp     = $data['OTP'] ?? '';
$adminId = intval($data['AdminID'] ?? 0);

if (!$email || !$otp || !$adminId) {
    echo json_encode(["status" => "error", "message" => "Missing data"]);
    exit;
}

/* 🔥 Verify OTP */
$stmt = $conn->prepare("SELECT UserID, FirstName, LastName, Role FROM user WHERE Email=? AND OTP=? AND is_verified=0");
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

/* 🔥 Activate the user */
$update = $conn->prepare("UPDATE user SET is_verified=1, Status='Active', OTP=NULL WHERE Email=?");
$update->bind_param("s", $email);
$update->execute();
$update->close();

/* 🔥 Fetch admin name for event log */
$stmtAdmin = $conn->prepare("SELECT FirstName, LastName FROM user WHERE UserID=?");
$stmtAdmin->bind_param("i", $adminId);
$stmtAdmin->execute();
$resAdmin = $stmtAdmin->get_result();
$admin = $resAdmin->fetch_assoc();
$stmtAdmin->close();

$handledBy = "Admin: {$admin['LastName']}";
$action = ($user['Role'] === 'project_manager') 
            ? "Instructor Account Activated: {$user['FirstName']} {$user['LastName']}"
            : "Admin Account Activated: {$user['FirstName']} {$user['LastName']}";

/* 🔥 Insert event log */
$logStmt = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
$logStmt->bind_param("iss", $adminId, $action, $handledBy);
$logStmt->execute();
$logStmt->close();

echo json_encode(["status" => "success", "message" => "OTP verified and account activated"]);
?>