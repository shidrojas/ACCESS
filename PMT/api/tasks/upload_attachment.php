<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "../db.php";

// Create upload directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/task_attachments/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Check if files were uploaded
if (empty($_FILES['attachments'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No files uploaded"]);
    exit;
}

$taskId = intval($_POST['TaskID'] ?? 0);
$userId = intval($_POST['UserID'] ?? 0);

if (!$taskId || !$userId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "TaskID and UserID are required"]);
    exit;
}

// Verify task exists and user has access
$taskCheck = $conn->query("
    SELECT t.*, p.UserID as HostID 
    FROM task t
    INNER JOIN project p ON t.ProjectID = p.ProjectID
    WHERE t.TaskID = $taskId
");

if ($taskCheck->num_rows == 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

$taskData = $taskCheck->fetch_assoc();
$projectId = $taskData['ProjectID'];
$hostId = $taskData['HostID'];

// Verify user is a project member
$memberCheck = $conn->query("
    SELECT * FROM project_members 
    WHERE ProjectID = $projectId AND UserID = $userId
");

if ($memberCheck->num_rows == 0) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have access to this task"]);
    exit;
}

$uploadedFiles = [];
$errors = [];

// Handle multiple file uploads
if (is_array($_FILES['attachments']['name'])) {
    // Multiple files
    $fileCount = count($_FILES['attachments']['name']);
    
    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = $_FILES['attachments']['name'][$i];
        $fileTmpName = $_FILES['attachments']['tmp_name'][$i];
        $fileSize = $_FILES['attachments']['size'][$i];
        $fileError = $_FILES['attachments']['error'][$i];
        $fileType = $_FILES['attachments']['type'][$i];
        
        // Generate unique filename
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $uniqueFileName = uniqid() . '_' . time() . '.' . $fileExtension;
        $filePath = $uploadDir . $uniqueFileName;
        
        if ($fileError === 0) {
            if (move_uploaded_file($fileTmpName, $filePath)) {
                // Save to database
                $relativePath = 'uploads/task_attachments/' . $uniqueFileName;
                $insertStmt = $conn->prepare("
                    INSERT INTO task_attachments (TaskID, UserID, FileName, FilePath, FileSize, FileType) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $insertStmt->bind_param("iissss", $taskId, $userId, $fileName, $relativePath, $fileSize, $fileType);
                
                if ($insertStmt->execute()) {
                    $attachmentId = $insertStmt->insert_id;
                    $uploadedFiles[] = [
                        "AttachmentID" => $attachmentId,
                        "FileName" => $fileName,
                        "FilePath" => 'http://localhost/PMT/api/' . $relativePath,
                        "FileSize" => $fileSize,
                        "FileType" => $fileType,
                        "uploaded_at" => date('Y-m-d H:i:s')
                    ];
                } else {
                    $errors[] = "Database error for file: $fileName";
                }
                $insertStmt->close();
            } else {
                $errors[] = "Failed to move uploaded file: $fileName";
            }
        } else {
            $errors[] = "Error uploading file: $fileName";
        }
    }
} else {
    // Single file
    $fileName = $_FILES['attachments']['name'];
    $fileTmpName = $_FILES['attachments']['tmp_name'];
    $fileSize = $_FILES['attachments']['size'];
    $fileError = $_FILES['attachments']['error'];
    $fileType = $_FILES['attachments']['type'];
    
    $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
    $uniqueFileName = uniqid() . '_' . time() . '.' . $fileExtension;
    $filePath = $uploadDir . $uniqueFileName;
    
    if ($fileError === 0) {
        if (move_uploaded_file($fileTmpName, $filePath)) {
            $relativePath = 'uploads/task_attachments/' . $uniqueFileName;
            $insertStmt = $conn->prepare("
                INSERT INTO task_attachments (TaskID, UserID, FileName, FilePath, FileSize, FileType) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->bind_param("iissss", $taskId, $userId, $fileName, $relativePath, $fileSize, $fileType);
            
            if ($insertStmt->execute()) {
                $attachmentId = $insertStmt->insert_id;
                $uploadedFiles[] = [
                    "AttachmentID" => $attachmentId,
                    "FileName" => $fileName,
                    "FilePath" => 'http://localhost/PMT/api/' . $relativePath,
                    "FileSize" => $fileSize,
                    "FileType" => $fileType,
                    "uploaded_at" => date('Y-m-d H:i:s')
                ];
            } else {
                $errors[] = "Database error for file: $fileName";
            }
            $insertStmt->close();
        } else {
            $errors[] = "Failed to move uploaded file: $fileName";
        }
    } else {
        $errors[] = "Error uploading file: $fileName";
    }
}

// Log activity if files were uploaded
if (!empty($uploadedFiles)) {
    $action = "Added attachment" . (count($uploadedFiles) > 1 ? "s" : "") . " to task";
    $desc = "Uploaded " . count($uploadedFiles) . " file(s)";
    $logSql = "INSERT INTO activity_logs (UserID, ProjectID, Action, Description, LogDate) 
               VALUES ($userId, $projectId, '$action', '$desc', NOW())";
    $conn->query($logSql);
}

echo json_encode([
    "status" => !empty($uploadedFiles) ? "success" : "error",
    "message" => !empty($uploadedFiles) ? "Files uploaded successfully" : "No files were uploaded",
    "uploaded_files" => $uploadedFiles,
    "errors" => $errors
]);

$conn->close();
?>