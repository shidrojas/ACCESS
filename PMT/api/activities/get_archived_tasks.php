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
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

if (!$projectId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID is required"]);
    exit;
}

// Fetch archived tasks with updated by user info
$sql = "
    SELECT 
        t.TaskID,
        t.TaskName,
        t.Description,
        t.Status,
        t.DueDate,
        t.updated_at,
        t.created_at,
        CONCAT(u.FirstName, ' ', u.LastName) as UpdatedBy,
        u.UserID as UpdatedByID,
        u.Email as UpdatedByEmail
    FROM task t
    LEFT JOIN user u ON t.UpdatedBy = u.UserID
    WHERE t.ProjectID = ? AND t.Status = 'Archived'
    ORDER BY t.updated_at DESC, t.created_at DESC
    LIMIT ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $projectId, $limit);
$stmt->execute();
$result = $stmt->get_result();

$archivedTasks = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $archiveDate = $row['updated_at'] ?? $row['created_at'];
        
        $archivedTasks[] = [
            "TaskID" => $row['TaskID'],
            "TaskName" => $row['TaskName'],
            "Description" => $row['Description'],
            "DueDate" => $row['DueDate'],
            "ArchivedBy" => $row['UpdatedBy'] ?? "Unknown",
            "ArchivedByID" => $row['UpdatedByID'],
            "ArchivedByEmail" => $row['UpdatedByEmail'],
            "ArchivedDate" => $archiveDate,
            "TimeAgo" => timeAgo($archiveDate)
        ];
    }
}

function timeAgo($timestamp) {
    if (!$timestamp) return "Unknown";
    
    $time_ago = strtotime($timestamp);
    $current_time = time();
    $time_difference = $current_time - $time_ago;
    $seconds = $time_difference;
    
    $minutes = round($seconds / 60);
    $hours = round($seconds / 3600);
    $days = round($seconds / 86400);
    $weeks = round($seconds / 604800);
    $months = round($seconds / 2629440);
    $years = round($seconds / 31553280);
    
    if ($seconds <= 60) {
        return "Just Now";
    } else if ($minutes <= 60) {
        return ($minutes == 1) ? "1 minute ago" : "$minutes minutes ago";
    } else if ($hours <= 24) {
        return ($hours == 1) ? "1 hour ago" : "$hours hours ago";
    } else if ($days <= 7) {
        return ($days == 1) ? "yesterday" : "$days days ago";
    } else if ($weeks <= 4.3) {
        return ($weeks == 1) ? "1 week ago" : "$weeks weeks ago";
    } else if ($months <= 12) {
        return ($months == 1) ? "1 month ago" : "$months months ago";
    } else {
        return ($years == 1) ? "1 year ago" : "$years years ago";
    }
}

echo json_encode([
    "status" => "success",
    "archived_tasks" => $archivedTasks
]);

$stmt->close();
$conn->close();
?>