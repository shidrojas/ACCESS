<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get PUT data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['TaskID']) || empty($data['UserID'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "TaskID and UserID are required"]);
    exit;
}

$TaskID = intval($data['TaskID']);
$UserID = intval($data['UserID']);

// First, get the task and project info
$taskQuery = $conn->query("
    SELECT t.*, p.UserID as HostID, p.ProjectID 
    FROM tasks t
    INNER JOIN project p ON t.ProjectID = p.ProjectID
    WHERE t.TaskID = $TaskID
");

if ($taskQuery->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

$taskData = $taskQuery->fetch_assoc();
$ProjectID = $taskData['ProjectID'];

// Check if user has permission (must be project host or co-host)
$permissionCheck = $conn->query("
    SELECT COUNT(*) as hasPermission 
    FROM project_members pm 
    WHERE pm.ProjectID = $ProjectID 
    AND pm.UserID = $UserID 
    AND pm.Role IN ('Host', 'Co-Host')
");

$permResult = $permissionCheck->fetch_assoc();
$isHostOrCoHost = $permResult['hasPermission'] > 0;

if (!$isHostOrCoHost) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Only project hosts and co-hosts can restore tasks"]);
    exit;
}

// Restore the task (set status back to 'To Do')
$sql = "UPDATE tasks SET Status = 'To Do' WHERE TaskID = $TaskID";

if ($conn->query($sql)) {
    // Get task details for activity log
    $TaskName = $taskData['TaskName'];
    
    // Get user name
    $userInfo = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $UserID")->fetch_assoc();
    $userName = $userInfo['FirstName'] . ' ' . $userInfo['LastName'];
    
    // Log activity
    $action = "Restored task";
    $desc = "Task '$TaskName' was restored and set to To Do";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($UserID, $ProjectID, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Task restored successfully"
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to restore task: " . $conn->error]);
}

$conn->close();
?>