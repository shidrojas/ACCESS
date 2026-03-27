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

if (!$data || !isset($data['adminId']) || !isset($data['password'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Admin ID and password are required"
    ]);
    exit;
}

$adminId = intval($data['adminId']);
$password = $data['password'];

// First check if user exists and has admin role in user table
$userCheck = $conn->prepare("SELECT UserID, role FROM user WHERE UserID = ?");
$userCheck->bind_param("i", $adminId);
$userCheck->execute();
$userResult = $userCheck->get_result();

if ($userResult->num_rows === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);
    exit;
}

$user = $userResult->fetch_assoc();

// Verify the user has admin role
if ($user['role'] !== 'admin') {
    echo json_encode([
        "status" => "error",
        "message" => "User is not an admin"
    ]);
    exit;
}

// For UserID = 1 (main admin), check their specific password
if ($adminId === 1) {
    $passwordQuery = $conn->prepare("SELECT password_hash FROM admin_passwords WHERE admin_id = ?");
    $passwordQuery->bind_param("i", $adminId);
    $passwordQuery->execute();
    $passwordResult = $passwordQuery->get_result();
    
    if ($passwordResult->num_rows === 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Main admin password not configured."
        ]);
        exit;
    }
    
    $row = $passwordResult->fetch_assoc();
    $hashedPassword = $row['password_hash'];
    
    if (password_verify($password, $hashedPassword)) {
        echo json_encode([
            "status" => "success",
            "message" => "Password verified"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Incorrect password"
        ]);
    }
} 
// For all other admins, check against the shared admin password (admin_id = 1's password)
else {
    // Get the main admin's password from admin_passwords
    $passwordQuery = $conn->prepare("SELECT password_hash FROM admin_passwords WHERE admin_id = 1");
    $passwordQuery->execute();
    $passwordResult = $passwordQuery->get_result();
    
    if ($passwordResult->num_rows === 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Shared admin password not configured."
        ]);
        exit;
    }
    
    $row = $passwordResult->fetch_assoc();
    $sharedHashedPassword = $row['password_hash'];
    
    // Verify against the shared password
    if (password_verify($password, $sharedHashedPassword)) {
        echo json_encode([
            "status" => "success",
            "message" => "Password verified"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Incorrect admin password"
        ]);
    }
}

$conn->close();
?>