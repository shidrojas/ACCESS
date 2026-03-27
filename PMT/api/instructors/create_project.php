<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Log for debugging (remove in production)
error_log("Received data: " . print_r($data, true));

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['UserID']) || empty($data['ProjectName']) || empty($data['Description'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "UserID, ProjectName, and Description are required"]);
    exit;
}

$UserID = intval($data['UserID']);
$ProjectName = $conn->real_escape_string(trim($data['ProjectName']));
$Description = $conn->real_escape_string(trim($data['Description']));
$Password = !empty($data['Password']) ? password_hash($data['Password'], PASSWORD_DEFAULT) : NULL;

// Get the selected color, or use default if not provided
$color = !empty($data['color']) ? $conn->real_escape_string(trim($data['color'])) : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';

// Validate UserID exists (optional but recommended)
$userCheck = $conn->query("SELECT UserID FROM user WHERE UserID = $UserID");
if ($userCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Function to generate random alphanumeric code
function generateProjectCode($length = 8) {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

$Code = generateProjectCode();

// Insert project with color column
$sql = "INSERT INTO project (UserID, ProjectName, Description, Password, Code, color) 
        VALUES ($UserID, '$ProjectName', '$Description', " . ($Password ? "'$Password'" : "NULL") . ", '$Code', '$color')";

if ($conn->query($sql)) {
    $ProjectID = $conn->insert_id;

    // Add creator as project member
    $memberSql = "INSERT INTO project_members (UserID, ProjectID, Role) VALUES ($UserID, $ProjectID, 'Host')";
    
    if ($conn->query($memberSql)) {
        http_response_code(201);
        echo json_encode([
            "status" => "success",
            "message" => "Project created successfully",
            "project" => [
                "ProjectID" => $ProjectID,
                "ProjectName" => $data['ProjectName'], // Return original, not escaped
                "Description" => $data['Description'], // Return original, not escaped
                "Code" => $Code,
                "color" => $color,
                "Password" => $Password ? "Set" : "Not set"
            ]
        ]);
    } else {
        // Rollback project creation if member addition fails
        $conn->query("DELETE FROM project WHERE ProjectID = $ProjectID");
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to add project member: " . $conn->error]);
    }
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>