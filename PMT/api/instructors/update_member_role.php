<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
$targetUserId = $input['TargetUserID'] ?? 0;
$newRole = $input['NewRole'] ?? '';

if (!$projectId || !$userId || !$targetUserId || !$newRole) {
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
    echo json_encode(["status" => "error", "message" => "Only project hosts can change member roles"]);
    exit;
}

// Check if target user exists in project
$checkTarget = $conn->query("
    SELECT pm.*, CONCAT(u.FirstName, ' ', u.LastName) as UserName 
    FROM project_members pm
    INNER JOIN user u ON pm.UserID = u.UserID
    WHERE pm.ProjectID = $projectId AND pm.UserID = $targetUserId
");

if ($checkTarget->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Target user not found in project"]);
    exit;
}

$targetData = $checkTarget->fetch_assoc();
$targetUserName = $targetData['UserName'];
$oldRole = $targetData['Role'];

// Prevent changing host's role
if ($targetData['Role'] === 'Host') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Cannot change host's role"]);
    exit;
}

$updateStmt = $conn->prepare("UPDATE project_members SET Role = ? WHERE ProjectID = ? AND UserID = ?");
$updateStmt->bind_param("sii", $newRole, $projectId, $targetUserId);

if ($updateStmt->execute()) {
    // Log activity for role update
    $action = "Updated member role";
    $desc = "Changed $targetUserName from $oldRole to $newRole";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$action', '$desc', NOW())";
    $conn->query($logSql);
    
    echo json_encode([
        "status" => "success",
        "message" => "Member role updated successfully"
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$updateStmt->close();
$conn->close();
?>