<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Credentials: true");

header("Content-Type: application/json");

require_once "../../db.php"; 

try {
    $sql = "SELECT ul.TimeIn, ul.TimeOut, ul.CreatedAt, u.Email 
            FROM user_logs ul
            JOIN user u ON ul.UserID = u.UserID
            ORDER BY ul.CreatedAt DESC";
    $result = $conn->query($sql);

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = [
            "email" => $row['Email'],
            "timeIn" => date("h:i A", strtotime($row['TimeIn'])),
            "timeOut" => $row['TimeOut'] ? date("h:i A", strtotime($row['TimeOut'])) : "",
            "date" => date("m/d/y", strtotime($row['CreatedAt']))
        ];
    }

    echo json_encode($logs);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>