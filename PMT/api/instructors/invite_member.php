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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$projectId = $input['ProjectID'] ?? 0;
$userId = $input['UserID'] ?? 0;
$invitedUserId = $input['InvitedUserID'] ?? 0;
$role = $input['Role'] ?? 'Member';

if (!$projectId || !$userId || !$invitedUserId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Check if current user is host
$checkHost = $conn->query("
    SELECT Role FROM project_members 
    WHERE ProjectID = $projectId AND UserID = $userId
");

if ($checkHost->num_rows === 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You are not a member of this project"]);
    exit;
}

$userRole = $checkHost->fetch_assoc()['Role'];
if ($userRole !== 'Host') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Only project hosts can invite members"]);
    exit;
}

// Check if invited user exists and is not admin
$checkUser = $conn->query("
    SELECT UserID, CONCAT(FirstName, ' ', LastName) as Name 
    FROM user 
    WHERE UserID = $invitedUserId AND Status = 'Active' AND role != 'admin'
");

if ($checkUser->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found or is not available for invitation"]);
    exit;
}

$invitedUser = $checkUser->fetch_assoc();
$invitedUserName = $invitedUser['Name'];

// Check if user is already a member
$checkMember = $conn->query("
    SELECT * FROM project_members 
    WHERE ProjectID = $projectId AND UserID = $invitedUserId
");

if ($checkMember->num_rows > 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "User is already a member of this project"]);
    exit;
}

// Get project name
$projectQuery = $conn->query("SELECT ProjectName FROM project WHERE ProjectID = $projectId");
$projectName = $projectQuery->fetch_assoc()['ProjectName'];

// Get inviter name
$inviterQuery = $conn->query("SELECT CONCAT(FirstName, ' ', LastName) as Name FROM user WHERE UserID = $userId");
$inviterName = $inviterQuery->fetch_assoc()['Name'];

// Add user to project
$insertStmt = $conn->prepare("
    INSERT INTO project_members (ProjectID, UserID, Role, Join_Date) 
    VALUES (?, ?, ?, NOW())
");
$insertStmt->bind_param("iis", $projectId, $invitedUserId, $role);

if ($insertStmt->execute()) {
    // Create notification for invited user
    $notificationStmt = $conn->prepare("
        INSERT INTO notification (UserID, Message, Type, created_at) 
        VALUES (?, ?, 'member_invited', NOW())
    ");
    $message = "$inviterName has added you to the project: $projectName";
    $notificationStmt->bind_param("is", $invitedUserId, $message);
    $notificationStmt->execute();
    $notificationStmt->close();
    
    // Log activity for inviting member
    $action = "Invited member to project";
    $desc = "Invited $invitedUserName as $role";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    echo json_encode([
        "status" => "success",
        "message" => "Member invited successfully"
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$insertStmt->close();
$conn->close();
?>