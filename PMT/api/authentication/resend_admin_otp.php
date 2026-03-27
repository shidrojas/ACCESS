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

$email   = $data['Email'] ?? '';

if (!$email) {
    echo json_encode(["status" => "error", "message" => "Email required"]);
    exit;
}

/* Fetch unverified user */
$stmt = $conn->prepare("SELECT UserID, FirstName FROM user WHERE Email=? AND is_verified=0");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(["status" => "error", "message" => "No pending OTP found for this email"]);
    exit;
}

$user = $result->fetch_assoc();
$otp  = rand(100000, 999999);

/* Update OTP */
$update = $conn->prepare("UPDATE user SET OTP=? WHERE UserID=?");
$update->bind_param("ii", $otp, $user['UserID']);
$update->execute();

/* Send OTP email */
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
    $mail->Subject = "Admin Account OTP Verification";
    $mail->Body = "
        <h3>Hello {$user['FirstName']}</h3>
        <p>Your OTP code is:</p>
        <h1>$otp</h1>
        <p>This code is valid for <strong>5 minutes</strong>.</p>
    ";
    $mail->send();

    echo json_encode(["status" => "success", "message" => "OTP resent successfully"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Email sending failed"]);
}
?>