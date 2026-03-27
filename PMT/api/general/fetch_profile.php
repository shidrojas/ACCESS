<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../db.php";

// Read incoming JSON (UserID)
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['UserID'])) {
    echo json_encode(["status" => "error", "message" => "UserID is required"]);
    exit;
}

$UserID = intval($data['UserID']);

// Fetch user profile
$query = $conn->query("
    SELECT 
        UserID,
        Email,
        Contact_num,
        FirstName,
        LastName,
        Address,
        Photo,
        created_at,
        Status
    FROM user 
    WHERE UserID = $UserID
");

if ($query && $query->num_rows > 0) {
    $profile = $query->fetch_assoc();

    // Default profile image if empty
    if (empty($profile['Photo'])) {
        $profile['Photo'] = "default-avatar.png";
    }

    echo json_encode([
        "status" => "success",
        "message" => "Profile fetched successfully",
        "profile" => $profile
    ]);

} else {
    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);
}

$conn->close();
?>
