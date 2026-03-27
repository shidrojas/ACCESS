<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Include database connection
require_once '../db.php';

// Check if connection exists
if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed'
    ]);
    exit();
}

// Fetch active projects count
$projectQuery = "SELECT COUNT(*) as total FROM project WHERE Status = 'Active'";
$projectResult = $conn->query($projectQuery);
$activeProjects = $projectResult ? $projectResult->fetch_assoc()['total'] : 0;

// Fetch total users for percentage calculation
$totalUsersQuery = "SELECT COUNT(*) as total FROM user WHERE is_verified = 1";
$totalUsersResult = $conn->query($totalUsersQuery);
$totalUsers = $totalUsersResult ? $totalUsersResult->fetch_assoc()['total'] : 0;

// Fetch active users count (users with Status = 'Active' and is_verified = 1)
$userQuery = "SELECT COUNT(*) as total FROM user WHERE Status = 'Active' AND is_verified = 1";
$userResult = $conn->query($userQuery);
$activeUsers = $userResult ? $userResult->fetch_assoc()['total'] : 0;

// Calculate active user percentage
$activeUserPercentage = $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100) : 0;

// Fetch completed tasks count (tasks with Status = 'Done')
$taskQuery = "SELECT COUNT(*) as total FROM task WHERE Status = 'Done'";
$taskResult = $conn->query($taskQuery);
$completedTasks = $taskResult ? $taskResult->fetch_assoc()['total'] : 0;

// Return the data
echo json_encode([
    'status' => 'success',
    'data' => [
        'active_projects' => (int)$activeProjects,
        'active_users_raw' => (int)$activeUsers,
        'active_users_percentage' => (int)$activeUserPercentage,
        'completed_tasks' => (int)$completedTasks,
        'total_users' => (int)$totalUsers
    ]
]);

// Close connection
$conn->close();
?>