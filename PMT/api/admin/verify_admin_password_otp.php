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

if (!$data || !isset($data['adminId']) || !isset($data['otp'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Admin ID and OTP are required"
    ]);
    exit;
}

$adminId = intval($data['adminId']);
$otp = $data['otp'];

// Verify OTP
$stmt = $conn->prepare("
    SELECT UserID
    FROM user
    WHERE UserID = ?
      AND reset_otp = ?
      AND reset_otp_expires > NOW()
");
$stmt->bind_param("is", $adminId, $otp);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid or expired OTP"
    ]);
    exit;
}

echo json_encode([
    "status" => "success",
    "message" => "OTP verified"
]);

$conn->close();
?>