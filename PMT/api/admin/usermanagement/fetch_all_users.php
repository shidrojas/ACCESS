<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");

require_once "../../db.php";

try {

    // ✅ Fetch ALL users (including admin)
    $sql = "SELECT UserID, FirstName, LastName, Email, role, Status, created_at, Photo 
            FROM user 
            ORDER BY UserID ASC";

    $result = $conn->query($sql);

    $users = [];

    if ($result && $result->num_rows > 0) {

        while ($row = $result->fetch_assoc()) {

            // ✅ Normalize role from database
            $dbRole = strtolower(trim($row['role']));

            switch ($dbRole) {
                case 'member':
                    $uiRole = 'Student';
                    break;

                case 'project_manager':
                    $uiRole = 'Instructor';
                    break;

                case 'admin':
                    $uiRole = 'Admin';
                    break;

                default:
                    $uiRole = ucfirst($dbRole);
                    break;
            }

            $users[] = [
                "id"        => (int)$row['UserID'],
                "firstName" => $row['FirstName'],
                "lastName"  => $row['LastName'],
                "email"     => $row['Email'],
                "role"      => $uiRole,
                "status"    => ucfirst(strtolower($row['Status'])), // Active / Deactivated
                "date"      => date("m/d/y", strtotime($row['created_at'])),
                "photo"     => $row['Photo'] ?? null
            ];
        }
    }

    echo json_encode([
        "status" => "success",
        "users"  => $users
    ]);

} catch (Exception $e) {

    echo json_encode([
        "status"  => "error",
        "message" => $e->getMessage()
    ]);
}

$conn->close();