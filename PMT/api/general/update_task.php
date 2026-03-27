<?php
// update_task.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, PATCH, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Get PUT/PATCH data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

error_log("Received task update: " . print_r($data, true));

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or invalid JSON"]);
    exit;
}

// Validate required fields
if (empty($data['TaskID']) || empty($data['ProjectID'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "TaskID and ProjectID are required"]);
    exit;
}

$TaskID = intval($data['TaskID']);
$ProjectID = intval($data['ProjectID']);
$UserID = isset($data['UserID']) ? intval($data['UserID']) : 0;

if (!$UserID) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "UserID is required"]);
    exit;
}

// Check if task exists and belongs to project
$taskCheck = $conn->query("SELECT * FROM task WHERE TaskID = $TaskID AND ProjectID = $ProjectID");
if ($taskCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

$originalTask = $taskCheck->fetch_assoc();

// Check if user has permission (must be host/co-host or assigned to task)
$permissionCheck = $conn->query("
    SELECT 
        (SELECT COUNT(*) FROM project_members 
         WHERE ProjectID = $ProjectID AND UserID = $UserID AND Role IN ('Host', 'Co-Host')) as isHostOrCoHost,
        (SELECT COUNT(*) FROM task_assignees 
         WHERE TaskID = $TaskID AND UserID = $UserID AND can_update_status = 'Yes') as canUpdateStatus,
        (SELECT COUNT(*) FROM task_assignees 
         WHERE TaskID = $TaskID AND UserID = $UserID) as isAssigned
");

$permResult = $permissionCheck->fetch_assoc();
$isHostOrCoHost = $permResult['isHostOrCoHost'] > 0;
$canUpdateStatus = $permResult['canUpdateStatus'] > 0;
$isAssigned = $permResult['isAssigned'] > 0;

// Special case: Assigned users can move from 'To Do' to 'In Progress' without permission
// This is the auto-move functionality that should ALWAYS work for assigned users
$isAllowedAutoMove = false;
if ($isAssigned && isset($data['Status']) && $originalTask['Status'] === 'To Do' && $data['Status'] === 'In Progress') {
    $isAllowedAutoMove = true;
}

// Permission logic:
// 1. Host/Co-Host can always update ANY status
// 2. Users with can_update_status = 'Yes' can update status from ANY status
// 3. Assigned users can auto-move from To Do to In Progress (even if can_update_status = 'No')
if (!$isHostOrCoHost && !$canUpdateStatus && !$isAllowedAutoMove) {
    http_response_code(403);
    echo json_encode([
        "status" => "error", 
        "message" => "You don't have permission to update this task. Only hosts, co-hosts, or assignees with approved permission can update tasks."
    ]);
    exit;
}

// Get user name for activity log
$userInfo = $conn->query("SELECT FirstName, LastName FROM user WHERE UserID = $UserID")->fetch_assoc();
$userName = $userInfo['FirstName'] . ' ' . $userInfo['LastName'];

// Start transaction
$conn->begin_transaction();

try {
    // Build update query for task table
    $updateFields = [];
    $changes = []; // Track changes for activity logging

    // Task Name
    if (isset($data['TaskName']) && !empty(trim($data['TaskName'])) && $data['TaskName'] != $originalTask['TaskName']) {
        $TaskName = $conn->real_escape_string(trim($data['TaskName']));
        $updateFields[] = "TaskName = '$TaskName'";
        $changes[] = "renamed from '{$originalTask['TaskName']}' to '$TaskName'";
    }

    // Description
    if (isset($data['Description']) && $data['Description'] != $originalTask['Description']) {
        $Description = $conn->real_escape_string(trim($data['Description']));
        $updateFields[] = "Description = '$Description'";
        $changes[] = "updated description";
    }

    // Status - Handle Archived status and completed_at
    if (isset($data['Status']) && $data['Status'] != $originalTask['Status']) {
        $allowedStatuses = ['To Do', 'In Progress', 'For Review', 'Done', 'Archived'];
        $Status = $conn->real_escape_string(trim($data['Status']));
        if (in_array($Status, $allowedStatuses)) {
            $updateFields[] = "Status = '$Status'";
            
            // Handle completed_at timestamp
            if ($Status === 'Done' && $originalTask['Status'] !== 'Done') {
                // Task is being marked as Done - set completed_at to NOW()
                $updateFields[] = "completed_at = NOW()";
                $changes[] = "task completed";
            } else if ($originalTask['Status'] === 'Done' && $Status !== 'Done') {
                // Task is being moved from Done to another status - clear completed_at
                $updateFields[] = "completed_at = NULL";
                $changes[] = "task reopened from Done";
            }
            
            // Escape the status strings properly for the description
            $oldStatus = $conn->real_escape_string($originalTask['Status']);
            $newStatus = $conn->real_escape_string($Status);
            $changes[] = "status changed from '$oldStatus' to '$newStatus'";
        }
    }

    // Dates - handle datetime format
    if (isset($data['StartDate'])) {
        if (empty($data['StartDate'])) {
            $updateFields[] = "StartDate = NULL";
            $changes[] = "removed start date";
        } else if ($data['StartDate'] != $originalTask['StartDate']) {
            $StartDate = $conn->real_escape_string(trim($data['StartDate']));
            // Accept both date and datetime formats
            if (preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/', $StartDate)) {
                // Convert to proper datetime format
                $StartDate = str_replace('T', ' ', $StartDate);
                if (strlen($StartDate) == 10) {
                    $StartDate .= ' 00:00:00';
                }
                $updateFields[] = "StartDate = '$StartDate'";
                $oldStart = $originalTask['StartDate'] ? $originalTask['StartDate'] : 'none';
                $newStart = $StartDate;
                $changes[] = "start date changed from '$oldStart' to '$newStart'";
            } else {
                error_log("Invalid start date format: " . $StartDate);
            }
        }
    }

    if (isset($data['DueDate'])) {
        if (empty($data['DueDate'])) {
            $updateFields[] = "DueDate = NULL";
            $changes[] = "removed due date";
        } else if ($data['DueDate'] != $originalTask['DueDate']) {
            $DueDate = $conn->real_escape_string(trim($data['DueDate']));
            // Accept both date and datetime formats
            if (preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/', $DueDate)) {
                // Convert to proper datetime format
                $DueDate = str_replace('T', ' ', $DueDate);
                if (strlen($DueDate) == 10) {
                    $DueDate .= ' 00:00:00';
                }
                $updateFields[] = "DueDate = '$DueDate'";
                $oldDue = $originalTask['DueDate'] ? $originalTask['DueDate'] : 'none';
                $newDue = $DueDate;
                $changes[] = "due date set to '$newDue'";
            } else {
                error_log("Invalid due date format: " . $DueDate);
            }
        }
    }

    // Always add UpdatedBy when there are changes
    if (!empty($updateFields) || isset($data['AssignedTo'])) {
        $updateFields[] = "UpdatedBy = $UserID";
        $updateFields[] = "updated_at = NOW()";
    }

    // Update task table if there are fields to update
    if (!empty($updateFields)) {
        $sql = "UPDATE task SET " . implode(", ", $updateFields) . " WHERE TaskID = $TaskID";
        if (!$conn->query($sql)) {
            throw new Exception("Error updating task: " . $conn->error);
        }
    }

    // Update assignees if provided
    $assigneeChanges = [];
    if (isset($data['AssignedTo'])) {
        // Parse assigned users
        $newAssigneeIds = [];
        if (is_array($data['AssignedTo'])) {
            $newAssigneeIds = $data['AssignedTo'];
        } else {
            $newAssigneeIds = explode(',', $data['AssignedTo']);
        }
        
        // Clean and validate IDs
        $validNewIds = [];
        foreach ($newAssigneeIds as $userId) {
            $userId = intval(trim($userId));
            if ($userId <= 0) continue;
            
            // Verify user is project member
            $userCheck = $conn->query("
                SELECT UserID FROM project_members 
                WHERE UserID = $userId AND ProjectID = $ProjectID
            ");
            
            if ($userCheck && $userCheck->num_rows > 0) {
                $validNewIds[] = $userId;
            }
        }
        
        // Get current assignees
        $currentAssignees = [];
        $currentQuery = $conn->query("SELECT UserID FROM task_assignees WHERE TaskID = $TaskID");
        while ($row = $currentQuery->fetch_assoc()) {
            $currentAssignees[] = $row['UserID'];
        }
        
        // Find assignees to add and remove
        $toAdd = array_diff($validNewIds, $currentAssignees);
        $toRemove = array_diff($currentAssignees, $validNewIds);
        
        // Add new assignees
        foreach ($toAdd as $userId) {
            // Check if user is host or co-host for permission
            $canUpdateStatus = 'No';
            $roleCheck = $conn->query("SELECT Role FROM project_members WHERE UserID = $userId AND ProjectID = $ProjectID");
            if ($roleCheck && $roleCheck->num_rows > 0) {
                $role = $roleCheck->fetch_assoc()['Role'];
                if ($role === 'Host' || $role === 'Co-Host') {
                    $canUpdateStatus = 'Yes';
                }
            }
            
            $insertSql = "INSERT INTO task_assignees (TaskID, UserID, can_update_status) VALUES ($TaskID, $userId, '$canUpdateStatus')";
            if (!$conn->query($insertSql)) {
                throw new Exception("Error adding assignee: " . $conn->error);
            }
            
            // Get user name for notification
            $userQuery = $conn->query("SELECT CONCAT(FirstName, ' ', LastName) as Name FROM user WHERE UserID = $userId");
            $userName = $userQuery->fetch_assoc()['Name'];
            
            // Create notification for new assignee
            $notificationMsg = "You have been assigned to task: " . ($data['TaskName'] ?? $originalTask['TaskName']);
            $notifSql = "INSERT INTO notification (UserID, Message, Type, created_at) 
                         VALUES ($userId, '$notificationMsg', 'task_assigned', NOW())";
            $conn->query($notifSql);
            
            $assigneeChanges[] = "added $userName";
        }
        
        // Remove old assignees
        if (!empty($toRemove)) {
            $removeIds = implode(',', $toRemove);
            $deleteSql = "DELETE FROM task_assignees WHERE TaskID = $TaskID AND UserID IN ($removeIds)";
            if (!$conn->query($deleteSql)) {
                throw new Exception("Error removing assignees: " . $conn->error);
            }
            
            // Get removed user names for logging
            foreach ($toRemove as $userId) {
                $userQuery = $conn->query("SELECT CONCAT(FirstName, ' ', LastName) as Name FROM user WHERE UserID = $userId");
                $userName = $userQuery->fetch_assoc()['Name'];
                $assigneeChanges[] = "removed $userName";
            }
        }
    }

    // Commit transaction
    $conn->commit();

    // Log activities for changes
    if (!empty($changes)) {
        foreach ($changes as $change) {
            $action = "Updated task: " . $originalTask['TaskName'];
            // Escape the description properly
            $escapedDesc = $conn->real_escape_string($change);
            $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
                       VALUES ($UserID, $ProjectID, '$action', '$escapedDesc', NOW())";
            if (!$conn->query($logSql)) {
                error_log("Error logging activity: " . $conn->error);
            }
        }
    }

    if (!empty($assigneeChanges)) {
        $action = "Updated task assignees: " . $originalTask['TaskName'];
        $desc = implode(", ", $assigneeChanges);
        $escapedDesc = $conn->real_escape_string($desc);
        $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
                   VALUES ($UserID, $ProjectID, '$action', '$escapedDesc', NOW())";
        if (!$conn->query($logSql)) {
            error_log("Error logging assignee activity: " . $conn->error);
        }
    }

    // Log archive action specifically for better tracking
    if (isset($data['Status']) && $data['Status'] == 'Archived' && $originalTask['Status'] != 'Archived') {
        $action = "Archived task: " . $originalTask['TaskName'];
        $desc = "Task archived by $userName";
        $escapedDesc = $conn->real_escape_string($desc);
        $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
                   VALUES ($UserID, $ProjectID, '$action', '$escapedDesc', NOW())";
        $conn->query($logSql);
    }

    // Get updated task with assignees for response
    $updatedTask = $originalTask;
    if (!empty($updateFields)) {
        $updatedQuery = "SELECT * FROM task WHERE TaskID = $TaskID";
        $updatedResult = $conn->query($updatedQuery);
        $updatedTask = $updatedResult->fetch_assoc();
    }
    
    // Get updated assignees
    $assignedUsers = [];
// In update_task.php, find the assignees query and update it:

$assigneesQuery = "
    SELECT u.UserID, u.FirstName, u.LastName, u.Email, ta.can_update_status, ta.is_rejected
    FROM task_assignees ta
    INNER JOIN user u ON ta.UserID = u.UserID
    WHERE ta.TaskID = $TaskID
";
$assigneesResult = $conn->query($assigneesQuery);
while ($assignee = $assigneesResult->fetch_assoc()) {
    $assignedUsers[] = [
        "UserID" => $assignee['UserID'],
        "Name" => $assignee['FirstName'] . ' ' . $assignee['LastName'],
        "FirstName" => $assignee['FirstName'],
        "LastName" => $assignee['LastName'],
        "Email" => $assignee['Email'],
        "can_update_status" => $assignee['can_update_status'],
        "is_rejected" => (bool) $assignee['is_rejected']
    ];
}
    
    // If status changed to Done, create notifications
    if (isset($data['Status']) && $data['Status'] == 'Done' && $originalTask['Status'] != 'Done') {
        foreach ($assignedUsers as $user) {
            $notificationMsg = "Task completed: " . ($data['TaskName'] ?? $originalTask['TaskName']);
            $notifSql = "INSERT INTO notification (UserID, Message, Type, created_at) 
                         VALUES (" . $user['UserID'] . ", '$notificationMsg', 'task_completed', NOW())";
            $conn->query($notifSql);
        }
    }
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Task updated successfully",
        "task" => [
            "TaskID" => $updatedTask['TaskID'],
            "TaskName" => $updatedTask['TaskName'],
            "Description" => $updatedTask['Description'],
            "Status" => $updatedTask['Status'],
            "StartDate" => $updatedTask['StartDate'],
            "DueDate" => $updatedTask['DueDate'],
            "completed_at" => $updatedTask['completed_at'],
            "AssignedTo" => $assignedUsers,
            "AssignedToIds" => array_column($assignedUsers, 'UserID'),
            "AssignedToNames" => array_column($assignedUsers, 'Name')
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

$conn->close();
?>