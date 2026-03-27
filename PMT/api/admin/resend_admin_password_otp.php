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

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../../PHPMailer-master/src/Exception.php';
require '../../PHPMailer-master/src/PHPMailer.php';
require '../../PHPMailer-master/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['adminId'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Admin ID is required"
    ]);
    exit;
}

$adminId = intval($data['adminId']);

// Fetch admin email
$query = $conn->prepare("SELECT Email, FirstName FROM user WHERE UserID = ?");
$query->bind_param("i", $adminId);
$query->execute();
$result = $query->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Admin not found"
    ]);
    exit;
}

$admin = $result->fetch_assoc();
$email = $admin['Email'];
$name = $admin['FirstName'];

// Generate new 6-digit OTP
$otp = rand(100000, 999999);

// Update OTP with new expiration
$stmt = $conn->prepare("
    UPDATE user
    SET reset_otp = ?, reset_otp_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE)
    WHERE UserID = ?
");
$stmt->bind_param("si", $otp, $adminId);
$stmt->execute();

// Send email using PHPMailer
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = "smtp.gmail.com";
    $mail->SMTPAuth = true;
    $mail->Username = 'accesspmt2026@gmail.com';
    $mail->Password = 'xzos nqke mqlk yyhb';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('accesspmt2026@gmail.com', 'ACCESS PMT');
    $mail->addAddress($email);
    $mail->Subject = "Resent: Admin Password Change OTP";
    $mail->isHTML(true);
    $mail->Body = "
    <html>
    <head>
        <title>Admin Password Change OTP</title>
    </head>
    <body>
        <h2>Hello $name,</h2>
        <p>You requested to resend the OTP for changing your admin password. Your new OTP code is:</p>
        <h1 style='color: #4f46e5; font-size: 32px; letter-spacing: 5px;'>$otp</h1>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>ACCESS PMT System</p>
    </body>
    </html>
    ";

    $mail->send();

    echo json_encode([
        "status" => "success",
        "message" => "OTP resent successfully"
    ]);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to resend OTP: " . $mail->ErrorInfo
    ]);
}

$conn->close();
?>