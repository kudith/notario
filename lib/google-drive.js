import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// Configure Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const ROOT_FOLDER_NAME = 'NotarioDocuments';

// Cache for folder IDs
const folderCache = {
  root: null,
  years: {},
  months: {}
};

// Debug logging
const DEBUG = true;
const logFile = '/tmp/test-logs/google-drive-debug.log';

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

// Initialize the Google Auth client
const getAuthClient = () => {
  try {
    debugLog('Initializing Google Auth client');
    
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Drive credentials not properly configured');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });
    
    debugLog('Google Auth client initialized');
    return auth;
  } catch (error) {
    debugLog('Error initializing Google Auth client', error);
    throw error;
  }
};

// Get the Google Drive API client
const getDriveClient = async () => {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    debugLog('Google Drive client initialized');
    return drive;
  } catch (error) {
    debugLog('Error getting Google Drive client', error);
    throw error;
  }
};

// Create a folder in Google Drive
const createFolder = async (name, parentId = null) => {
  try {
    debugLog(`Creating folder "${name}"${parentId ? ` with parent ID ${parentId}` : ''}`);
    
    const drive = await getDriveClient();
    
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    if (parentId) {
      fileMetadata.parents = [parentId];
    }
    
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name'
    });
    
    debugLog(`Created folder "${name}" with ID ${folder.data.id}`);
    return folder.data.id;
  } catch (error) {
    debugLog(`Error creating folder "${name}"`, error);
    throw error;
  }
};

// Get folder ID if exists, otherwise create it
const getFolderIdByName = async (name, parentId = null) => {
  try {
    debugLog(`Checking for folder "${name}"${parentId ? ` with parent ID ${parentId}` : ''}`);
  
    const drive = await getDriveClient();
  
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    debugLog(`Query for folder search: ${query}`);
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
  
    if (response.data.files && response.data.files.length > 0) {
      debugLog(`Found existing folder "${name}" with ID ${response.data.files[0].id}`);
      return response.data.files[0].id;
    }
    
    debugLog(`No existing folder "${name}" found, creating new one`);
    return await createFolder(name, parentId);
  } catch (error) {
    debugLog(`Error getting/creating folder "${name}"`, error);
    throw error;
  }
};

// Get or create the root Notario documents folder 
export const getOrCreateNotarioFolder = async () => {
  try {
    if (folderCache.root) {
      debugLog(`Using cached root folder ID: ${folderCache.root}`);
      return folderCache.root;
    }
    
    debugLog('Getting or creating root folder');
    folderCache.root = await getFolderIdByName(ROOT_FOLDER_NAME);
    debugLog(`Root folder ID: ${folderCache.root}`);
    
    return folderCache.root;
  } catch (error) {
    debugLog('Error getting or creating root folder', error);
    throw error;
  }
};

// Get or create year folder
export const getOrCreateYearFolder = async (year) => {
  try {
    if (folderCache.years[year]) {
      debugLog(`Using cached year folder ID for ${year}: ${folderCache.years[year]}`);
      return folderCache.years[year];
    }
    
    debugLog(`Getting or creating year folder for ${year}`);
    const rootFolderId = await getOrCreateNotarioFolder();
    folderCache.years[year] = await getFolderIdByName(year.toString(), rootFolderId);
    debugLog(`Year folder ID for ${year}: ${folderCache.years[year]}`);
    
    return folderCache.years[year];
  } catch (error) {
    debugLog(`Error getting or creating year folder for ${year}`, error);
    throw error;
  }
};

// Get or create month folder
export const getOrCreateMonthFolder = async (year, month) => {
  try {
    const cacheKey = `${year}-${month}`;
    if (folderCache.months[cacheKey]) {
      debugLog(`Using cached month folder ID for ${cacheKey}: ${folderCache.months[cacheKey]}`);
      return folderCache.months[cacheKey];
    }
    
    // Convert month number to name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1]; // month is 1-indexed
    
    debugLog(`Getting or creating month folder for ${monthName} ${year}`);
    const yearFolderId = await getOrCreateYearFolder(year);
    folderCache.months[cacheKey] = await getFolderIdByName(monthName, yearFolderId);
    debugLog(`Month folder ID for ${monthName} ${year}: ${folderCache.months[cacheKey]}`);
    
    return folderCache.months[cacheKey];
  } catch (error) {
    debugLog(`Error getting or creating month folder for month ${month} year ${year}`, error);
    throw error;
  }
};

