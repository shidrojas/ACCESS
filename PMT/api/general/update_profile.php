<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

require_once "../db.php";

$UserID = $_POST['UserID'];
$FirstName = $_POST['FirstName'];
$LastName = $_POST['LastName'];
$Email = $_POST['Email'];
$Contact_num = $_POST['Contact_num'];

$photoName = null;

if (isset($_FILES['Photo']) && $_FILES['Photo']['error'] === 0) {

    $uploadDir = __DIR__ . "/uploads/";

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $extension = pathinfo($_FILES['Photo']['name'], PATHINFO_EXTENSION);
    $fileName = time() . "_" . uniqid() . "." . $extension;
    $targetPath = $uploadDir . $fileName;

    if (move_uploaded_file($_FILES['Photo']['tmp_name'], $targetPath)) {
        $photoName = $fileName;
    }
}

if ($photoName) {
    $sql = "UPDATE user SET 
        FirstName='$FirstName',
        LastName='$LastName',
        Email='$Email',
        Contact_num='$Contact_num',
        Photo='$photoName'
        WHERE UserID=$UserID";
} else {
    $sql = "UPDATE user SET 
        FirstName='$FirstName',
        LastName='$LastName',
        Email='$Email',
        Contact_num='$Contact_num'
        WHERE UserID=$UserID";
}

if ($conn->query($sql)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}

$conn->close();
?>
