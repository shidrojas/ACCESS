<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

if (empty($data['FirstName']) || empty($data['LastName']) || empty($data['Email']) || empty($data['Password'])) {
    echo json_encode(["status" => "error", "message" => "All fields required"]);
    exit;
}

$firstName = $data['FirstName'];
$lastName  = $data['LastName'];
$email     = $data['Email'];
$password  = password_hash($data['Password'], PASSWORD_DEFAULT);
$adminId   = $data['AdminID'] ?? null; // optional, only if admin created account

/* Prevent duplicate email */
$stmt = $conn->prepare("SELECT UserID FROM user WHERE Email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Email already exists"]);
    exit;
}

/* Map UI role to DB role */
$uiRole = $data['Role'] ?? 'Student';
switch($uiRole){
    case 'Student': $role = 'member'; break;
    case 'Instructor': $role = 'project_manager'; break;
    case 'Admin': $role = 'admin'; break;
    default: $role = 'member';
}

/* Generate OTP only for self-registered */
$otp = $adminId ? null : rand(100000, 999999);

/* Set status */
$status = $adminId ? 'Active' : 'Pending';
$is_verified = $adminId ? 1 : 0;

/* Insert user */
$stmt = $conn->prepare("
    INSERT INTO user
    (FirstName, LastName, Email, Password, Role, OTP, is_verified, Status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("sssssiis", $firstName, $lastName, $email, $password, $role, $otp, $is_verified, $status);
$stmt->execute();
$userId = $stmt->insert_id;

/* 🔥 Event log for admin-created users */
if ($adminId) {
    $action = ($role === 'project_manager') 
              ? "Instructor Account Created: $firstName $lastName"
              : "Admin Account Created: $firstName $lastName";

    /* Fetch admin last name */
    $stmtAdmin = $conn->prepare("SELECT LastName FROM user WHERE UserID = ?");
    $stmtAdmin->bind_param("i", $adminId);
    $stmtAdmin->execute();
    $resAdmin = $stmtAdmin->get_result();
    $admin = $resAdmin->fetch_assoc();
    $handledBy = "Admin: " . $admin['LastName'];

    $logStmt = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
    $logStmt->bind_param("iss", $adminId, $action, $handledBy);
    $logStmt->execute();
    $logStmt->close();

    echo json_encode(["status" => "success", "message" => "User created successfully"]);
    exit;
}

/* 🔥 Send OTP email for self-registered */
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
    $mail->Subject = "OTP Verification";
    $mail->Body = "
        <h3>Hello $firstName</h3>
        <p>Your OTP code is:</p>
        <h1>$otp</h1>
        <p>This code is valid for <strong>5 minutes</strong>.</p>
    ";
    $mail->send();

    echo json_encode(["status" => "success", "message" => "OTP sent to email"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Email sending failed"]);
}
?>