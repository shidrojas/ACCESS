<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$email = $input['Email'] ?? '';

if (!$email) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email is required"]);
    exit;
}

// Get user by email
$stmt = $conn->prepare("
    SELECT UserID, Email, FirstName, LastName, role, Status 
    FROM user 
    WHERE Email = ? AND Status = 'Active' AND role != 'admin'
");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode([
        "status" => "success",
        "user" => $user
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        "status" => "error",
        "message" => "User not found or is not available for invitation"
    ]);
}

$stmt->close();
$conn->close();
?>