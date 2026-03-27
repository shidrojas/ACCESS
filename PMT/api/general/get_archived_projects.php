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

require_once "../db.php";

// Get UserID from query parameters
$UserID = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;
$status = isset($_GET['status']) ? $_GET['status'] : 'Active'; // Default to Active projects

if ($UserID <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid UserID is required"]);
    exit;
}

// Validate if user exists
$userCheck = $conn->query("SELECT UserID FROM user WHERE UserID = $UserID");
if ($userCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Build the SQL query based on status filter
$sql = "
    SELECT 
        p.ProjectID,
        p.ProjectName,
        p.Description,
        p.StartDate,
        p.EndDate,
        p.Status,
        p.Code,
        p.color,
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
";

// Add status filter if provided
if ($status && $status !== 'all') {
    $sql .= " AND p.Status = '$status'";
}

$sql .= " ORDER BY 
        CASE 
            WHEN pm.Role = 'Host' THEN 1
            ELSE 2 
        END,
        p.created_at DESC";

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
        
        // Use the color from database, or provide a default if not set
        $color = !empty($row['color']) ? $row['color'] : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
        
        $projects[] = [
            "ProjectID" => $row['ProjectID'],
            "ProjectName" => $row['ProjectName'],
            "Description" => $description,
            "FullDescription" => $row['Description'],
            "StartDate" => $row['StartDate'],
            "EndDate" => $row['EndDate'],
            "Status" => $row['Status'],
            "Code" => $row['Code'],
            "color" => $color,
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
        "message" => "Projects retrieved successfully",
        "projects" => $projects,
        "count" => count($projects)
    ]);
    
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>