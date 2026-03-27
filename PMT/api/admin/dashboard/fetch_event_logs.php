<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once "../../db.php"; 

try {
    $sql = "SELECT el.Action, el.HandledBy, el.EventDate, u.Email
            FROM event_logs el
            JOIN user u ON el.UserID = u.UserID
            ORDER BY el.EventDate DESC";
    $result = $conn->query($sql);

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        // Format with both date and time
        $logs[] = [
            "email" => $row['Email'],
            "action" => $row['Action'],
            "handler" => $row['HandledBy'] ? $row['HandledBy'] : "System",
            "date" => date("m/d/y, h:i A", strtotime($row['EventDate'])) // Format: 02/23/26, 02:30 PM
        ];
    }

    echo json_encode($logs);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>