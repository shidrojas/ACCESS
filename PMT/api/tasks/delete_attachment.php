<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
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

$attachmentId = intval($data['AttachmentID'] ?? 0);
$userId = intval($data['UserID'] ?? 0);

if (!$attachmentId || !$userId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "AttachmentID and UserID are required"]);
    exit;
}

// Get attachment details
$attachmentQuery = $conn->query("
    SELECT ta.*, t.ProjectID, t.TaskName 
    FROM task_attachments ta
    INNER JOIN task t ON ta.TaskID = t.TaskID
    WHERE ta.AttachmentID = $attachmentId
");

if ($attachmentQuery->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Attachment not found"]);
    exit;
}

$attachment = $attachmentQuery->fetch_assoc();
$taskId = $attachment['TaskID'];
$projectId = $attachment['ProjectID'];
$fileName = $attachment['FileName'];
$filePath = __DIR__ . '/../' . $attachment['FilePath'];

// Check if user has permission (must be task creator or host/co-host)
$permissionCheck = $conn->query("
    SELECT pm.Role 
    FROM project_members pm
    WHERE pm.ProjectID = $projectId AND pm.UserID = $userId
");

if ($permissionCheck->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission"]);
    exit;
}

$userRole = $permissionCheck->fetch_assoc()['Role'];
$isHostOrCoHost = ($userRole === 'Host' || $userRole === 'Co-Host');
$isCreator = ($attachment['UserID'] == $userId);

if (!$isHostOrCoHost && !$isCreator) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission to delete this attachment"]);
    exit;
}

// Delete file from server
if (file_exists($filePath)) {
    unlink($filePath);
}

// Delete from database
$deleteStmt = $conn->prepare("DELETE FROM task_attachments WHERE AttachmentID = ?");
$deleteStmt->bind_param("i", $attachmentId);

if ($deleteStmt->execute()) {
    // Log activity
    $action = "Removed attachment from task";
    $desc = "Deleted file: $fileName";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    echo json_encode([
        "status" => "success",
        "message" => "Attachment deleted successfully"
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to delete attachment"]);
}

$deleteStmt->close();
$conn->close();
?>