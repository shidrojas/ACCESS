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

$taskId = isset($_GET['TaskID']) ? intval($_GET['TaskID']) : 0;

if (!$taskId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "TaskID is required"]);
    exit;
}

// Fetch comments with user info from your existing comment table
$sql = "
    SELECT 
        c.CommentID,
        c.TaskID,
        c.UserID,
        CONCAT(u.FirstName, ' ', u.LastName) as UserName,
        c.Content as Comment,
        c.created_at
    FROM comment c
    INNER JOIN user u ON c.UserID = u.UserID
    WHERE c.TaskID = $taskId
    ORDER BY c.created_at ASC
";

$result = $conn->query($sql);

$comments = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $comments[] = [
            "CommentID" => $row['CommentID'],
            "TaskID" => $row['TaskID'],
            "UserID" => $row['UserID'],
            "UserName" => $row['UserName'],
            "Comment" => $row['Comment'],
            "created_at" => $row['created_at'],
            "TimeAgo" => timeAgo($row['created_at'])
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
        return date('M j, Y', $time_ago);
    }
}

echo json_encode([
    "status" => "success",
    "comments" => $comments
]);

$conn->close();
?>