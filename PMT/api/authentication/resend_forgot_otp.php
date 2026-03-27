<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

use PHPMailer\PHPMailer\PHPMailer;
require '../../PHPMailer-master/src/PHPMailer.php';
require '../../PHPMailer-master/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['Email'] ?? '';

if (empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email required"]);
    exit;
}

$otp = rand(100000, 999999);

$stmt = $conn->prepare("
    UPDATE user
    SET reset_otp = ?, reset_otp_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE)
    WHERE Email = ?
");
$stmt->bind_param("ss", $otp, $email);
$stmt->execute();

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
$mail->Subject = "Resent Password Reset OTP";
$mail->Body = "Your new OTP is $otp. Valid for 5 minutes.";
$mail->send();

echo json_encode(["status" => "success"]);