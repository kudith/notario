import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Configure R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "notario-documents";
const ROOT_FOLDER_NAME = 'NotarioDocuments';

// Debug logging
const DEBUG = true;
const logFile = '/tmp/test-logs/r2-storage-debug.log';

function debugLog(message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  
  if (data) {
    if (typeof data === 'object') {
      logMessage += ` ${JSON.stringify(data, null, 2)}`;
    } else {
      logMessage += ` ${data}`;
    }
  }
  
  console.log(logMessage);
  
  try {
    // Ensure directory exists
    const dir = path.dirname(logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Append to log file
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Generate folder structure by date
export const generateFolderPath = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // Convert month number to name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1];
  
  return `${ROOT_FOLDER_NAME}/${year}/${monthName}/`;
};

// Upload file to R2
export const uploadPdfToR2 = async (buffer, fileName, metadata = {}) => {
  try {
    debugLog(`Starting upload to R2 for file: ${fileName}`);
    debugLog(`File size: ${buffer.length} bytes`);
    
    // Ensure the file has a .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    // Add date prefix to filename for better organization
    const now = new Date();
    const datePrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const organizedFileName = `${datePrefix}_${fileName}`;
    
    // Get folder path for current date
    const folderPath = generateFolderPath();
    const fullPath = `${folderPath}${organizedFileName}`;
    debugLog(`Using path for upload: ${fullPath}`);
    
    // Format metadata for storage
    const metadataObj = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) continue;
      
      // Convert objects to strings
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // R2 metadata values are limited in size
      metadataObj[key] = stringValue.length > 1024 ? 
        stringValue.substring(0, 1020) + '...' : stringValue;
    }
    
    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullPath,
      Body: buffer,
      ContentType: 'application/pdf',
      Metadata: metadataObj,
    });
    
    debugLog('Uploading file to R2');
    const response = await r2Client.send(command);
    debugLog('Upload successful');
    
    // Generate URLs
    const publicUrl = process.env.R2_PUBLIC_URL || 
      `https://${process.env.R2_PUBLIC_BUCKET || BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    const viewUrl = `${publicUrl}/${fullPath}`;
    const downloadUrl = viewUrl;
    
    return {
      fileId: fullPath, // Use the path as the ID
      fileName: organizedFileName,
      viewUrl: viewUrl,
      downloadUrl: downloadUrl,
      folderPath: folderPath
    };
  } catch (error) {
    debugLog("Error uploading file to R2", error);
    
    // Try with a simplified path as fallback
    try {
      debugLog("Attempting fallback upload to root of R2");
      
      const fallbackPath = `${ROOT_FOLDER_NAME}/${fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fallbackPath,
        Body: buffer,
        ContentType: 'application/pdf',
      });
      
      const response = await r2Client.send(command);
      debugLog("Fallback upload successful");
      
      const publicUrl = process.env.R2_PUBLIC_URL || 
        `https://${process.env.R2_PUBLIC_BUCKET || BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      
      const viewUrl = `${publicUrl}/${fallbackPath}`;
      
      return {
        fileId: fallbackPath,
        fileName: fileName,
        viewUrl: viewUrl,
        downloadUrl: viewUrl,
        folderPath: `/${ROOT_FOLDER_NAME}/`
      };
    } catch (fallbackError) {
      debugLog("Fallback upload failed", fallbackError);
      throw new Error(`Failed to upload file to R2: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
  }
};

// Get a file from R2
export const getFileFromR2 = async (fileId) => {
  try {
    debugLog(`Getting file from R2 with ID: ${fileId}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileId,
    });
    
    const response = await r2Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    debugLog('Retrieved file', { 
      fileName: fileId.split('/').pop(),
      size: buffer.length
    });
    
    const publicUrl = process.env.R2_PUBLIC_URL || 
      `https://${process.env.R2_PUBLIC_BUCKET || BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    const viewUrl = `${publicUrl}/${fileId}`;
    
    return {
      fileId: fileId,
      fileName: fileId.split('/').pop(),
      viewUrl: viewUrl,
      downloadUrl: viewUrl,
      buffer: buffer
    };
  } catch (error) {
    debugLog(`Error getting file with ID ${fileId}`, error);
    throw error;
  }
};

// Delete a file from R2
export const deleteFileFromR2 = async (fileId) => {
  try {
    debugLog(`Deleting file from R2 with ID: ${fileId}`);
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileId,
    });
    
    await r2Client.send(command);
    debugLog(`Successfully deleted file with ID: ${fileId}`);
    return true;
  } catch (error) {
    debugLog(`Error deleting file with ID ${fileId}`, error);
    throw error;
  }
};

/**
 * Downloads a file from R2 storage
 * @param {string} fileId - ID of the file to download
 * @returns {Promise<{buffer: Buffer, fileName: string}>} - The file data and name
 */
export async function downloadFileFromR2(fileId) {
  try {
    // Initialize S3 client (assuming it's already set up in your file)
    const s3 = getS3Client();
    
    // Get the object from the bucket
    const response = await s3.getObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileId,
    }).promise();
    
    // Extract the original file name from metadata if available
    const fileName = response.Metadata?.filename || `document-${fileId}.pdf`;
    
    return {
      buffer: response.Body,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error downloading file from R2:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}