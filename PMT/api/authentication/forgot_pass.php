<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../../PHPMailer-master/src/Exception.php';
require '../../PHPMailer-master/src/PHPMailer.php';
require '../../PHPMailer-master/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['Email'] ?? '';

if (empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email required"]);
    exit;
}

/* Check account exists */
$stmt = $conn->prepare("SELECT FirstName, UserID FROM user WHERE Email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(["status" => "error", "message" => "Email not found"]);
    exit;
}

$user = $result->fetch_assoc();
$otp = rand(100000, 999999);

/* Store OTP + expiry */
$stmt = $conn->prepare("
    UPDATE user
    SET reset_otp = ?, reset_otp_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE)
    WHERE Email = ?
");
$stmt->bind_param("ss", $otp, $email);
$stmt->execute();

/* Send email */
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = "smtp.gmail.com";
    $mail->SMTPAuth = true;
    $mail->Username = 'accesspmt2026@gmail.com';
    $mail->Password = 'xzos nqke mqlk yyhb';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('accesspmt2026@gmail.com', 'ACCESS PMT');
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = "Password Reset OTP";
    $mail->Body = "
        <h3>Hello {$user['FirstName']}</h3>
        <p>Your OTP code for password reset is:</p>
        <h1 style=\"font-size: 32px; letter-spacing: 5px;\">$otp</h1>
        <p>This code is valid for <strong>5 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
    ";
    $mail->send();

    echo json_encode(["status" => "success", "message" => "OTP sent to your email"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Failed to send OTP email: " . $e->getMessage()]);
}

$stmt->close();
$conn->close();
?>