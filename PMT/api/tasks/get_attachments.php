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

// Fetch attachments with user info
$sql = "
    SELECT 
        ta.AttachmentID,
        ta.TaskID,
        ta.UserID,
        CONCAT(u.FirstName, ' ', u.LastName) as UploadedBy,
        ta.FileName,
        ta.FilePath,
        ta.FileSize,
        ta.FileType,
        ta.uploaded_at
    FROM task_attachments ta
    INNER JOIN user u ON ta.UserID = u.UserID
    WHERE ta.TaskID = $taskId
    ORDER BY ta.uploaded_at DESC
";

$result = $conn->query($sql);

$attachments = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Format file size
        $fileSize = $row['FileSize'];
        $formattedSize = '';
        if ($fileSize < 1024) {
            $formattedSize = $fileSize . ' B';
        } elseif ($fileSize < 1048576) {
            $formattedSize = round($fileSize / 1024, 1) . ' KB';
        } else {
            $formattedSize = round($fileSize / 1048576, 1) . ' MB';
        }
        
        $attachments[] = [
            "AttachmentID" => $row['AttachmentID'],
            "TaskID" => $row['TaskID'],
            "UserID" => $row['UserID'],
            "UploadedBy" => $row['UploadedBy'],
            "FileName" => $row['FileName'],
            "FilePath" => 'http://localhost/PMT/api/' . $row['FilePath'],
            "FileSize" => $row['FileSize'],
            "FormattedSize" => $formattedSize,
            "FileType" => $row['FileType'],
            "uploaded_at" => $row['uploaded_at'],
            "TimeAgo" => timeAgo($row['uploaded_at'])
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
    $weeks = round($seconds / 604800);
    
    if ($seconds <= 60) {
        return "Just now";
    } else if ($minutes <= 60) {
        return ($minutes == 1) ? "1 minute ago" : "$minutes minutes ago";
    } else if ($hours <= 24) {
        return ($hours == 1) ? "1 hour ago" : "$hours hours ago";
    } else if ($days <= 7) {
        return ($days == 1) ? "yesterday" : "$days days ago";
    } else {
        return ($weeks == 1) ? "1 week ago" : "$weeks weeks ago";
    }
}

echo json_encode([
    "status" => "success",
    "attachments" => $attachments
]);

$conn->close();
?>