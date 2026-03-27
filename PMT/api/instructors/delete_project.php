<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->ProjectID) || !isset($data->UserID)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Project ID and User ID are required"]);
    exit();
}

$projectId = intval($data->ProjectID);
$userId = intval($data->UserID);

// Check if user is the host of the project
$checkQuery = "SELECT pm.Role FROM project_members pm 
               WHERE pm.ProjectID = $projectId AND pm.UserID = $userId";
$checkResult = $conn->query($checkQuery);

if ($checkResult->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You are not a member of this project"]);
    exit();
}

$member = $checkResult->fetch_assoc();
if ($member['Role'] !== 'Host') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Only project hosts can delete the project"]);
    exit();
}

// Get project details before deletion
$projectQuery = "SELECT * FROM project WHERE ProjectID = $projectId";
$projectResult = $conn->query($projectQuery);
$project = $projectResult->fetch_assoc();

// Start transaction
$conn->begin_transaction();

try {
    // First, archive the project by copying to archive_project table
    $archiveQuery = "INSERT INTO archive_project (ProjectID, UserID, ProjectName, Description, StartDate, EndDate, Password, Status, ArchivedDate)
                     VALUES ($projectId, $userId, '{$project['ProjectName']}', '{$project['Description']}', 
                     '{$project['StartDate']}', '{$project['EndDate']}', '{$project['Password']}', 'Deleted', NOW())";
    $conn->query($archiveQuery);

    // Delete from task_assignees first (foreign key constraints)
    $taskAssigneesQuery = "DELETE ta FROM task_assignees ta 
                           INNER JOIN task t ON ta.TaskID = t.TaskID 
                           WHERE t.ProjectID = $projectId";
    $conn->query($taskAssigneesQuery);

    // Delete tasks
    $deleteTasksQuery = "DELETE FROM task WHERE ProjectID = $projectId";
    $conn->query($deleteTasksQuery);

    // Delete project members
    $deleteMembersQuery = "DELETE FROM project_members WHERE ProjectID = $projectId";
    $conn->query($deleteMembersQuery);

    // Delete the project
    $deleteQuery = "DELETE FROM project WHERE ProjectID = $projectId";
    $conn->query($deleteQuery);

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Project deleted successfully and archived"
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to delete project: " . $e->getMessage()]);
}

$conn->close();
?>