<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, PUT, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get the raw POST data
$input = file_get_contents("php://input");
$data = json_decode($input);

// Debug logging
error_log("Archive project request received: " . $input);

if (!isset($data->ProjectID) || !isset($data->UserID)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Project ID and User ID are required",
        "received" => $data
    ]);
    exit();
}

$projectId = intval($data->ProjectID);
$userId = intval($data->UserID);

// Check if user is the host of the project
$checkQuery = "SELECT pm.Role, p.ProjectName, p.Status FROM project_members pm 
               INNER JOIN project p ON pm.ProjectID = p.ProjectID
               WHERE pm.ProjectID = $projectId AND pm.UserID = $userId";
$checkResult = $conn->query($checkQuery);

if ($checkResult->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You are not a member of this project"]);
    exit();
}

$member = $checkResult->fetch_assoc();
if ($member['Role'] !== 'Host') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Only project hosts can archive the project"]);
    exit();
}

// Check if project is already archived
if ($member['Status'] === 'Archived') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Project is already archived"]);
    exit();
}

$projectName = $member['ProjectName'];

// Begin transaction
$conn->begin_transaction();

try {
    // Update project status to 'Archived' - ONLY THIS, no notifications
    $query = "UPDATE project SET Status = 'Archived', updated_at = NOW() WHERE ProjectID = $projectId";
    
    if (!$conn->query($query)) {
        throw new Exception("Failed to update project: " . $conn->error);
    }

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Project archived successfully",
        "projectId" => $projectId,
        "projectName" => $projectName
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("Archive project error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Failed to archive project: " . $e->getMessage()
    ]);
}

$conn->close();
?>