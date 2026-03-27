<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['Email'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Email required"
    ]);
    exit;
}

$email = $conn->real_escape_string($data['Email']);

/* Delete unfinished registration */
$stmt = $conn->prepare("
    DELETE FROM user
    WHERE Email = ?
    AND is_verified = 0
");
$stmt->bind_param("s", $email);
$stmt->execute();

echo json_encode([
    "status" => "success",
    "message" => "Unfinished registration removed"
]);

$conn->close();
