"use client";

import { toast } from "sonner";

/**
 * Function to analyze a document before signing
 * @param {File} file - The document file to analyze
 * @returns {Promise<Object>} Analysis results including file hash and document metadata
 */
export async function analyzeDocument(file) {
  try {
    console.log("Starting document analysis process");
    
    // Create FormData to send file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send to the analyze endpoint
    console.log(`Analyzing document: ${file.name}`);
    const response = await fetch('/api/documents/analyze', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze document');
    }
    
    const result = await response.json();
    console.log("Document analysis completed successfully", { 
      type: result.analysis?.documentType,
      fileHash: result.fileHash?.substring(0, 8) + '...' // Show start of hash for debugging
    });
    
    return result;
  } catch (error) {
    console.error("Error analyzing document:", error);
    toast.error("Document analysis failed", {
      description: error.message || "Could not analyze document."
    });
    // Return null to indicate failure
    return null;
  }
}

/**
 * Detects if a string is in base64 format
 * @param {string} str - String to check
 * @returns {boolean} True if string appears to be base64 encoded
 */
function isBase64(str) {
  if (typeof str !== 'string') return false;
  // Base64 can contain A-Z, a-z, 0-9, +, /, and = for padding
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(str) && str.length % 4 === 0;
}

/**
 * Detects if a string is in hexadecimal format
 * @param {string} str - String to check
 * @returns {boolean} True if string appears to be hex encoded
 */
function isHex(str) {
  if (typeof str !== 'string') return false;
  // Hex strings contain only 0-9 and a-f (case insensitive)
  return /^[0-9a-f]+$/i.test(str);
}

/**
 * Formats a signature based on the algorithm type
 * @param {string|Object} signature - Signature to format
 * @param {string} algorithm - "RSA" or "ECDSA"
 * @returns {string} Properly formatted signature
 */
function formatSignature(signature, algorithm = "RSA") {
  try {
    // Log original signature format for debugging
    const originalType = typeof signature;
    if (originalType === 'string') {
      // Clean up whitespace from signature string
      signature = signature.replace(/\s+/g, '');
      
      if (isBase64(signature)) {
        console.log("Original signature is in base64 format");
      } else if (isHex(signature)) {
        console.log("Original signature is in hex format");
      } else {
        console.log("Original signature is in unknown string format");
      }
    } else {
      console.log(`Original signature is ${originalType} type`);
    }

    // Handle RSA signatures - prefer base64
    if (algorithm === "RSA") {
      // Case 1: Signature is already a base64 string
      if (typeof signature === 'string' && isBase64(signature)) {
        return signature;
      }
      
      // Case 2: Signature is a hex string that needs conversion
      if (typeof signature === 'string' && isHex(signature)) {
        try {
          // Convert hex to binary then to base64
          const buffer = Buffer.from(signature, 'hex');
          return buffer.toString('base64');
        } catch (e) {
          console.warn("Could not convert hex signature to base64:", e);
          return signature; // Return original if conversion fails
        }
      }
      
      // Case 3: Signature is a Buffer or ArrayBuffer
      if (typeof signature === 'object' && signature !== null) {
        // For Buffer objects
        if (Buffer.isBuffer(signature)) {
          return signature.toString('base64');
        }
        
        // For ArrayBuffer or TypedArray
        if (signature instanceof ArrayBuffer || 
            (signature.buffer && signature.buffer instanceof ArrayBuffer)) {
          return Buffer.from(
            signature instanceof ArrayBuffer ? signature : signature.buffer
          ).toString('base64');
        }
        
        // For signature objects with specific formats, try to stringify
        if (signature.toString) {
          try {
            return signature.toString('base64');
          } catch (err) {
            try {
              // Try JSON stringify as fallback
              return JSON.stringify(signature);
            } catch (jsonErr) {
              return String(signature);
            }
          }
        }
      }
    }
    
    // Handle ECDSA signatures - prefer hex
    if (algorithm === "ECDSA") {
      // Case 1: Signature is already a hex string
      if (typeof signature === 'string' && isHex(signature)) {
        return signature;
      }
      
      // Case 2: Signature is a base64 string that needs conversion
      if (typeof signature === 'string' && isBase64(signature)) {
        try {
          // Convert base64 to binary then to hex
          const buffer = Buffer.from(signature, 'base64');
          return buffer.toString('hex');
        } catch (e) {
          console.warn("Could not convert base64 signature to hex:", e);
          return signature; // Return original if conversion fails
        }
      }
      
      // Case 3: Signature is an object with r and s components (common for ECDSA)
      if (typeof signature === 'object' && signature !== null && 
          (signature.r !== undefined && signature.s !== undefined)) {
        try {
          // Convert r and s to hex strings and pad to ensure proper length
          const rHex = (typeof signature.r === 'string') 
            ? signature.r.padStart(64, '0') 
            : signature.r.toString(16).padStart(64, '0');
          
          const sHex = (typeof signature.s === 'string')
            ? signature.s.padStart(64, '0')
            : signature.s.toString(16).padStart(64, '0');
          
          // Combined hex format: concatenated r and s components
          return rHex + sHex;
        } catch (e) {
          console.error("Error converting r,s components to hex:", e);
        }
      }
      
      // Case 4: Signature is a Buffer or ArrayBuffer
      if (typeof signature === 'object' && signature !== null) {
        // For Buffer objects
        if (Buffer.isBuffer(signature)) {
          return signature.toString('hex');
        }
        
        // For ArrayBuffer or TypedArray
        if (signature instanceof ArrayBuffer || 
            (signature.buffer && signature.buffer instanceof ArrayBuffer)) {
          return Buffer.from(
            signature instanceof ArrayBuffer ? signature : signature.buffer
          ).toString('hex');
        }
      }
    }
    
    // Fallback: If we can't determine the format, return as string
    if (typeof signature === 'string') {
      return signature;
    } else if (typeof signature === 'object' && signature !== null) {
      try {
        return JSON.stringify(signature);
      } catch (e) {
        return String(signature);
      }
    } else {
      return String(signature);
    }
  } catch (e) {
    console.error("Error formatting signature:", e);
    // Return original signature if processing fails
    return typeof signature === 'string' ? signature : String(signature);
  }
}

