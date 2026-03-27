<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email    = $data['Email'] ?? '';
$password = $data['Password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Missing data"]);
    exit;
}

// Check if user has a valid OTP (forgot password flow)
$stmt = $conn->prepare("
    SELECT UserID FROM user
    WHERE Email = ?
      AND reset_otp IS NOT NULL
      AND reset_otp_expires > NOW()
");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "No valid OTP found. Please request a new OTP."]);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("
    UPDATE user
    SET Password = ?, reset_otp = NULL, reset_otp_expires = NULL
    WHERE Email = ?
");
$stmt->bind_param("ss", $hashed, $email);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Password reset failed"]);
}

$stmt->close();
$conn->close();
?>