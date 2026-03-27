<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$userId = intval($data['UserID'] ?? 0);
$projectId = intval($data['ProjectID'] ?? 0);
$action = $conn->real_escape_string($data['Action'] ?? '');
$description = $conn->real_escape_string($data['Description'] ?? '');

if (!$userId || !$projectId || !$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Insert activity log
$sql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
        VALUES ($userId, $projectId, '$action', '$description', NOW())";

if ($conn->query($sql)) {
    echo json_encode([
        "status" => "success",
        "message" => "Activity logged successfully",
        "logId" => $conn->insert_id
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to log activity: " . $conn->error]);
}

$conn->close();
?>