/**
 * Formats a public key to ensure it has proper PEM headers
 * @param {string} publicKey - The public key to format
 * @param {string} algorithm - Either "RSA" or "ECDSA"
 * @returns {string} Properly formatted public key
 */
function formatPublicKey(publicKey, algorithm = "RSA") {
  try {
    // If the key already has PEM headers, return it as is
    if (typeof publicKey === 'string' && 
        (publicKey.includes('-----BEGIN') && publicKey.includes('-----END'))) {
      return publicKey;
    }
    
    // Otherwise, add appropriate PEM headers based on algorithm
    if (typeof publicKey === 'string') {
      // Clean the key (remove any existing headers and whitespace)
      const cleanKey = publicKey
        .replace(/-----BEGIN.*?-----/g, '')
        .replace(/-----END.*?-----/g, '')
        .replace(/\s/g, '');
      
      // Format with appropriate headers
      if (algorithm === "ECDSA") {
        return `-----BEGIN PUBLIC KEY-----\n${cleanKey}\n-----END PUBLIC KEY-----`;
      } else {
        // Default to RSA format
        return `-----BEGIN PUBLIC KEY-----\n${cleanKey}\n-----END PUBLIC KEY-----`;
      }
    }
    
    // If not a string, return as is (server will handle error)
    return publicKey;
  } catch (e) {
    console.error("Error formatting public key:", e);
    return publicKey;
  }
}

/**
 * Detect the user's algorithm from their profile data
 * @returns {Promise<string>} The user's preferred algorithm or "RSA" as default
 */
async function detectUserAlgorithm() {
  try {
    // Get user profile data from API
    const response = await fetch('/api/user/me', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      
      // Extract algorithm from the security section of user data
      // Return RSA as default if security or algorithm is missing
      return userData?.security?.algorithm || "RSA";
    }
  } catch (error) {
    console.warn("Could not detect user algorithm:", error);
  }
  
  // Default to RSA if API call fails or data is missing
  return "RSA";
}

/**
 * Sign and save a document with comprehensive error handling
 * @param {File} file - Document file to sign
 * @param {string} fileHash - Calculated hash of the file
 * @param {string|Object} signature - Digital signature
 * @param {string} publicKey - User's public key
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object with document info
 */
