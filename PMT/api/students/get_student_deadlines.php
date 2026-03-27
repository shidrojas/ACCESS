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

// Get UserID from query parameters
$UserID = isset($_GET['UserID']) ? intval($_GET['UserID']) : 0;

if (!$UserID) {
    echo json_encode([
        'status' => 'error',
        'message' => 'User ID is required'
    ]);
    exit;
}

try {
    // 1. Get total completed tasks assigned to the user
    $completedQuery = "
        SELECT COUNT(DISTINCT t.TaskID) as total_completed
        FROM task t
        INNER JOIN task_assignees ta ON t.TaskID = ta.TaskID
        WHERE ta.UserID = ?
        AND t.Status = 'Done'
    ";
    
    $stmt = $conn->prepare($completedQuery);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $completedResult = $stmt->get_result();
    $completedData = $completedResult->fetch_assoc();
    $totalCompleted = $completedData['total_completed'] ?? 0;

    // 2. Get overdue tasks assigned to the user 
    // (tasks that are not Done and current datetime is past due datetime)
    $overdueQuery = "
        SELECT COUNT(DISTINCT t.TaskID) as total_overdue
        FROM task t
        INNER JOIN task_assignees ta ON t.TaskID = ta.TaskID
        WHERE ta.UserID = ?
        AND t.Status != 'Done'
        AND t.Status != 'Archived'
        AND t.DueDate IS NOT NULL
        AND t.DueDate < NOW()
    ";
    
    $stmt = $conn->prepare($overdueQuery);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $overdueResult = $stmt->get_result();
    $overdueData = $overdueResult->fetch_assoc();
    $totalOverdue = $overdueData['total_overdue'] ?? 0;

    // 3. Get active projects count (projects where user is a member and project is Active)
    $projectsQuery = "
        SELECT COUNT(DISTINCT p.ProjectID) as total_projects
        FROM project p
        INNER JOIN project_members pm ON p.ProjectID = pm.ProjectID
        WHERE pm.UserID = ?
        AND pm.Role != 'Pending'
        AND p.Status = 'Active'
    ";
    
    $stmt = $conn->prepare($projectsQuery);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $projectsResult = $stmt->get_result();
    $projectsData = $projectsResult->fetch_assoc();
    $totalProjects = $projectsData['total_projects'] ?? 0;

    // 4. Get all upcoming deadlines assigned to the user
    $deadlinesQuery = "
        SELECT 
            t.TaskID as id,
            t.TaskName as task,
            t.Description as task_description,
            t.Status as status,
            t.DueDate as due_date,
            t.completed_at,
            p.ProjectID as project_id,
            p.ProjectName as project,
            p.color as project_color,
            u.FirstName as created_firstname,
            u.LastName as created_lastname,
            t.created_at,
            t.updated_at
        FROM task t
        INNER JOIN project p ON t.ProjectID = p.ProjectID
        INNER JOIN task_assignees ta ON t.TaskID = ta.TaskID
        LEFT JOIN user u ON t.UpdatedBy = u.UserID
        WHERE ta.UserID = ?
        AND t.Status != 'Archived'
        AND t.DueDate IS NOT NULL
        ORDER BY 
            CASE 
                WHEN t.DueDate < NOW() THEN 0  -- Overdue tasks first
                ELSE 1 
            END,
            t.DueDate ASC
    ";
    
    $stmt = $conn->prepare($deadlinesQuery);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $deadlinesResult = $stmt->get_result();
    
    $deadlines = [];
    $now = new DateTime(); // Current date and time
    
    while ($row = $deadlinesResult->fetch_assoc()) {
        $dueDate = new DateTime($row['due_date']);
        
        // Calculate difference
        $interval = $now->diff($dueDate);
        $daysDiff = (int)$interval->format('%r%a'); // Negative if overdue
        
        // Determine status based on date comparison
        $dueStatus = '';
        $dueDateFormatted = '';
        
        // Compare dates only (ignoring time) for day-based classification
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        
        $dueDateOnly = clone $dueDate;
        $dueDateOnly->setTime(0, 0, 0);
        
        $tomorrow = clone $today;
        $tomorrow->modify('+1 day');
        
        // Check if overdue (current datetime > due datetime)
        if ($now > $dueDate && $row['status'] != 'Done') {
            $dueStatus = 'overdue';
            $dueDateFormatted = 'Overdue: ' . $dueDate->format('M d, Y g:i A');
        }
        // Check if due today (same day)
        elseif ($dueDateOnly == $today) {
            if ($now <= $dueDate) {
                $dueStatus = 'today';
                $dueDateFormatted = 'Today, ' . $dueDate->format('g:i A');
            } else {
                $dueStatus = 'overdue';
                $dueDateFormatted = 'Overdue: ' . $dueDate->format('M d, Y g:i A');
            }
        }
        // Check if due tomorrow (same as tomorrow's date)
        elseif ($dueDateOnly == $tomorrow) {
            $dueStatus = 'tomorrow';
            $dueDateFormatted = 'Tomorrow, ' . $dueDate->format('g:i A');
        }
        // Due in the future
        elseif ($dueDateOnly > $tomorrow) {
            $daysUntil = $dueDateOnly->diff($today)->days;
            if ($daysUntil <= 7) {
                $dueStatus = 'this_week';
                $dueDateFormatted = $dueDate->format('l, g:i A') . ' (' . $daysUntil . ' days)';
            } else {
                $dueStatus = 'future';
                $dueDateFormatted = $dueDate->format('M d, Y g:i A');
            }
        }
        
        // Check if task was completed late
        $isLate = false;
        if ($row['status'] == 'Done' && $row['completed_at']) {
            $completedAt = new DateTime($row['completed_at']);
            $isLate = $completedAt > $dueDate;
            if ($isLate) {
                $dueStatus = 'late';
                $dueDateFormatted = 'Completed Late: ' . $dueDate->format('M d, Y g:i A');
            }
        }
        
        // Calculate days left (negative if overdue)
        $daysLeft = $daysDiff;
        
        $deadlines[] = [
            'id' => $row['id'],
            'task' => $row['task'],
            'task_description' => $row['task_description'],
            'project' => $row['project'],
            'projectId' => $row['project_id'],
            'projectColor' => $row['project_color'] ?? '#ff9a9e',
            'status' => $row['status'],
            'dueDate' => $row['due_date'],
            'dueDateFormatted' => $dueDateFormatted,
            'dueStatus' => $dueStatus,
            'daysLeft' => $daysLeft,
            'isOverdue' => ($dueStatus == 'overdue'),
            'isLate' => $isLate,
            'createdBy' => trim(($row['created_firstname'] ?? '') . ' ' . ($row['created_lastname'] ?? '')) ?: 'Unknown',
            'createdAt' => $row['created_at']
        ];
    }

    // 5. Get task statistics by status
    $statsQuery = "
        SELECT 
            t.Status,
            COUNT(DISTINCT t.TaskID) as count
        FROM task t
        INNER JOIN task_assignees ta ON t.TaskID = ta.TaskID
        WHERE ta.UserID = ?
        AND t.Status != 'Archived'
        GROUP BY t.Status
    ";
    
    $stmt = $conn->prepare($statsQuery);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $statsResult = $stmt->get_result();
    
    $taskStats = [
        'To Do' => 0,
        'In Progress' => 0,
        'For Review' => 0,
        'Done' => 0
    ];
    
    while ($row = $statsResult->fetch_assoc()) {
        if (isset($taskStats[$row['Status']])) {
            $taskStats[$row['Status']] = (int)$row['count'];
        }
    }

    // Return the response
    echo json_encode([
        'status' => 'success',
        'stats' => [
            'completed_tasks' => $totalCompleted,
            'overdue_tasks' => $totalOverdue,
            'active_projects' => $totalProjects,
            'todo_tasks' => $taskStats['To Do'],
            'in_progress_tasks' => $taskStats['In Progress'],
            'review_tasks' => $taskStats['For Review']
        ],
        'deadlines' => $deadlines,
        'total_deadlines' => count($deadlines)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();
}
?>