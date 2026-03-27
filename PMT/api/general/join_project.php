<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['UserID']) || empty($data['Code'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "UserID and Code are required"]);
    exit;
}

$UserID = intval($data['UserID']);
$Code = $conn->real_escape_string(trim($data['Code']));

// Validate if user exists
$userCheck = $conn->query("SELECT UserID, FirstName, LastName FROM user WHERE UserID = $UserID");
if ($userCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

$userData = $userCheck->fetch_assoc();
$userName = $userData['FirstName'] . ' ' . $userData['LastName'];

// Check if project exists with the given code
$projectCheck = $conn->query("
    SELECT p.ProjectID, p.ProjectName, p.Description, p.Status, 
           u.FirstName, u.LastName, u.UserID as HostID
    FROM project p 
    INNER JOIN user u ON p.UserID = u.UserID 
    WHERE p.Code = '$Code'
");

if ($projectCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Project not found with this code"]);
    exit;
}

$projectData = $projectCheck->fetch_assoc();
$ProjectID = $projectData['ProjectID'];
$ProjectName = $projectData['ProjectName'];
$HostName = $projectData['FirstName'] . ' ' . $projectData['LastName'];
$HostID = $projectData['HostID'];

// Check if project is active
if ($projectData['Status'] !== 'Active') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "This project is not active and cannot be joined"]);
    exit;
}

// Check if user is already a member of this project (including pending members)
$memberCheck = $conn->query("
    SELECT ID, Role FROM project_members 
    WHERE UserID = $UserID AND ProjectID = $ProjectID
");

if ($memberCheck->num_rows > 0) {
    $memberData = $memberCheck->fetch_assoc();
    $role = $memberData['Role'];
    
    if ($role === 'Pending') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Your membership request is pending approval"]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "You are already a member of this project"]);
    }
    exit;
}

// Check if user is trying to join their own project (as host)
if ($UserID == $HostID) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "You are the host of this project"]);
    exit;
}

// Insert user as project member with Pending role
$sql = "INSERT INTO project_members (UserID, ProjectID, Role, Join_Date) 
        VALUES ($UserID, $ProjectID, 'Pending', NOW())";

if ($conn->query($sql)) {
    $memberID = $conn->insert_id;
    
    // Create notification for project host about pending request
    $notificationMessage = "$userName has requested to join your project: $ProjectName";
    $conn->query("
        INSERT INTO notification (UserID, Message, Type, is_read, created_at) 
        VALUES ($HostID, '$notificationMessage', 'join_request', 0, NOW())
    ");
    
    // Log activity for joining request
    $action = "Requested to join project";
    $desc = "User requested to join as member (pending approval)";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($UserID, $ProjectID, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Join request sent successfully. Waiting for host approval.",
        "project" => [
            "ProjectID" => $ProjectID,
            "ProjectName" => $ProjectName,
            "Description" => $projectData['Description'],
            "HostName" => $HostName,
            "Role" => "Pending",
            "JoinDate" => date('Y-m-d H:i:s'),
            "Status" => "Awaiting Approval"
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to send join request: " . $conn->error]);
}

$conn->close();
?>