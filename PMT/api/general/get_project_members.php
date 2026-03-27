<?php
// get_project_members.php
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

// Get ProjectID from query parameters
$ProjectID = isset($_GET['ProjectID']) ? intval($_GET['ProjectID']) : 0;

if ($ProjectID <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid ProjectID is required"]);
    exit;
}

// Fetch project members
$sql = "
    SELECT 
        u.UserID,
        u.FirstName,
        u.LastName,
        u.Email,
        u.Photo,
        u.role,
        pm.Role as ProjectRole,
        pm.Join_Date
    FROM project_members pm
    INNER JOIN user u ON pm.UserID = u.UserID
    WHERE pm.ProjectID = $ProjectID AND u.Status = 'Active'
    ORDER BY 
        CASE 
            WHEN pm.Role = 'Host' THEN 1
            ELSE 2 
        END,
        u.FirstName ASC
";

$result = $conn->query($sql);

if ($result) {
    $members = [];
    
    while ($row = $result->fetch_assoc()) {
        $members[] = [
            "UserID" => $row['UserID'],
            "FirstName" => $row['FirstName'],
            "LastName" => $row['LastName'],
            "FullName" => $row['FirstName'] . ' ' . $row['LastName'],
            "Email" => $row['Email'],
            "Photo" => $row['Photo'],
            "Role" => $row['role'],
            "ProjectRole" => $row['ProjectRole'],
            "JoinDate" => $row['Join_Date']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Project members retrieved successfully",
        "members" => $members,
        "count" => count($members)
    ]);
    
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>