export async function signDocument(file, fileHash, signature, publicKey, options = {}) {
  try {
    console.log("Starting document signing process");
    
    // Get algorithm preference from options, user settings, or default to RSA
    const algorithm = options.algorithm || await detectUserAlgorithm();
    console.log(`Using ${algorithm} algorithm for signing`);
    
    // Format the signature and public key properly based on algorithm
    const formattedSignature = formatSignature(signature, algorithm);
    const formattedPublicKey = formatPublicKey(publicKey, algorithm);
    
    // Log detailed information for debugging
    console.log("Original signature type:", typeof signature);
    console.log("Formatted signature type:", typeof formattedSignature);
    
    if (typeof signature === 'string' && signature.length > 20) {
      console.log("Original signature preview:", signature.substring(0, 20) + "...");
    }
    
    if (typeof formattedSignature === 'string' && formattedSignature.length > 20) {
      console.log("Formatted signature preview:", formattedSignature.substring(0, 20) + "...");
    }
    
    // Create FormData to send file and metadata in one request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileHash', fileHash);
    formData.append('signature', formattedSignature);
    formData.append('publicKey', formattedPublicKey);
    
    // Add algorithm information explicitly
    formData.append('algorithm', algorithm);
    
    // Add any optional parameters
    if (options.analysisData) {
      console.log("Including pre-analyzed document data in signing request");
      formData.append('analysisData', JSON.stringify(options.analysisData));
    }
    
    if (options.notes) {
      formData.append('notes', options.notes);
    }
    
    if (options.tags) {
      formData.append('tags', options.tags);
    }
    
    if (options.qrPosition) {
      formData.append('qrPosition', options.qrPosition);
    }
    
    // Add timestamp if available
    if (options.timestamp) {
      console.log(`Including timestamp in signature data: ${options.timestamp}`);
      formData.append('timestamp', options.timestamp);
    }
    
    console.log("Sending file to sign API", { 
      fileName: file.name, 
      fileSize: file.size,
      hash: fileHash?.substring(0, 8) + '...', // Show start of hash for debugging
      algorithm: algorithm
    });
    
    // Send everything to our API endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch('/api/documents/sign', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("Sign API response status:", response.status);
      
      // Handle cases where we might not get valid JSON
      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        result = { error: "Invalid server response format" };
      }
      
      // Handle case where document has already been signed
      if (response.status === 409) {
        toast.warning("Document already signed", {
          description: "This document has been previously signed and cannot be signed again.",
          duration: 5000
        });
        
        console.log("Document already signed", result.documentInfo);
        
        // Extract folder path from metadata if available
        const folderPath = result.documentInfo?.metadata?.folderPath || 
                           result.documentInfo?.folderPath || 
                           '/NotarioDocuments/';
        
        return {
          alreadySigned: true,
          documentInfo: {
            ...result.documentInfo,
            folderPath: folderPath
          },
          error: result.error
        };
      }
      
      if (!response.ok) {
        console.error("API error:", result.error || 'Unknown error');
        
        // Format more user-friendly error messages
        let errorMessage = result.error || 'Failed to sign document';
        if (errorMessage.includes('Invalid signature')) {
          errorMessage = 'Signature validation failed. Please try signing again.';
        } else if (errorMessage.includes('unsupported')) {
          errorMessage = 'Incompatible signature format. Please check your settings.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("Document signed successfully", { 
        id: result.savedDoc?.id, 
        certificateId: result.savedDoc?.certificateId || result.certificateId
      });
      
      // Extract folder path from various possible locations
      const folderPath = result.savedDoc?.metadata?.folderPath || 
                         result.folderPath || 
                         '/NotarioDocuments/';
      
      // Return the document and all necessary URLs/IDs
      return {
        savedDoc: result.savedDoc,
        pdfUrl: result.signedPdfUrl,
        driveFileId: result.driveFileId || result.savedDoc?.driveFileId,
        driveViewUrl: result.driveViewUrl || result.savedDoc?.driveViewUrl,
        driveDownloadUrl: result.driveDownloadUrl || result.savedDoc?.driveDownloadUrl,
        certificateId: result.certificateId || result.savedDoc?.certificateId,
        folderPath: folderPath,
        metadata: result.metadata || result.savedDoc?.metadata
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle specific fetch errors
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout. Server took too long to respond.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error in signDocument:", error);
    
    // Show user-friendly error message
    toast.error("Document signing failed", {
      description: error.message || "Could not sign and save document."
    });
    
    throw error;
  }
}

/**
 * Get user documents with comprehensive filtering options
 * @param {string} userId - The user ID to fetch documents for
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Documents result
 */
export async function getUserDocuments(userId, options = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    
    // Add sorting and filtering options
    if (options.sort) params.append('sort', options.sort);
    if (options.limit) params.append('limit', options.limit);
    if (options.page) params.append('page', options.page);
    if (options.filter) params.append('filter', options.filter);
    if (options.status) params.append('status', options.status);
    if (options.type) params.append('type', options.type);
    
    // Send request with parameters
    const response = await fetch(`/api/documents?${params.toString()}`, {
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch documents');
    }
    
    const documents = await response.json();
    return { 
      success: true, 
      data: documents, 
      pagination: {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || documents.length,
        total: documents.totalCount || documents.length
      }
    };
  } catch (error) {
    console.error("Error fetching documents:", error);
    toast.error("Failed to fetch documents", {
      description: error.message || "Could not retrieve your documents."
    });
    return { success: false, error: error.message || 'Failed to fetch documents' };
  }
}

