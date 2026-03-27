<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once "../config/db.php";

if (!isset($_GET['ProjectID']) || !isset($_GET['UserID'])) {
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

$projectId = intval($_GET['ProjectID']);
$userId = intval($_GET['UserID']);

try {
    // Get total activity count
    $totalQuery = "SELECT COUNT(*) as total FROM activity_log WHERE ProjectID = ?";
    $stmt = $conn->prepare($totalQuery);
    $stmt->bind_param("i", $projectId);
    $stmt->execute();
    $totalResult = $stmt->get_result();
    $totalCount = $totalResult->fetch_assoc()['total'];
    
    // Get unread count (activities since last viewed)
    // You'll need a user_activity_read table to track this
    $unreadQuery = "SELECT COUNT(*) as unread FROM activity_log al 
                    LEFT JOIN user_activity_read uar ON al.LogID = uar.ActivityID AND uar.UserID = ?
                    WHERE al.ProjectID = ? AND uar.ActivityID IS NULL";
    $stmt = $conn->prepare($unreadQuery);
    $stmt->bind_param("ii", $userId, $projectId);
    $stmt->execute();
    $unreadResult = $stmt->get_result();
    $unreadCount = $unreadResult->fetch_assoc()['unread'];
    
    echo json_encode([
        "status" => "success",
        "total_count" => $totalCount,
        "unread_count" => $unreadCount
    ]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>