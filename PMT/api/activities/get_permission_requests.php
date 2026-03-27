<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

$projectId = isset($_GET['ProjectID']) ? intval($_GET['ProjectID']) : 0;

if (!$projectId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID is required"]);
    exit;
}

// Fetch all permission requests (Pending status) from task_assignees
$sql = "
    SELECT 
        ta.id as RequestID,
        ta.TaskID,
        ta.UserID,
        ta.can_update_status as PermissionStatus,
        ta.assigned_at,
        t.TaskName,
        t.Status as CurrentTaskStatus,
        CONCAT(u.FirstName, ' ', u.LastName) as RequesterName,
        u.Email as RequesterEmail,
        pm.Role as RequesterRole
    FROM task_assignees ta
    INNER JOIN task t ON ta.TaskID = t.TaskID
    INNER JOIN user u ON ta.UserID = u.UserID
    INNER JOIN project_members pm ON u.UserID = pm.UserID AND pm.ProjectID = t.ProjectID
    WHERE t.ProjectID = $projectId 
    AND ta.can_update_status = 'Pending'
    ORDER BY ta.assigned_at DESC
";

$result = $conn->query($sql);

$requests = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $requests[] = [
            "id" => "req-" . $row['RequestID'],
            "taskId" => $row['TaskID'],
            "taskName" => $row['TaskName'],
            "userId" => $row['UserID'],
            "requester" => $row['RequesterName'],
            "requesterEmail" => $row['RequesterEmail'],
            "requesterRole" => $row['RequesterRole'],
            "currentStatus" => $row['CurrentTaskStatus'],
            "requestedStatus" => "For Review", // Always requesting for For Review
            "permissionStatus" => $row['PermissionStatus'],
            "requestedAt" => $row['assigned_at'],
            "timeAgo" => timeAgo($row['assigned_at'])
        ];
    }
}

function timeAgo($timestamp) {
    $time_ago = strtotime($timestamp);
    $current_time = time();
    $time_difference = $current_time - $time_ago;
    $seconds = $time_difference;
    
    $minutes = round($seconds / 60);
    $hours = round($seconds / 3600);
    $days = round($seconds / 86400);
    
    if ($seconds <= 60) {
        return "Just now";
    } else if ($minutes <= 60) {
        return ($minutes == 1) ? "1 minute ago" : "$minutes minutes ago";
    } else if ($hours <= 24) {
        return ($hours == 1) ? "1 hour ago" : "$hours hours ago";
    } else if ($days <= 7) {
        return ($days == 1) ? "yesterday" : "$days days ago";
    } else {
        return date("M j, Y", strtotime($timestamp));
    }
}

echo json_encode([
    "status" => "success",
    "requests" => $requests
]);

$conn->close();
?>