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
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;

if (!$projectId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID is required"]);
    exit;
}

// Fetch activities with user details and project role
$sql = "SELECT 
            al.LogID,
            al.UserID,
            CONCAT(u.FirstName, ' ', u.LastName) as UserName,
            u.FirstName,
            u.LastName,
            u.Email,
            u.Photo,
            -- Get the user's role in this specific project from project_members
            (SELECT pm.Role 
             FROM project_members pm 
             WHERE pm.UserID = u.UserID AND pm.ProjectID = al.ProjectID 
             LIMIT 1) as ProjectRole,
            al.ProjectID,
            (SELECT p.ProjectName FROM project p WHERE p.ProjectID = al.ProjectID) as ProjectName,
            al.Action,
            al.Description,
            al.LogDate
        FROM activity_logs al
        INNER JOIN user u ON al.UserID = u.UserID
        WHERE al.ProjectID = $projectId
        ORDER BY al.LogDate DESC
        LIMIT $limit";

$result = $conn->query($sql);

$activities = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Format the role display
        $displayRole = '';
        if ($row['ProjectRole'] === 'Host') {
            $displayRole = 'Host';
        } elseif ($row['ProjectRole'] === 'Co-Host') {
            $displayRole = 'Co-Host';
        } elseif ($row['ProjectRole'] === 'Member') {
            $displayRole = 'Member';
        } else {
            $displayRole = 'Member'; // Default fallback
        }
        
        $activities[] = [
            "LogID" => $row['LogID'],
            "UserID" => $row['UserID'],
            "UserName" => $row['UserName'],
            "FirstName" => $row['FirstName'],
            "LastName" => $row['LastName'],
            "Email" => $row['Email'],
            "UserRole" => $displayRole, // This will now show Host/Co-Host/Member correctly
            "ProjectID" => $row['ProjectID'],
            "ProjectName" => $row['ProjectName'],
            "Action" => $row['Action'],
            "Description" => $row['Description'],
            "LogDate" => $row['LogDate'],
            "TimeAgo" => timeAgo($row['LogDate'])
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
    "activities" => $activities
]);

$conn->close();
?>