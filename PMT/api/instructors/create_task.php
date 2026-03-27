<?php
// create_task.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Log for debugging
error_log("Received task data: " . print_r($data, true));

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['ProjectID']) || empty($data['TaskName']) || empty($data['AssignedTo'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID, TaskName, and AssignedTo are required"]);
    exit;
}

// Get the user who is creating the task (should be sent from frontend)
$createdBy = isset($data['UserID']) ? intval($data['UserID']) : 0;
if (!$createdBy) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "UserID is required"]);
    exit;
}

$ProjectID = intval($data['ProjectID']);
$TaskName = $conn->real_escape_string(trim($data['TaskName']));
$Description = isset($data['Description']) ? $conn->real_escape_string(trim($data['Description'])) : '';
$Status = isset($data['Status']) ? $conn->real_escape_string(trim($data['Status'])) : 'To Do';
$StartDate = !empty($data['StartDate']) ? $conn->real_escape_string(trim($data['StartDate'])) : null;
$DueDate = !empty($data['DueDate']) ? $conn->real_escape_string(trim($data['DueDate'])) : null;
$Attachment = isset($data['Attachment']) ? $conn->real_escape_string(trim($data['Attachment'])) : null;

// Process assigned users - could be comma-separated string or array
$assignedIds = [];
if (is_array($data['AssignedTo'])) {
    $assignedIds = $data['AssignedTo'];
} else {
    $assignedIds = explode(',', $data['AssignedTo']);
}

// Validate project exists and get host info (optional)
$projectCheck = $conn->query("SELECT ProjectID FROM project WHERE ProjectID = $ProjectID");
if ($projectCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Project not found"]);
    exit;
}

// Validate each assigned user exists and is a member of the project
$validIds = [];
$invalidUsers = [];

foreach ($assignedIds as $userId) {
    $userId = intval(trim($userId));
    if ($userId <= 0) continue;
    
    $userCheck = $conn->query("
        SELECT u.UserID, u.FirstName, u.LastName, pm.Role 
        FROM user u
        INNER JOIN project_members pm ON u.UserID = pm.UserID
        WHERE u.UserID = $userId AND pm.ProjectID = $ProjectID
    ");
    
    if ($userCheck && $userCheck->num_rows > 0) {
        $validIds[] = $userId;
    } else {
        $invalidUsers[] = $userId;
    }
}

if (empty($validIds)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No valid users assigned to this project"]);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // REMOVED CreatedBy from the INSERT query - using your existing schema
    $sql = "INSERT INTO task (ProjectID, TaskName, Description, Attachment, Status, StartDate, DueDate) 
            VALUES ($ProjectID, '$TaskName', '$Description', " . ($Attachment ? "'$Attachment'" : "NULL") . ", '$Status', " . 
            ($StartDate ? "'$StartDate'" : "NULL") . ", " . ($DueDate ? "'$DueDate'" : "NULL") . ")";
    
    if (!$conn->query($sql)) {
        throw new Exception("Error inserting task: " . $conn->error);
    }
    
    $TaskID = $conn->insert_id;
    
    // Insert into task_assignees table
    $assignedUsers = [];
    foreach ($validIds as $userId) {
        // Get the user's role in the project to set can_update_status
        $roleCheck = $conn->query("SELECT Role FROM project_members WHERE UserID = $userId AND ProjectID = $ProjectID");
        $canUpdateStatus = 0;
        
        if ($roleCheck && $roleCheck->num_rows > 0) {
            $role = $roleCheck->fetch_assoc()['Role'];
            if ($role === 'Host' || $role === 'Co-Host') {
                $canUpdateStatus = 1;
            }
        }
        
        $insertAssignee = "INSERT INTO task_assignees (TaskID, UserID, can_update_status) VALUES ($TaskID, $userId, $canUpdateStatus)";
        if (!$conn->query($insertAssignee)) {
            throw new Exception("Error assigning user: " . $conn->error);
        }
        
        // Get user name for response
        $userQuery = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $userId");
        if ($userQuery && $userRow = $userQuery->fetch_assoc()) {
            $assignedUsers[] = [
                "UserID" => $userId,
                "Name" => $userRow['FirstName'] . ' ' . $userRow['LastName'],
                "FirstName" => $userRow['FirstName'],
                "LastName" => $userRow['LastName']
            ];
        }
        
        // Create notification for the assigned user
        $notificationMsg = "You have been assigned a new task: " . $TaskName;
        $notifSql = "INSERT INTO notification (UserID, Message, Type, created_at) 
                     VALUES ($userId, '$notificationMsg', 'task_assigned', NOW())";
        $conn->query($notifSql);
    }
    
    // Log activity for task creation - USE THE ACTUAL USER WHO CREATED THE TASK
    $action = "Created task: " . $TaskName;
    $desc = "Task created with " . count($validIds) . " assignee(s)";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($createdBy, $ProjectID, '$action', '$desc', NOW())";
    if (!$conn->query($logSql)) {
        error_log("Failed to log activity: " . $conn->error);
        // Don't throw exception, just log it
    }
    
    // Commit transaction
    $conn->commit();
    
    // Get the creator's info for the response
    $creatorQuery = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $createdBy");
    $creator = $creatorQuery->fetch_assoc();
    $creatorName = $creator['FirstName'] . ' ' . $creator['LastName'];
    
    // Get the creator's role in the project
    $creatorRoleQuery = $conn->query("SELECT Role FROM project_members WHERE UserID = $createdBy AND ProjectID = $ProjectID");
    $creatorRole = $creatorRoleQuery->fetch_assoc()['Role'] ?? 'Member';
    
    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "message" => "Task created successfully",
        "task" => [
            "TaskID" => $TaskID,
            "ProjectID" => $ProjectID,
            "TaskName" => $TaskName,
            "Description" => $Description,
            "Status" => $Status,
            "StartDate" => $StartDate,
            "DueDate" => $DueDate,
            "Attachment" => $Attachment,
            "AssignedTo" => $assignedUsers,
            "AssignedToIds" => $validIds,
            "AssignedToNames" => array_column($assignedUsers, 'Name'),
            "created_at" => date('Y-m-d H:i:s'),
            "created_by" => [
                "UserID" => $createdBy,
                "Name" => $creatorName,
                "Role" => $creatorRole
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

$conn->close();
?>