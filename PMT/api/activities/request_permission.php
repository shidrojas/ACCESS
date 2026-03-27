<?php
// Enable error logging but don't display errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Get POST data
$input = file_get_contents("php://input");
if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$data = json_decode($input, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON data"]);
    exit;
}

$taskId = intval($data['TaskID'] ?? 0);
$userId = intval($data['UserID'] ?? 0);

if (!$taskId || !$userId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Check if task exists and get project ID
$taskQuery = $conn->prepare("SELECT TaskName, ProjectID FROM task WHERE TaskID = ?");
$taskQuery->bind_param("i", $taskId);
$taskQuery->execute();
$taskResult = $taskQuery->get_result();

if ($taskResult->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

$task = $taskResult->fetch_assoc();
$projectId = $task['ProjectID'];
$taskName = $task['TaskName'];

// Check if task is "In Progress" - if yes, don't allow requests
$statusCheck = $conn->prepare("SELECT Status FROM task WHERE TaskID = ?");
$statusCheck->bind_param("i", $taskId);
$statusCheck->execute();
$statusResult = $statusCheck->get_result();
$taskStatus = $statusResult->fetch_assoc()['Status'];

if ($taskStatus === 'For Review') {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Permission requests are not available for tasks in For Review"
    ]);
    exit;
}

// Check if user is already assigned to this task
$checkAssignee = $conn->prepare("SELECT id, is_rejected FROM task_assignees WHERE TaskID = ? AND UserID = ?");
$checkAssignee->bind_param("ii", $taskId, $userId);
$checkAssignee->execute();
$assigneeResult = $checkAssignee->get_result();

if ($assigneeResult->num_rows > 0) {
    $assignee = $assigneeResult->fetch_assoc();
    
    // If previously rejected, allow them to request again
    if ($assignee['is_rejected'] == 1) {
        $updateSql = $conn->prepare("UPDATE task_assignees SET can_update_status = 'Pending', is_rejected = 0 WHERE TaskID = ? AND UserID = ?");
        $updateSql->bind_param("ii", $taskId, $userId);
        $success = $updateSql->execute();
    } else {
        // Update existing record to 'Pending'
        $updateSql = $conn->prepare("UPDATE task_assignees SET can_update_status = 'Pending' WHERE TaskID = ? AND UserID = ?");
        $updateSql->bind_param("ii", $taskId, $userId);
        $success = $updateSql->execute();
    }
} else {
    // Insert new record with 'Pending' status and is_rejected = 0
    $insertSql = $conn->prepare("INSERT INTO task_assignees (TaskID, UserID, can_update_status, is_rejected, assigned_at) VALUES (?, ?, 'Pending', 0, NOW())");
    $insertSql->bind_param("ii", $taskId, $userId);
    $success = $insertSql->execute();
}

if ($success) {
    // Get requester info
    $userQuery = $conn->prepare("SELECT FirstName, LastName FROM user WHERE UserID = ?");
    $userQuery->bind_param("i", $userId);
    $userQuery->execute();
    $userResult = $userQuery->get_result();
    $user = $userResult->fetch_assoc();
    $requesterName = $user['FirstName'] . ' ' . $user['LastName'];
    
    // Log activity
    $action = "Permission request for task: " . $taskName;
    $description = "$requesterName requested permission to update task '$taskName' status";
    
    $logSql = $conn->prepare("INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) VALUES (?, ?, ?, ?, NOW())");
    $logSql->bind_param("iiss", $userId, $projectId, $action, $description);
    $logSql->execute();
    
    // Create notifications for all project hosts
    $hostQuery = $conn->prepare("
        SELECT u.UserID, CONCAT(u.FirstName, ' ', u.LastName) as Name 
        FROM project_members pm
        INNER JOIN user u ON pm.UserID = u.UserID
        WHERE pm.ProjectID = ? AND pm.Role = 'Host'
    ");
    $hostQuery->bind_param("i", $projectId);
    $hostQuery->execute();
    $hostsResult = $hostQuery->get_result();
    
    while ($host = $hostsResult->fetch_assoc()) {
        $hostId = $host['UserID'];
        $message = "$requesterName requested permission to update task '$taskName' status";
        
        $notifSql = $conn->prepare("INSERT INTO notification (UserID, ProjectID, Message, Type, is_read, created_at) VALUES (?, ?, ?, 'permission_request', 0, NOW())");
        $notifSql->bind_param("iis", $hostId, $projectId, $message);
        $notifSql->execute();
    }
    
    echo json_encode([
        "status" => "success",
        "message" => "Permission request sent successfully"
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Database error: " . $conn->error
    ]);
}

$conn->close();
?>