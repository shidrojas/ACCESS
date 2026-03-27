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
    // Get all archived projects where the user is a member (not pending)
    $query = "
        SELECT 
            p.ProjectID,
            p.ProjectName,
            p.Description,
            p.Code,
            p.Status,
            p.color,
            p.updated_at as UpdatedAt,
            p.created_at as CreatedAt,
            u.FirstName as HostFirstName,
            u.LastName as HostLastName,
            (
                SELECT COUNT(*) 
                FROM task t 
                WHERE t.ProjectID = p.ProjectID
            ) as total_tasks,
            (
                SELECT COUNT(*) 
                FROM task t 
                WHERE t.ProjectID = p.ProjectID 
                AND t.Status = 'Done'
            ) as completed_tasks
        FROM project p
        INNER JOIN project_members pm ON p.ProjectID = pm.ProjectID
        LEFT JOIN user u ON p.UserID = u.UserID
        WHERE pm.UserID = ?
        AND pm.Role != 'Pending'
        AND p.Status = 'Archived'
        ORDER BY p.updated_at DESC, p.created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $UserID);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $projects = [];
    
    while ($row = $result->fetch_assoc()) {
        $hostName = '';
        if ($row['HostFirstName'] && $row['HostLastName']) {
            $hostName = $row['HostFirstName'] . ' ' . $row['HostLastName'];
        } else {
            $hostName = 'Unknown';
        }
        
        // Format dates
        $archivedDate = $row['UpdatedAt'] ?: $row['CreatedAt'];
        $timeAgo = '';
        
        if ($archivedDate) {
            $now = new DateTime();
            $archiveDateTime = new DateTime($archivedDate);
            $interval = $now->diff($archiveDateTime);
            
            if ($interval->days == 0) {
                if ($interval->h == 0) {
                    $timeAgo = $interval->i . ' minutes ago';
                } else {
                    $timeAgo = $interval->h . ' hours ago';
                }
            } elseif ($interval->days == 1) {
                $timeAgo = 'Yesterday';
            } elseif ($interval->days < 7) {
                $timeAgo = $interval->days . ' days ago';
            } elseif ($interval->days < 30) {
                $weeks = floor($interval->days / 7);
                $timeAgo = $weeks . ' week' . ($weeks > 1 ? 's' : '') . ' ago';
            } elseif ($interval->days < 365) {
                $months = floor($interval->days / 30);
                $timeAgo = $months . ' month' . ($months > 1 ? 's' : '') . ' ago';
            } else {
                $years = floor($interval->days / 365);
                $timeAgo = $years . ' year' . ($years > 1 ? 's' : '') . ' ago';
            }
        }
        
        $projects[] = [
            'ProjectID' => $row['ProjectID'],
            'ProjectName' => $row['ProjectName'],
            'Description' => $row['Description'],
            'HostName' => $hostName,
            'Code' => $row['Code'],
            'Status' => $row['Status'],
            'color' => $row['color'],
            'ArchivedDate' => $archivedDate,
            'TimeAgo' => $timeAgo,
            'total_tasks' => (int)$row['total_tasks'],
            'completed_tasks' => (int)$row['completed_tasks']
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'projects' => $projects,
        'count' => count($projects)
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