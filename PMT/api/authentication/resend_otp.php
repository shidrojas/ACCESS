<?php
header("Access-Control-Allow-Origin: *");
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

/* Generate new OTP */
$otp = rand(100000, 999999);

/* Update OTP + reset timer */
$stmt = $conn->prepare("
    UPDATE user
    SET OTP = ?, created_at = NOW()
    WHERE Email = ?
");
$stmt->bind_param("ss", $otp, $email);
$stmt->execute();

/* Send email */
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
$mail->Subject = "Resent OTP";
$mail->Body = "Your new OTP is $otp. This code is valid for 5 minutes.";
$mail->send();

echo json_encode(["status" => "success"]);