// Process metadata to ensure it fits Google Drive's limits
const processMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  
  const processedMetadata = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    
    // Convert to string representation
    const keyStr = String(key).trim();
    let valueStr = typeof value === 'object' ? 
      JSON.stringify(value) : String(value);
    
    // Check combined length (key + value must be < 124 bytes in UTF-8)
    const combinedBytes = new TextEncoder().encode(keyStr + valueStr).length;
    
    if (combinedBytes < 124) {
      processedMetadata[keyStr] = valueStr;
    } else {
      // Truncate value to fit limit
      while (valueStr) {
        const truncated = valueStr.substring(0, valueStr.length - 10);
        const truncatedBytes = new TextEncoder().encode(keyStr + truncated).length;
        
        if (truncatedBytes < 124) {
          processedMetadata[keyStr] = truncated;
          break;
        }
        
        valueStr = truncated;
      }
      
      // If still too long, skip this metadata item
      if (!processedMetadata[keyStr]) {
        debugLog(`Skipping metadata key "${keyStr}" as it's too large even when truncated`);
      }
    }
  }
  
  return Object.keys(processedMetadata).length > 0 ? processedMetadata : undefined;
};

// Upload a PDF file to Google Drive with folder organization
export const uploadPdfToDrive = async (buffer, fileName, metadata = {}) => {
  try {
    debugLog(`Starting upload for file: ${fileName}`);
    debugLog(`File size: ${buffer.length} bytes`);
    
    const drive = await getDriveClient();
    
    // Get current date for folder structure
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed
    
    // Convert month number to name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Get folder for current year and month
    debugLog(`Creating folder structure for ${year}/${monthNames[month-1]}`);
    const folderId = await getOrCreateMonthFolder(year, month);
    debugLog(`Using folder ID for upload: ${folderId}`);
  
    // Create a readable stream from buffer
    const readable = new Readable();
    readable._read = () => {}; // _read is required but can be a no-op
    readable.push(buffer);
    readable.push(null);
    
    // Ensure the file has a .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    // Add date prefix to filename for better organization
    const datePrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const organizedFileName = `${datePrefix}_${fileName}`;
    
    debugLog(`Prepared filename: ${organizedFileName}`);
    
    // Process metadata to ensure it meets Google Drive's requirements
    const processedMetadata = processMetadata(metadata);
    debugLog('Processed metadata', processedMetadata);
  
    const fileMetadata = {
      name: organizedFileName,
      parents: [folderId],
    };
    
    // Only add appProperties if we have valid processed metadata
    if (processedMetadata) {
      fileMetadata.appProperties = processedMetadata;
    }
    
    debugLog('Uploading file to Google Drive', { filename: organizedFileName, folderId });
  
    const media = {
      mimeType: 'application/pdf',
      body: readable
    };
    
    // First attempt to upload the file
    debugLog('Creating file in Google Drive');
    let response;
    
    try {
      response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });
    } catch (uploadError) {
      debugLog('Error during file upload, trying with root folder only', uploadError);
      
      // Retry with just the root folder
      const rootFolderId = await getOrCreateNotarioFolder();
      
      response = await drive.files.create({
        resource: {
          name: organizedFileName,
          parents: [rootFolderId],
          // Only add appProperties if valid
          ...(processedMetadata ? { appProperties: processedMetadata } : {})
        },
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });
    }
    
    debugLog(`File uploaded with ID: ${response.data.id}`);
    
    // Make file publicly accessible for viewing (but not editing)
    debugLog('Making file publicly accessible');
    await drive.permissions.create({
      fileId: response.data.id,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    debugLog('File permissions updated for public access');
  
    // Get the updated file with link information
    debugLog('Getting updated file information');
    const file = await drive.files.get({
      fileId: response.data.id,
      fields: 'id, name, webViewLink, webContentLink',
    });
    
    debugLog('Retrieved file information', { 
      id: file.data.id, 
      name: file.data.name,
      webViewLink: file.data.webViewLink
    });
    
    const folderPath = `/${ROOT_FOLDER_NAME}/${year}/${monthNames[month-1]}/`;
    debugLog(`Complete folder path: ${folderPath}`);
    
    return {
      fileId: file.data.id,
      fileName: file.data.name,
      viewUrl: file.data.webViewLink,
      downloadUrl: file.data.webContentLink,
      folderPath: folderPath
    };
  } catch (error) {
    debugLog("Error uploading file to Google Drive", error);
    
    // Try uploading directly to root as fallback
    try {
      debugLog("Attempting fallback upload to root of Google Drive");
      
      const drive = await getDriveClient();
      
      // Create a readable stream from buffer
      const readable = new Readable();
      readable._read = () => {};
      readable.push(buffer);
      readable.push(null);
      
      // Ensure the file has a .pdf extension
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }
      
      const fallbackResponse = await drive.files.create({
        resource: {
          name: fileName
        },
        media: {
          mimeType: 'application/pdf',
          body: readable
        },
        fields: 'id, name, webViewLink, webContentLink'
      });
      
      debugLog("Fallback upload successful", fallbackResponse.data);
      
      // Make file publicly accessible
      await drive.permissions.create({
        fileId: fallbackResponse.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });
      
      const file = await drive.files.get({
        fileId: fallbackResponse.data.id,
        fields: 'id, name, webViewLink, webContentLink',
      });
      
      return {
        fileId: file.data.id,
        fileName: file.data.name,
        viewUrl: file.data.webViewLink,
        downloadUrl: file.data.webContentLink,
        folderPath: '/Root/'
      };
    } catch (fallbackError) {
      debugLog("Fallback upload failed", fallbackError);
      throw new Error(`Failed to upload file to Google Drive: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
  }
};

// Get a file from Google Drive by ID
export const getFileFromDrive = async (fileId) => {
  try {
    debugLog(`Getting file from Drive with ID: ${fileId}`);
    
    const drive = await getDriveClient();
  
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink, webContentLink',
    });
    
    debugLog('Retrieved file', { 
      id: file.data.id, 
      name: file.data.name
    });
  
    return {
      fileId: file.data.id,
      fileName: file.data.name,
      viewUrl: file.data.webViewLink,
      downloadUrl: file.data.webContentLink,
    };
  } catch (error) {
    debugLog(`Error getting file with ID ${fileId}`, error);
    throw error;
  }
};

// Download a file directly from Google Drive
export const downloadFileFromDrive = async (fileId) => {
  try {
    debugLog(`Downloading file from Drive with ID: ${fileId}`);
    
    const drive = await getDriveClient();
  
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );
  
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'name'
    });
    
    debugLog(`Downloaded file: ${fileMetadata.data.name}, size: ${response.data.byteLength} bytes`);
  
    return {
      buffer: Buffer.from(response.data),
      fileName: fileMetadata.data.name,
      mimeType: 'application/pdf',
    };
  } catch (error) {
    debugLog(`Error downloading file with ID ${fileId}`, error);
    throw error;
  }
};

// Delete a file from Google Drive
export const deleteFileFromDrive = async (fileId) => {
  try {
    debugLog(`Deleting file from Drive with ID: ${fileId}`);
    
    const drive = await getDriveClient();
    await drive.files.delete({
      fileId: fileId,
    });
  
    debugLog(`Successfully deleted file with ID: ${fileId}`);
    return true;
  } catch (error) {
    debugLog(`Error deleting file with ID ${fileId}`, error);
    throw error;
  }
};