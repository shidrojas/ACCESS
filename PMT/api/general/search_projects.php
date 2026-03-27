<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "db.php";

// Get search parameters
$UserID = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;
$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';

if ($UserID <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid UserID is required"]);
    exit;
}

if (empty($searchQuery)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Search query is required"]);
    exit;
}

// Validate if user exists
$userCheck = $conn->query("SELECT UserID FROM user WHERE UserID = $UserID");
if ($userCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Sanitize search query for SQL
$searchTerm = $conn->real_escape_string($searchQuery);
$searchPattern = "%$searchTerm%";

// Search projects where user is host or member, and matches search criteria
$sql = "
    SELECT DISTINCT
        p.ProjectID,
        p.ProjectName,
        p.Description,
        p.StartDate,
        p.EndDate,
        p.Status,
        p.Code,
        p.created_at,
        p.updated_at,
        pm.Role,
        pm.Join_Date,
        u.FirstName,
        u.LastName,
        u.Email as HostEmail
    FROM project p
    INNER JOIN project_members pm ON p.ProjectID = pm.ProjectID
    INNER JOIN user u ON p.UserID = u.UserID
    WHERE pm.UserID = $UserID
    AND (
        p.ProjectName LIKE '$searchPattern'
        OR p.Description LIKE '$searchPattern'
        OR u.FirstName LIKE '$searchPattern'
        OR u.LastName LIKE '$searchPattern'
        OR CONCAT(u.FirstName, ' ', u.LastName) LIKE '$searchPattern'
        OR p.Code LIKE '$searchPattern'
    )
    ORDER BY 
        CASE 
            WHEN p.ProjectName LIKE '$searchPattern' THEN 1
            WHEN u.FirstName LIKE '$searchPattern' OR u.LastName LIKE '$searchPattern' THEN 2
            WHEN p.Description LIKE '$searchPattern' THEN 3
            ELSE 4
        END,
        CASE 
            WHEN pm.Role = 'Host' THEN 1
            ELSE 2 
        END,
        p.updated_at DESC
";

$result = $conn->query($sql);

if ($result) {
    $projects = [];
    
    while ($row = $result->fetch_assoc()) {
        // Calculate time ago for created date
        $createdTime = strtotime($row['created_at']);
        $currentTime = time();
        $timeDiff = $currentTime - $createdTime;
        
        // Format time ago
        if ($timeDiff < 60) {
            $timeAgo = 'just now';
        } elseif ($timeDiff < 3600) {
            $minutes = floor($timeDiff / 60);
            $timeAgo = $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
        } elseif ($timeDiff < 86400) {
            $hours = floor($timeDiff / 3600);
            $timeAgo = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
        } elseif ($timeDiff < 2592000) {
            $days = floor($timeDiff / 86400);
            $timeAgo = $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
        } elseif ($timeDiff < 31536000) {
            $months = floor($timeDiff / 2592000);
            $timeAgo = $months . ' month' . ($months > 1 ? 's' : '') . ' ago';
        } else {
            $years = floor($timeDiff / 31536000);
            $timeAgo = $years . ' year' . ($years > 1 ? 's' : '') . ' ago';
        }
        
        // Truncate description if too long
        $description = $row['Description'];
        if (strlen($description) > 120) {
            $description = substr($description, 0, 120) . '...';
        }
        
        // Get host name
        $hostName = $row['FirstName'] . ' ' . $row['LastName'];
        
        $projects[] = [
            "ProjectID" => $row['ProjectID'],
            "ProjectName" => $row['ProjectName'],
            "Description" => $description,
            "FullDescription" => $row['Description'],
            "StartDate" => $row['StartDate'],
            "EndDate" => $row['EndDate'],
            "Status" => $row['Status'],
            "Code" => $row['Code'],
            "Role" => $row['Role'],
            "HostName" => $hostName,
            "HostEmail" => $row['HostEmail'],
            "TimeAgo" => $timeAgo,
            "CreatedAt" => $row['created_at'],
            "UpdatedAt" => $row['updated_at']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Search completed successfully",
        "search_query" => $searchQuery,
        "total_results" => count($projects),
        "projects" => $projects
    ]);
    
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>