/**
 * Verify if a document has been previously signed by uploading it
 * @param {File} file - Document file to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyDocument(file) {
  try {
    // Create FormData to send file
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading toast
    const loadingToast = toast.loading("Verifying document...");
    
    // Send to verification endpoint
    const response = await fetch('/api/documents/verify', {
      method: 'POST',
      body: formData,
    });
    
    // Dismiss loading toast
    toast.dismiss(loadingToast);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify document');
    }
    
    const result = await response.json();
    
    // Show success or not found toast based on result
    if (result.verified) {
      toast.success("Document verified", {
        description: `Signed by ${result.signedBy || 'a verified user'}`
      });
    } else {
      toast.info("Document not found", {
        description: "No signature record found for this document."
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error verifying document:", error);
    toast.error("Document verification failed", {
      description: error.message || "Could not verify document."
    });
    return { 
      verified: false, 
      error: error.message || 'Failed to verify document' 
    };
  }
}

/**
 * Verify document by certificate ID or hash
 * @param {string|null} certificateId - Certificate ID to verify
 * @param {string|null} fileHash - Document hash to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyDocumentByIdentifier(certificateId = null, fileHash = null) {
  try {
    if (!certificateId && !fileHash) {
      throw new Error('Either certificateId or fileHash must be provided');
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (certificateId) params.append('certificateId', certificateId);
    if (fileHash) params.append('fileHash', fileHash);
    
    // Show loading toast
    const loadingToast = toast.loading("Verifying document...");
    
    // Send to verification endpoint
    const response = await fetch(`/api/documents/verify?${params.toString()}`, {
      method: 'GET',
    });
    
    // Dismiss loading toast
    toast.dismiss(loadingToast);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify document');
    }
    
    const result = await response.json();
    
    // Show success or not found toast based on result
    if (result.verified) {
      toast.success("Document verified", {
        description: `Signed by ${result.signedBy || 'a verified user'}`
      });
    } else {
      toast.info("Document not found", {
        description: "No signature record found for this document."
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error verifying document by identifier:", error);
    toast.error("Document verification failed", {
      description: error.message || "Could not verify document."
    });
    return { 
      verified: false, 
      error: error.message || 'Failed to verify document' 
    };
  }
}

/**
 * Check if a document has already been signed based on its hash
 * @param {string} fileHash - Document hash to check
 * @returns {Promise<Object>} Result indicating if document exists
 */
export async function checkDocumentExists(fileHash) {
  try {
    if (!fileHash) {
      throw new Error('Document hash is required');
    }
    
    const response = await fetch(`/api/documents/check?fileHash=${fileHash}`, {
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check document');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error checking document:", error);
    // Don't show a toast for this as it's often a background operation
    return { exists: false, error: error.message };
  }
}

/**
 * Get document details by ID
 * @param {string} documentId - Document ID to fetch
 * @returns {Promise<Object>} Document details
 */
export async function getDocumentById(documentId) {
  try {
    if (!documentId) {
      throw new Error('Document ID is required');
    }
    
    const response = await fetch(`/api/documents/${documentId}`, {
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch document');
    }
    
    const document = await response.json();
    return { success: true, data: document };
  } catch (error) {
    console.error("Error fetching document:", error);
    toast.error("Failed to fetch document", {
      description: error.message || "Could not retrieve document details."
    });
    return { success: false, error: error.message || 'Failed to fetch document' };
  }
}

/**
 * Delete a document by ID
 * @param {string} documentId - Document ID to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDocument(documentId) {
  try {
    if (!documentId) {
      throw new Error('Document ID is required');
    }
    
    // Confirm deletion
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return { success: false, cancelled: true };
    }
    
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete document');
    }
    
    toast.success("Document deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    toast.error("Failed to delete document", {
      description: error.message || "Could not delete document."
    });
    return { success: false, error: error.message || 'Failed to delete document' };
  }
}

/**
 * Comprehensive document service exports
 */
export default {
  analyzeDocument,
  signDocument,
  getUserDocuments,
  verifyDocument,
  verifyDocumentByIdentifier,
  checkDocumentExists,
  getDocumentById,
  deleteDocument,
  
  // Format utilities exposed for testing/debugging
  utils: {
    formatSignature,
    formatPublicKey,
    isBase64,
    isHex
  }
};