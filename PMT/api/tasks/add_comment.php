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

$taskId = intval($data['TaskID'] ?? 0);
$userId = intval($data['UserID'] ?? 0);
$comment = $conn->real_escape_string(trim($data['Comment'] ?? ''));

if (!$taskId || !$userId || empty($comment)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "TaskID, UserID, and Comment are required"]);
    exit;
}

// Verify task exists and get project info
$taskCheck = $conn->query("
    SELECT t.*, p.ProjectID, p.UserID as HostID 
    FROM task t
    INNER JOIN project p ON t.ProjectID = p.ProjectID
    WHERE t.TaskID = $taskId
");

if ($taskCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

$taskData = $taskCheck->fetch_assoc();
$projectId = $taskData['ProjectID'];
$taskName = $taskData['TaskName'];

// Verify user is a project member
$memberCheck = $conn->query("
    SELECT * FROM project_members 
    WHERE ProjectID = $projectId AND UserID = $userId
");

if ($memberCheck->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have access to this task"]);
    exit;
}

// Insert comment using your existing comment table
$insertStmt = $conn->prepare("
    INSERT INTO comment (TaskID, UserID, Content, created_at) 
    VALUES (?, ?, ?, NOW())
");
$insertStmt->bind_param("iis", $taskId, $userId, $comment);

if ($insertStmt->execute()) {
    $commentId = $conn->insert_id;
    
    // Get user name for response
    $userQuery = $conn->query("SELECT CONCAT(FirstName, ' ', LastName) as UserName FROM user WHERE UserID = $userId");
    $userName = $userQuery->fetch_assoc()['UserName'];
    
    // Log activity
    $action = "Added comment to task";
    $desc = "Commented on task: $taskName";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    // Create notifications for task assignees (using your notification table)
    $assigneesQuery = $conn->query("
        SELECT UserID FROM task_assignees WHERE TaskID = $taskId AND UserID != $userId
    ");
    
    while ($assignee = $assigneesQuery->fetch_assoc()) {
        $notifMsg = "$userName commented on task: $taskName";
        $notifSql = "INSERT INTO notification (UserID, Message, Type, created_at) 
                     VALUES ({$assignee['UserID']}, '$notifMsg', 'comment_added', NOW())";
        $conn->query($notifSql);
    }
    
    echo json_encode([
        "status" => "success",
        "message" => "Comment added successfully",
        "comment" => [
            "CommentID" => $commentId,
            "TaskID" => $taskId,
            "UserID" => $userId,
            "UserName" => $userName,
            "Comment" => $comment,
            "created_at" => date('Y-m-d H:i:s'),
            "TimeAgo" => "Just now"
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to add comment"]);
}

$insertStmt->close();
$conn->close();
?>