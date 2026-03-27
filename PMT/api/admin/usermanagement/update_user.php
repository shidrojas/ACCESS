<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "../../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$userId    = intval($data['userId'] ?? 0);
$firstName = trim($data['firstName'] ?? '');
$lastName  = trim($data['lastName'] ?? '');
$email     = trim($data['email'] ?? '');
$adminId   = intval($data['adminId'] ?? 0);

if (!$userId || !$firstName || !$lastName || !$email || !$adminId) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Check if email already exists for another user
$stmt = $conn->prepare("SELECT UserID FROM user WHERE Email = ? AND UserID != ?");
$stmt->bind_param("si", $email, $userId);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Email already in use by another account"]);
    exit;
}
$stmt->close();

// Update user
$stmt = $conn->prepare("UPDATE user SET FirstName = ?, LastName = ?, Email = ? WHERE UserID = ?");
$stmt->bind_param("sssi", $firstName, $lastName, $email, $userId);

if ($stmt->execute()) {
    // Determine HandledBy for event log
    $handledBy = "by User";

    $adminQuery = $conn->query("SELECT role FROM user WHERE UserID = $adminId LIMIT 1");
    if ($adminQuery && $adminQuery->num_rows > 0) {
        $adminRow = $adminQuery->fetch_assoc();
        if (strtolower($adminRow['role']) === 'admin') {
            $handledBy = "Admin";
        }
    }

    // Insert event log
    $action = "Edited user account: {$firstName} {$lastName}";
    $stmt2 = $conn->prepare("INSERT INTO event_logs (UserID, Action, HandledBy) VALUES (?, ?, ?)");
    $stmt2->bind_param("iss", $adminId, $action, $handledBy);
    $stmt2->execute();
    $stmt2->close();

    echo json_encode(["status" => "success", "message" => "User updated successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update user"]);
}

$stmt->close();
$conn->close();
?>
