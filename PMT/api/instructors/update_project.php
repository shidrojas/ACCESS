<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, PATCH, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get PUT/PATCH data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Log for debugging
error_log("Received update data: " . print_r($data, true));

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['ProjectID']) || empty($data['UserID'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID and UserID are required"]);
    exit;
}

$ProjectID = intval($data['ProjectID']);
$UserID = intval($data['UserID']);

// Get original project data for comparison
$originalQuery = $conn->query("SELECT * FROM project WHERE ProjectID = $ProjectID");
if ($originalQuery->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Project not found"]);
    exit;
}
$originalProject = $originalQuery->fetch_assoc();

// Check if user has permission to edit this project (must be Host)
$permissionCheck = $conn->query("
    SELECT pm.Role 
    FROM project_members pm 
    WHERE pm.UserID = $UserID AND pm.ProjectID = $ProjectID
");

if ($permissionCheck->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission to edit this project"]);
    exit;
}

$userRole = $permissionCheck->fetch_assoc()['Role'];

// Only Host can update project settings
$isHost = ($userRole === 'Host');

if (!$isHost) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Only project host can update project settings"]);
    exit;
}

// Build update query dynamically based on provided fields
$updateFields = [];
$updateParams = [];
$changes = [];

// Project Name
if (isset($data['ProjectName']) && !empty(trim($data['ProjectName'])) && $data['ProjectName'] != $originalProject['ProjectName']) {
    $ProjectName = $conn->real_escape_string(trim($data['ProjectName']));
    $updateFields[] = "ProjectName = '$ProjectName'";
    $updateParams['ProjectName'] = $data['ProjectName'];
    $changes[] = "renamed project from '{$originalProject['ProjectName']}' to '$ProjectName'";
}

// Description
if (isset($data['Description']) && $data['Description'] != $originalProject['Description']) {
    $Description = $conn->real_escape_string(trim($data['Description']));
    $updateFields[] = "Description = '$Description'";
    $updateParams['Description'] = $data['Description'];
    $changes[] = "updated project description";
}

// Check if there are any fields to update
if (empty($updateFields)) {
    http_response_code(200);
    echo json_encode(["status" => "success", "message" => "No changes made to the project"]);
    exit;
}

// Add updated timestamp
$updateFields[] = "updated_At = NOW()";

// Build and execute update query
$sql = "UPDATE project SET " . implode(", ", $updateFields) . " WHERE ProjectID = $ProjectID";

if ($conn->query($sql)) {
    if ($conn->affected_rows > 0) {
        // Log each change
        foreach ($changes as $change) {
            $action = "Updated project";
            $desc = $conn->real_escape_string($change);
            $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
                       VALUES ($UserID, $ProjectID, '$action', '$desc', NOW())";
            $conn->query($logSql);
        }
        
        // Get updated project data
        $updatedProject = $conn->query("
            SELECT ProjectID, ProjectName, Description, Code, StartDate, EndDate, Status,
                   created_At, updated_At
            FROM project 
            WHERE ProjectID = $ProjectID
        ");
        
        if ($updatedProject->num_rows > 0) {
            $projectData = $updatedProject->fetch_assoc();
            
            echo json_encode([
                "status" => "success",
                "message" => "Project updated successfully",
                "updated_fields" => array_keys($updateParams),
                "project" => $projectData
            ]);
        } else {
            echo json_encode([
                "status" => "success", 
                "message" => "Project updated successfully",
                "updated_fields" => array_keys($updateParams)
            ]);
        }
    } else {
        echo json_encode(["status" => "success", "message" => "No changes made to the project"]);
    }
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>