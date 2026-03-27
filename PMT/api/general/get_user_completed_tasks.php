<?php
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

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['UserID'])) {
    $userID = intval($_GET['UserID']);
    
    try {
        // Get user info first
        $userQuery = "SELECT UserID, FirstName, LastName, Email, role FROM user WHERE UserID = ?";
        $userStmt = $conn->prepare($userQuery);
        $userStmt->bind_param("i", $userID);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        
        if ($userResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'User not found'
            ]);
            exit;
        }
        
        $user = $userResult->fetch_assoc();
        
        // Query to get completed tasks count
        $countQuery = "
            SELECT COUNT(DISTINCT t.TaskID) as total_completed
            FROM task t
            INNER JOIN project p ON t.ProjectID = p.ProjectID
            LEFT JOIN project_members pm ON p.ProjectID = pm.ProjectID AND pm.UserID = ?
            LEFT JOIN task_assignees ta ON t.TaskID = ta.TaskID AND ta.UserID = ?
            WHERE 
                t.Status = 'Done'
                AND (
                    p.UserID = ?  -- User is project owner
                    OR pm.ID IS NOT NULL  -- User is project member
                    OR ta.id IS NOT NULL  -- User is task assignee
                )
                AND p.Status = 'Active'  -- Only count tasks from active projects
        ";
        
        $countStmt = $conn->prepare($countQuery);
        $countStmt->bind_param("iii", $userID, $userID, $userID);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $countRow = $countResult->fetch_assoc();
        $totalCompleted = intval($countRow['total_completed']);
        
        // Get detailed list of completed tasks with project and assignment info
        $detailsQuery = "
            SELECT 
                t.TaskID,
                t.TaskName,
                t.Description,
                t.completed_at,
                DATE_FORMAT(t.completed_at, '%M %d, %Y') as completed_date_formatted,
                t.DueDate,
                DATE_FORMAT(t.DueDate, '%M %d, %Y') as due_date_formatted,
                p.ProjectID,
                p.ProjectName,
                p.UserID as ProjectOwnerID,
                CONCAT(owner.FirstName, ' ', owner.LastName) as ProjectOwnerName,
                CASE 
                    WHEN p.UserID = ? THEN 'owner'
                    WHEN pm.Role IS NOT NULL THEN CONCAT('member (', pm.Role, ')')
                    WHEN ta.id IS NOT NULL THEN 'assignee'
                END as user_role,
                pm.Role as member_role,
                ta.can_update_status
            FROM task t
            INNER JOIN project p ON t.ProjectID = p.ProjectID
            INNER JOIN user owner ON p.UserID = owner.UserID
            LEFT JOIN project_members pm ON p.ProjectID = pm.ProjectID AND pm.UserID = ?
            LEFT JOIN task_assignees ta ON t.TaskID = ta.TaskID AND ta.UserID = ?
            WHERE 
                t.Status = 'Done'
                AND (
                    p.UserID = ?
                    OR pm.ID IS NOT NULL
                    OR ta.id IS NOT NULL
                )
                AND p.Status = 'Active'
            ORDER BY t.completed_at DESC
        ";
        
        $detailsStmt = $conn->prepare($detailsQuery);
        $detailsStmt->bind_param("iiii", $userID, $userID, $userID, $userID);
        $detailsStmt->execute();
        $detailsResult = $detailsStmt->get_result();
        
        $completedTasks = [];
        $summary = [
            'as_owner' => 0,
            'as_member' => 0,
            'as_assignee_only' => 0
        ];
        
        while ($row = $detailsResult->fetch_assoc()) {
            // Get task assignees
            $assigneesQuery = "
                SELECT u.UserID, u.FirstName, u.LastName, ta.can_update_status
                FROM task_assignees ta
                INNER JOIN user u ON ta.UserID = u.UserID
                WHERE ta.TaskID = ?
            ";
            $assigneesStmt = $conn->prepare($assigneesQuery);
            $assigneesStmt->bind_param("i", $row['TaskID']);
            $assigneesStmt->execute();
            $assigneesResult = $assigneesStmt->get_result();
            
            $assignees = [];
            while ($assignee = $assigneesResult->fetch_assoc()) {
                $assignees[] = [
                    'UserID' => $assignee['UserID'],
                    'Name' => $assignee['FirstName'] . ' ' . $assignee['LastName'],
                    'can_update_status' => $assignee['can_update_status']
                ];
            }
            
            $row['assignees'] = $assignees;
            $row['assignee_count'] = count($assignees);
            
            // Update summary counts
            if ($row['user_role'] === 'owner') {
                $summary['as_owner']++;
            } elseif (strpos($row['user_role'], 'member') === 0) {
                $summary['as_member']++;
            } elseif ($row['user_role'] === 'assignee') {
                $summary['as_assignee_only']++;
            }
            
            $completedTasks[] = $row;
        }
        
        // Get task statistics by project
        $projectStatsQuery = "
            SELECT 
                p.ProjectID,
                p.ProjectName,
                COUNT(DISTINCT t.TaskID) as completed_tasks
            FROM task t
            INNER JOIN project p ON t.ProjectID = p.ProjectID
            LEFT JOIN project_members pm ON p.ProjectID = pm.ProjectID AND pm.UserID = ?
            LEFT JOIN task_assignees ta ON t.TaskID = ta.TaskID AND ta.UserID = ?
            WHERE 
                t.Status = 'Done'
                AND (
                    p.UserID = ?
                    OR pm.ID IS NOT NULL
                    OR ta.id IS NOT NULL
                )
                AND p.Status = 'Active'
            GROUP BY p.ProjectID, p.ProjectName
            ORDER BY completed_tasks DESC
        ";
        
        $projectStatsStmt = $conn->prepare($projectStatsQuery);
        $projectStatsStmt->bind_param("iii", $userID, $userID, $userID);
        $projectStatsStmt->execute();
        $projectStatsResult = $projectStatsStmt->get_result();
        
        $projectStats = [];
        while ($row = $projectStatsResult->fetch_assoc()) {
            $projectStats[] = $row;
        }
        
        // Return comprehensive response
        echo json_encode([
            'status' => 'success',
            'user_id' => $userID,
            'user_name' => $user['FirstName'] . ' ' . $user['LastName'],
            'user_email' => $user['Email'],
            'user_role' => $user['role'],
            'total_completed' => $totalCompleted,
            'summary' => $summary,
            'tasks' => $completedTasks,
            'project_stats' => $projectStats,
            'message' => 'Completed tasks retrieved successfully'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
    
} else {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'UserID is required'
    ]);
}
?>