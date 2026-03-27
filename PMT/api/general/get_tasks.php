<?php
// get_tasks.php
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

// Check if we need to filter by specific user
$UserID = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;

// Check if we need a single task
$TaskID = isset($_GET['TaskID']) ? intval($_GET['TaskID']) : 0;

// Validate project exists
$projectCheck = $conn->query("SELECT ProjectID FROM project WHERE ProjectID = $ProjectID");
if ($projectCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Project not found"]);
    exit;
}

// Build query based on parameters
if ($TaskID > 0) {
    // Get specific task (including archived for individual view)
    $sql = "
        SELECT 
            t.*,
            p.ProjectName,
            p.Description as ProjectDescription
        FROM task t
        INNER JOIN project p ON t.ProjectID = p.ProjectID
        WHERE t.TaskID = $TaskID AND t.ProjectID = $ProjectID
    ";
} else {
    // Get all tasks for project EXCEPT archived, optionally filtered by user
    $userFilter = $UserID > 0 ? "AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.TaskID = t.TaskID AND ta.UserID = $UserID)" : "";
    
    $sql = "
        SELECT 
            t.*
        FROM task t
        WHERE t.ProjectID = $ProjectID
        AND t.Status != 'Archived'
        $userFilter
        ORDER BY 
            CASE t.Status
                WHEN 'To Do' THEN 1
                WHEN 'In Progress' THEN 2
                WHEN 'For Review' THEN 3
                WHEN 'Done' THEN 4
                ELSE 5
            END,
            t.DueDate ASC,
            t.created_at DESC
    ";
}

$result = $conn->query($sql);

if ($result) {
    $tasks = [];
    
    while ($row = $result->fetch_assoc()) {
        // Get assigned users from task_assignees table with is_rejected flag
        $assignedUsers = [];
        $assignedIds = [];
        $rejectedIds = [];
        
        $assigneesQuery = "
            SELECT u.UserID, u.FirstName, u.LastName, u.Email, u.Photo, ta.can_update_status, ta.is_rejected
            FROM task_assignees ta
            INNER JOIN user u ON ta.UserID = u.UserID
            WHERE ta.TaskID = " . $row['TaskID'];
        
        $assigneesResult = $conn->query($assigneesQuery);
        if ($assigneesResult) {
            while ($assignee = $assigneesResult->fetch_assoc()) {
                $assignedIds[] = $assignee['UserID'];
                if ($assignee['is_rejected'] == 1) {
                    $rejectedIds[] = $assignee['UserID'];
                }
                $assignedUsers[] = [
                    "UserID" => $assignee['UserID'],
                    "Name" => $assignee['FirstName'] . ' ' . $assignee['LastName'],
                    "FirstName" => $assignee['FirstName'],
                    "LastName" => $assignee['LastName'],
                    "Email" => $assignee['Email'],
                    "Photo" => $assignee['Photo'],
                    "can_update_status" => $assignee['can_update_status'],
                    "is_rejected" => (bool) $assignee['is_rejected']
                ];
            }
        }
        
        // Check if task is overdue based on status and completion date
        $isOverdue = false;
        if ($row['DueDate']) {
            $dueDateTime = strtotime($row['DueDate']);
            
            if ($row['Status'] === 'Done') {
                if ($row['completed_at']) {
                    $completedDateTime = strtotime($row['completed_at']);
                    $isOverdue = $completedDateTime > $dueDateTime;
                }
            } else if ($row['Status'] !== 'Archived') {
                $now = time();
                $isOverdue = $now > $dueDateTime;
            }
        }
        
        // Format dates
        $createdAt = date('M d, Y', strtotime($row['created_at']));
        $dueDate = $row['DueDate'] ? date('Y-m-d H:i:s', strtotime($row['DueDate'])) : null;
        $dueDateFormatted = $row['DueDate'] ? date('M d, Y', strtotime($row['DueDate'])) : 'No due date';
        $startDate = $row['StartDate'] ? date('Y-m-d H:i:s', strtotime($row['StartDate'])) : null;
        $startDateFormatted = $row['StartDate'] ? date('M d, Y', strtotime($row['StartDate'])) : null;
        $completedAt = $row['completed_at'] ? date('Y-m-d H:i:s', strtotime($row['completed_at'])) : null;
        
        $tasks[] = [
            "TaskID" => $row['TaskID'],
            "ProjectID" => $row['ProjectID'],
            "TaskName" => $row['TaskName'],
            "Description" => $row['Description'],
            "Status" => $row['Status'],
            "StartDate" => $startDate,
            "StartDateFormatted" => $startDateFormatted,
            "DueDate" => $dueDate,
            "DueDateFormatted" => $dueDateFormatted,
            "completed_at" => $completedAt,
            "Attachment" => $row['Attachment'],
            "isOverdue" => $isOverdue,
            "AssignedTo" => $assignedUsers,
            "AssignedToIds" => $assignedIds,
            "RejectedUserIds" => $rejectedIds,
            "created_at" => $row['created_at'],
            "created_at_formatted" => $createdAt,
            "updated_at" => $row['updated_at']
        ];
    }
    
    if ($TaskID > 0 && empty($tasks)) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Task not found"]);
    } else {
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Tasks retrieved successfully",
            "tasks" => $tasks,
            "count" => count($tasks)
        ]);
    }
    
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $conn->error]);
}

$conn->close();
?>