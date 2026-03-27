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

$userId = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;

if (!$userId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "UserID is required"]);
    exit;
}

// First check if user exists
$userCheck = $conn->query("SELECT UserID FROM user WHERE UserID = $userId");
if ($userCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Debug: Log the query we're about to run
error_log("Fetching deadlines for UserID: $userId");

// Fetch upcoming deadlines with proper logic:
// 1. If user is project owner -> see ALL tasks in that project
// 2. If user is member/co-host -> see ONLY tasks assigned to them
// 3. If user is assigned to a task in any project -> see that task
$sql = "
    SELECT DISTINCT
        t.TaskID,
        t.TaskName as task,
        p.ProjectID,
        p.ProjectName as project,
        p.UserID as projectOwnerID,
        t.DueDate,
        t.Status as taskStatus,
        DATEDIFF(t.DueDate, CURDATE()) as daysLeft,
        CASE 
            WHEN t.DueDate < CURDATE() THEN 'overdue'
            WHEN t.DueDate = CURDATE() THEN 'today'
            WHEN DATEDIFF(t.DueDate, CURDATE()) = 1 THEN 'tomorrow'
            WHEN DATEDIFF(t.DueDate, CURDATE()) <= 7 THEN 'week'
            ELSE 'future'
        END as deadlineCategory,
        CASE 
            WHEN p.UserID = $userId THEN 'owner'
            ELSE pm.Role
        END as relationType,
        pm.Role as memberRole,
        -- Flag to indicate if task is assigned to user
        CASE 
            WHEN ta.UserID IS NOT NULL THEN 1
            ELSE 0
        END as isAssigned
    FROM task t
    INNER JOIN project p ON t.ProjectID = p.ProjectID
    LEFT JOIN project_members pm ON p.ProjectID = pm.ProjectID AND pm.UserID = $userId
    LEFT JOIN task_assignees ta ON t.TaskID = ta.TaskID AND ta.UserID = $userId
    WHERE 
        (
            -- User is the project owner (see ALL tasks in their projects)
            p.UserID = $userId
            OR
            -- User is a member/co-host AND task is assigned to them
            (pm.UserID = $userId AND ta.UserID = $userId)
            OR
            -- User is assigned to the task in any project
            ta.UserID = $userId
        )
        AND t.Status != 'Archived'
        AND t.DueDate IS NOT NULL
        AND t.DueDate != '0000-00-00'
    ORDER BY 
        CASE 
            WHEN t.DueDate < CURDATE() THEN 0
            ELSE ABS(DATEDIFF(t.DueDate, CURDATE()))
        END ASC,
        t.DueDate ASC
    LIMIT $limit
";

$result = $conn->query($sql);

if (!$result) {
    error_log("SQL Error: " . $conn->error);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $conn->error
    ]);
    exit;
}

$deadlines = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Format due date
        $dueDate = new DateTime($row['DueDate']);
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        $dueDateOnly = new DateTime($row['DueDate']);
        $dueDateOnly->setTime(0, 0, 0);
        
        $interval = $today->diff($dueDateOnly);
        $daysLeft = $interval->days;
        
        if ($dueDateOnly < $today) {
            $daysLeft = -$daysLeft;
        }
        
        // Format the date for display
        if ($dueDateOnly < $today) {
            $formattedDate = "Overdue: " . $dueDate->format('M j, Y');
        } else if ($daysLeft == 0) {
            $formattedDate = "Today, " . $dueDate->format('g:i A');
        } else if ($daysLeft == 1) {
            $formattedDate = "Tomorrow, " . $dueDate->format('g:i A');
        } else if ($daysLeft <= 7) {
            $formattedDate = $dueDate->format('l, g:i A');
        } else {
            $formattedDate = $dueDate->format('M j, Y');
        }
        
        // Determine display role
        $displayRole = '';
        if ($row['projectOwnerID'] == $userId) {
            $displayRole = 'Owner';
        } else if ($row['memberRole']) {
            $displayRole = $row['memberRole'] === 'Co-Host' ? 'Co-Host' : 'Member';
        } else {
            $displayRole = 'Assignee';
        }
        
        $deadlines[] = [
            "id" => $row['TaskID'],
            "task" => $row['task'],
            "project" => $row['project'],
            "projectId" => $row['ProjectID'],
            "dueDate" => $row['DueDate'],
            "dueDateFormatted" => $formattedDate,
            "daysLeft" => $daysLeft,
            "status" => $row['taskStatus'],
            "deadlineCategory" => $row['deadlineCategory'],
            "relationType" => $displayRole,
            "memberRole" => $row['memberRole'],
            "isAssigned" => $row['isAssigned']
        ];
    }
}

// Debug: Log how many deadlines we found
error_log("Found " . count($deadlines) . " deadlines for UserID: $userId");

echo json_encode([
    "status" => "success",
    "deadlines" => $deadlines,
    "count" => count($deadlines)
]);

$conn->close();
?>