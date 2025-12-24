<?php
/**
 * RIF-II.ORG Upload Script v2
 * Enhanced version that supports subdirectories
 * 
 * INSTRUCTIONS:
 * 1. Upload this file to your rif-ii.org server as "upload.php" in the root directory
 * 2. Make sure the "uploads" directory exists and is writable (chmod 755)
 * 3. Test by visiting https://rif-ii.org/upload.php (should show "Upload endpoint ready")
 */

// Set CORS headers to allow uploads from your Next.js app
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, User-Agent');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Handle GET request (for testing)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'Upload endpoint ready',
        'server' => 'rif-ii.org',
        'version' => '2.0',
        'timestamp' => date('Y-m-d H:i:s'),
        'supports_subdirectories' => true
    ]);
    exit();
}

// Only allow POST requests for uploads
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Check if file was uploaded (try multiple field names)
    $uploadedFile = null;
    $fieldNames = ['file', 'image', 'upload', 'document'];
    
    foreach ($fieldNames as $fieldName) {
        if (isset($_FILES[$fieldName]) && $_FILES[$fieldName]['error'] === UPLOAD_ERR_OK) {
            $uploadedFile = $_FILES[$fieldName];
            break;
        }
    }
    
    if (!$uploadedFile) {
        throw new Exception('No file uploaded. Available fields: ' . implode(', ', array_keys($_FILES)));
    }
    
    // Get subPath from POST data if provided
    $subPath = isset($_POST['subPath']) ? $_POST['subPath'] : 'uploads';
    
    // Validate and sanitize subPath
    $subPath = preg_replace('/[^a-zA-Z0-9\/_-]/', '', $subPath); // Remove dangerous characters
    $subPath = trim($subPath, '/'); // Remove leading/trailing slashes
    
    // Validate file type (documents and images)
    $allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/bmp',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
    ];
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $uploadedFile['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Invalid file type: ' . $mimeType . '. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, Images, TXT, ZIP, RAR.');
    }
    
    // Validate file size (10MB max)
    $maxSize = 10 * 1024 * 1024; // 10MB
    if ($uploadedFile['size'] > $maxSize) {
        throw new Exception('File too large: ' . round($uploadedFile['size'] / 1024 / 1024, 2) . 'MB. Maximum size is 10MB.');
    }
    
    // Create upload directory structure
    $baseDir = __DIR__ . '/uploads';
    $uploadDir = $baseDir;
    
    if ($subPath) {
        $uploadDir = $baseDir . '/' . $subPath;
    }
    
    // Create directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory: ' . $uploadDir);
        }
        error_log("Created directory: " . $uploadDir);
    }
    
    // Check if directory is writable
    if (!is_writable($uploadDir)) {
        throw new Exception('Upload directory is not writable: ' . $uploadDir);
    }
    
    // Use the provided filename or generate a unique one
    $originalName = $uploadedFile['name'];
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    
    // If filename looks like it's already unique (timestamp_random.ext), use it
    if (preg_match('/^\d+_\d+\./i', $originalName) || preg_match('/^\d+_[a-z0-9]+\./i', $originalName)) {
        $filename = $originalName;
    } else {
        // Generate unique filename
        $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    }
    
    $targetPath = $uploadDir . '/' . $filename;
    
    // Move uploaded file to target directory
    if (!move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
        throw new Exception('Failed to save uploaded file to: ' . $targetPath);
    }
    
    // Set proper file permissions
    chmod($targetPath, 0644);
    
    error_log("File uploaded successfully: " . $targetPath);
    
    // Construct the URL
    $relativePath = $subPath ? $subPath . '/' . $filename : 'uploads/' . $filename;
    $fileUrl = 'https://rif-ii.org/' . $relativePath;
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'filename' => $filename,
        'url' => $fileUrl,
        'path' => $relativePath,
        'size' => $uploadedFile['size'],
        'type' => $mimeType,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    error_log("Upload error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'files_received' => array_keys($_FILES),
            'post_data' => array_keys($_POST),
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'unknown'
        ]
    ]);
}
?>










