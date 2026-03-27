<?php 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['UserID'])) {
    echo json_encode([
        "status" => "error",
        "message" => "UserID is required"
    ]);
    exit;
}

$UserID = intval($data['UserID']);

$query = $conn->query("
    SELECT 
        CONCAT(FirstName, ' ', LastName) AS FullName,
        Email,
        Role,
        Photo,
        CASE
            WHEN Role = 'member' THEN 'Student'
            WHEN Role = 'project_manager' THEN 'Instructor'
            WHEN Role = 'admin' THEN 'Admin'
            ELSE 'Unknown'
        END AS RoleUI
    FROM user
    WHERE UserID = $UserID
");

if ($query && $query->num_rows > 0) {
    $user = $query->fetch_assoc();

    echo json_encode([
        "status" => "success",
        "user" => [
            "FullName" => $user["FullName"],
            "Email" => $user["Email"],
            "RoleDB" => $user["Role"],
            "RoleUI" => $user["RoleUI"],
            "Photo"  => $user["Photo"]   
        ]
    ]);

} else {
    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);
}

$conn->close();
?>