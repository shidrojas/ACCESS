<?php
// Enable error logging but don't display errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

require_once "../db.php";

// Get POST data
$input = file_get_contents("php://input");
if (!$input) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$data = json_decode($input, true);
if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON data"]);
    exit;
}

$taskId = isset($data['TaskID']) ? intval($data['TaskID']) : 0;
$userId = isset($data['UserID']) ? intval($data['UserID']) : 0;
$targetUserId = isset($data['TargetUserID']) ? intval($data['TargetUserID']) : 0;
$action = isset($data['action']) ? $conn->real_escape_string($data['action']) : '';

if (!$taskId || !$userId || !$targetUserId || !$action) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // First get the project ID from the task
    $projectQuery = $conn->query("SELECT ProjectID FROM task WHERE TaskID = $taskId");
    if (!$projectQuery || $projectQuery->num_rows == 0) {
        throw new Exception("Task not found");
    }
    $projectId = $projectQuery->fetch_assoc()['ProjectID'];

    // Check if current user is host of the project
    $checkHost = $conn->query("
        SELECT Role 
        FROM project_members 
        WHERE UserID = $userId AND ProjectID = $projectId
    ");

    if (!$checkHost || $checkHost->num_rows == 0) {
        throw new Exception("You are not a member of this project");
    }

    $userRole = $checkHost->fetch_assoc()['Role'];
    if ($userRole !== 'Host') {
        throw new Exception("Only project hosts can approve/reject permission requests");
    }

    // Set the new permission status based on action
    if ($action === 'reject') {
        // Set is_rejected = 1 and can_update_status = 'No'
        $updateSql = "UPDATE task_assignees 
                      SET can_update_status = 'No', is_rejected = 1 
                      WHERE TaskID = $taskId AND UserID = $targetUserId";
    } else {
        // For approval, set can_update_status = 'Yes' and is_rejected = 0
        $updateSql = "UPDATE task_assignees 
                      SET can_update_status = 'Yes', is_rejected = 0 
                      WHERE TaskID = $taskId AND UserID = $targetUserId";
    }
    
    if (!$conn->query($updateSql)) {
        throw new Exception("Failed to update permission: " . $conn->error);
    }

    // If approved, also update the task status to "For Review"
    if ($action === 'approve') {
        $updateTaskSql = "UPDATE task 
                          SET Status = 'For Review', 
                              updated_at = NOW(),
                              UpdatedBy = $userId 
                          WHERE TaskID = $taskId";
        
        if (!$conn->query($updateTaskSql)) {
            throw new Exception("Failed to update task status: " . $conn->error);
        }
    }

    // Get user names for activity log
    $hostQuery = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $userId");
    $host = $hostQuery->fetch_assoc();
    $hostName = $host['FirstName'] . ' ' . $host['LastName'];
    
    $targetQuery = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $targetUserId");
    $target = $targetQuery->fetch_assoc();
    $targetName = $target['FirstName'] . ' ' . $target['LastName'];
    
    $taskQuery = $conn->query("SELECT TaskName FROM task WHERE TaskID = $taskId");
    $task = $taskQuery->fetch_assoc();
    $taskName = $task['TaskName'];
    
    // Log to activity_logs
    $actionText = ($action === 'approve') ? 'approved' : 'rejected';
    $logAction = ucfirst($actionText) . " permission request";
    $description = "$hostName $actionText permission request from $targetName for task: $taskName";
    
    $escapedDescription = $conn->real_escape_string($description);
    
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$logAction', '$escapedDescription', NOW())";
    
    if (!$conn->query($logSql)) {
        error_log("Failed to log activity: " . $conn->error);
    }
    
    // Create notification for the requester
    if ($action === 'approve') {
        $notifMessage = "Your permission request for task '" . addslashes($taskName) . "' has been approved by $hostName. The task has been moved to For Review.";
    } else {
        $notifMessage = "Your permission request for task '" . addslashes($taskName) . "' has been rejected by $hostName.";
    }
    
    $escapedNotifMessage = $conn->real_escape_string($notifMessage);
    
    $notifSql = "INSERT INTO notification (UserID, ProjectID, Message, Type, is_read, created_at) 
                 VALUES ($targetUserId, $projectId, '$escapedNotifMessage', 'permission_response', 0, NOW())";
    
    if (!$conn->query($notifSql)) {
        error_log("Failed to create notification: " . $conn->error);
    }

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        "status" => "success",
        "message" => "Permission request " . $actionText . " successfully",
        "task_updated" => ($action === 'approve')
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Error in update_task_assignee_permission.php: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

$conn->close();
?>