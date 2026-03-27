<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email = $data['Email'] ?? '';
$otp   = $data['OTP'] ?? '';

if (empty($email) || empty($otp)) {
    echo json_encode(["status" => "error", "message" => "Missing OTP or email"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT UserID
    FROM user
    WHERE Email = ?
      AND reset_otp = ?
      AND reset_otp_expires > NOW()
");
$stmt->bind_param("ss", $email, $otp);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(["status" => "error", "message" => "Invalid or expired OTP"]);
    exit;
}

echo json_encode(["status" => "success"]);