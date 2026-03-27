<?php
// get_task_permissions.php
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

$projectId = isset($_GET['ProjectID']) ? intval($_GET['ProjectID']) : 0;
$userId = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;

if (!$projectId || !$userId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ProjectID and UserID are required"]);
    exit;
}

// Check if user is host or co-host
$roleCheck = $conn->query("
    SELECT Role FROM project_members 
    WHERE ProjectID = $projectId AND UserID = $userId
");
$role = $roleCheck->fetch_assoc()['Role'] ?? '';

// If host or co-host, they have permission for all tasks
if ($role === 'Host' || $role === 'Co-Host') {
    // Get all tasks in the project
    $tasksQuery = $conn->query("SELECT TaskID FROM task WHERE ProjectID = $projectId AND Status != 'Archived'");
    $permissions = [];
    while ($task = $tasksQuery->fetch_assoc()) {
        $permissions[$task['TaskID']] = [
            "can_update_status" => true,
            "permission_status" => "Yes"
        ];
    }
    
    echo json_encode([
        "status" => "success",
        "permissions" => $permissions
    ]);
    $conn->close();
    exit;
}

// For regular members, get permissions from task_assignees
$sql = "
    SELECT 
        t.TaskID,
        COALESCE(ta.can_update_status, 'No') as permission_status
    FROM task t
    LEFT JOIN task_assignees ta ON t.TaskID = ta.TaskID AND ta.UserID = ?
    WHERE t.ProjectID = ? AND t.Status != 'Archived'
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $userId, $projectId);
$stmt->execute();
$result = $stmt->get_result();

$permissions = [];
while ($row = $result->fetch_assoc()) {
    $permissions[$row['TaskID']] = [
        "can_update_status" => ($row['permission_status'] === 'Yes'),
        "permission_status" => $row['permission_status']
    ];
}

echo json_encode([
    "status" => "success",
    "permissions" => $permissions
]);

$conn->close();
?>