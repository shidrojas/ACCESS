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

$firstName = $data['FirstName'] ?? '';
$lastName  = $data['LastName'] ?? '';
$email     = $data['Email'] ?? '';
$password  = $data['Password'] ?? '';
$roleUI    = $data['Role'] ?? 'Instructor'; // Instructor or Admin
$adminId   = $data['AdminID'] ?? null;

if (!$firstName || !$lastName || !$email || !$password || !$roleUI || !$adminId) {
    echo json_encode(["status" => "error", "message" => "All fields required"]);
    exit;
}

/* Map UI role to DB role */
switch(strtolower($roleUI)) {
    case 'instructor': $role = 'project_manager'; break;
    case 'admin': $role = 'admin'; break;
    default: $role = 'project_manager';
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

/* Check for duplicate email */
$stmtCheck = $conn->prepare("SELECT UserID FROM user WHERE Email = ?");
$stmtCheck->bind_param("s", $email);
$stmtCheck->execute();
$stmtCheck->store_result();
if ($stmtCheck->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Email already exists"]);
    exit;
}

/* Generate OTP for admin-created user */
$otp = rand(100000, 999999);
$status = 'Pending';
$is_verified = 0;

/* Insert new user (pending, OTP required) */
$stmt = $conn->prepare("
    INSERT INTO user (FirstName, LastName, Email, Password, Role, OTP, is_verified, Status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("sssssiss", $firstName, $lastName, $email, $passwordHash, $role, $otp, $is_verified, $status);
$stmt->execute();
$newUserId = $stmt->insert_id;

/* 🔥 Send OTP email */
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
    $mail->Subject = "OTP Verification for Admin-Created Account";
    $mail->Body = "
        <h3>Hello $firstName</h3>
        <p>Your OTP code is:</p>
        <h1>$otp</h1>
        <p>Please verify your account. This code is valid for <strong>5 minutes</strong>.</p>
    ";
    $mail->send();
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "OTP email sending failed"]);
    exit;
}

echo json_encode(["status" => "success", "message" => "User created and OTP sent"]);
?>