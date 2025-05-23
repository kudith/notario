import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { uploadPdfToDrive } from "@/lib/google-drive";
import crypto from "crypto";

// Helper functions
async function calculateFileHash(buffer) {
  try {
    // Use SHA-256 for file hashing
    const hash = crypto.createHash("sha256");
    hash.update(buffer);
    return hash.digest("hex");
  } catch (error) {
    console.error("Error calculating file hash:", error);
    throw new Error(`Failed to calculate file hash: ${error.message}`);
  }
}

// Extract metadata from PDF
async function extractPdfMetadata(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const title = pdfDoc.getTitle() || "";
    const author = pdfDoc.getAuthor() || "";
    const subject = pdfDoc.getSubject() || "";
    const keywords = pdfDoc.getKeywords() || "";
    const creator = pdfDoc.getCreator() || "";
    const producer = pdfDoc.getProducer() || "";
    const creationDate = pdfDoc.getCreationDate();
    const modificationDate = pdfDoc.getModificationDate();
    const pageCount = pdfDoc.getPageCount();

    return {
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      creationDate: creationDate ? creationDate.toString() : null,
      modificationDate: modificationDate ? modificationDate.toString() : null,
      pageCount,
    };
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    return {
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: null,
      modificationDate: null,
      pageCount: 0,
    };
  }
}

// Enhanced signature verification function with comprehensive debugging and support for multiple signature formats
async function verifySignature(fileHash, signature, publicKey, algorithm, timestamp = null) {
  try {
    console.log(`Detailed verification for ${algorithm} signature`);
    console.log(`Hash to verify: ${fileHash.substring(0, 20)}...`);

    // Ensure public key has proper PEM format
    let formattedPublicKey = publicKey;
    if (!publicKey.includes("-----BEGIN")) {
      formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    // Clean up the signature by removing whitespace
    let cleanedSignature = signature;
    if (typeof signature === 'string') {
      cleanedSignature = signature.replace(/\s+/g, '');
      console.log(`Cleaned signature (removed whitespace), new length: ${cleanedSignature.length}`);
    }

    // Convert signature to buffer appropriately
    let signatureBuffer;
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanedSignature) && cleanedSignature.length % 4 === 0;
    
    try {
      if (isBase64) {
        signatureBuffer = Buffer.from(cleanedSignature, "base64");
        console.log(`Converted base64 signature to buffer, length: ${signatureBuffer.length}`);
      } else {
        signatureBuffer = Buffer.from(cleanedSignature, "hex");
        console.log(`Converted hex signature to buffer, length: ${signatureBuffer.length}`);
      }
    } catch (convError) {
      console.error("Error converting signature:", convError);
      return { valid: false, error: "Signature format conversion error", details: convError.message };
    }

    // Log key information for debugging
    console.log(`Signature buffer length: ${signatureBuffer.length} bytes`);
    console.log(`Public key format: ${formattedPublicKey.includes("BEGIN PUBLIC KEY") ? "PEM" : "Other"}`);

    // Create results object to track verification attempts
    const results = {
      attempts: [],
      bestApproach: null
    };

    if (algorithm === "RSA") {
      // === NEW APPROACH ADDED: Try common data preparation patterns ===
      
      // Clear debug output to understand what's happening
      console.log("DEBUG verification:");
      console.log(`- File hash: ${fileHash}`);
      console.log(`- Timestamp: ${timestamp || 'None provided'}`);

      // If timestamp is provided, try with explicit approach
      if (timestamp) {
        try {
          // Explicit attempt with exact format: fileHash|timestamp
          const dataToVerify = `${fileHash}|${timestamp}`;
          console.log(`- Exact format to verify: "${dataToVerify.substring(0, 40)}..."`);
          
          const verify = crypto.createVerify("SHA256");
          verify.update(dataToVerify);
          const result = verify.verify(formattedPublicKey, signatureBuffer);
          console.log(`- Exact timestamp format check: ${result}`);
          results.attempts.push({ approach: "hash|timestamp", result, data: dataToVerify.substring(0, 20) + "..." });
          if (result) {
            results.bestApproach = "hash|timestamp";
            return { valid: true, approach: "hash|timestamp", results };
          }
        } catch (err) {
          console.log("Exact format attempt failed:", err.message);
          results.attempts.push({ approach: "hash|timestamp", result: false, error: err.message });
        }
      }
      
      // Try with UTF-8 encoding (sometimes clients encode the hash as UTF-8)
      try {
        const verify = crypto.createVerify("SHA256");
        const hashAsUtf8 = Buffer.from(fileHash).toString('utf8');
        console.log(`Trying hash as UTF-8 string: ${hashAsUtf8.substring(0, 20)}...`);
        verify.update(hashAsUtf8);
        const result = verify.verify(formattedPublicKey, signatureBuffer);
        console.log(`UTF-8 encoding approach: ${result}`);
        results.attempts.push({ approach: "utf8_encoding", result });
        if (result) {
          results.bestApproach = "utf8_encoding";
          return { valid: true, approach: "utf8_encoding", results };
        }
      } catch (err) {
        console.log("UTF-8 approach failed:", err.message);
        results.attempts.push({ approach: "utf8_encoding", result: false, error: err.message });
      }
      
      // Try with different timestamp formats if provided
      if (timestamp) {
        // Common timestamp formats
        const timestampFormats = [
          timestamp,  // As provided
          new Date(timestamp).toISOString(),  // ISO format
          new Date(timestamp).getTime().toString()  // Unix timestamp as string
        ];
        
        for (const tsFormat of timestampFormats) {
          try {
            // Format 1: Hash|Timestamp
            const dataToVerify1 = `${fileHash}|${tsFormat}`;
            console.log(`Trying format Hash|Timestamp: ${dataToVerify1.substring(0, 30)}...`);
            const verify1 = crypto.createVerify("SHA256");
            verify1.update(dataToVerify1);
            const result1 = verify1.verify(formattedPublicKey, signatureBuffer);
            console.log(`Hash|Timestamp format: ${result1}`);
            results.attempts.push({ approach: `hash|timestamp_${tsFormat.substring(0, 10)}`, result: result1 });
            if (result1) {
              results.bestApproach = `hash|timestamp_${tsFormat.substring(0, 10)}`;
              return { valid: true, approach: `hash|timestamp_${tsFormat.substring(0, 10)}`, results };
            }
            
            // Format 2: Timestamp|Hash
            const dataToVerify2 = `${tsFormat}|${fileHash}`;
            console.log(`Trying format Timestamp|Hash: ${dataToVerify2.substring(0, 30)}...`);
            const verify2 = crypto.createVerify("SHA256");
            verify2.update(dataToVerify2);
            const result2 = verify2.verify(formattedPublicKey, signatureBuffer);
            console.log(`Timestamp|Hash format: ${result2}`);
            results.attempts.push({ approach: `timestamp_${tsFormat.substring(0, 10)}|hash`, result: result2 });
            if (result2) {
              results.bestApproach = `timestamp_${tsFormat.substring(0, 10)}|hash`;
              return { valid: true, approach: `timestamp_${tsFormat.substring(0, 10)}|hash`, results };
            }
          } catch (err) {
            console.log(`Timestamp format failed (${tsFormat}):`, err.message);
            results.attempts.push({ approach: `timestamp_format_${tsFormat.substring(0, 10)}`, result: false, error: err.message });
          }
        }
      }
      
      // --- STANDARD APPROACHES ---
      
      // 1. Direct verification with hex hash string
      try {
        const verify = crypto.createVerify("SHA256");
        verify.update(fileHash);
        const result = verify.verify(formattedPublicKey, signatureBuffer);
        console.log(`Approach 1 - Direct hex hash (SHA256): ${result}`);
        results.attempts.push({ approach: "direct_hex_hash", result });
        if (result) {
          results.bestApproach = "direct_hex_hash";
          return { valid: true, approach: "direct_hex_hash", results };
        }
      } catch (err) {
        console.log("Approach 1 failed:", err.message);
        results.attempts.push({ approach: "direct_hex_hash", result: false, error: err.message });
      }
      
      // 2. Binary hash buffer (common approach)
      try {
        const hashBuffer = Buffer.from(fileHash, "hex");
        const verify = crypto.createVerify("SHA256");
        verify.update(hashBuffer);
        const result = verify.verify(formattedPublicKey, signatureBuffer);
        console.log(`Approach 2 - Binary hash buffer (SHA256): ${result}`);
        results.attempts.push({ approach: "binary_hash_buffer", result });
        if (result) {
          results.bestApproach = "binary_hash_buffer";
          return { valid: true, approach: "binary_hash_buffer", results };
        }
      } catch (err) {
        console.log("Approach 2 failed:", err.message);
        results.attempts.push({ approach: "binary_hash_buffer", result: false, error: err.message });
      }
      
      // 3. Try SHA-1 algorithm (some clients use this)
      try {
        const verify = crypto.createVerify("SHA1");
        verify.update(fileHash);
        const result = verify.verify(formattedPublicKey, signatureBuffer);
        console.log(`Approach 3 - SHA1 algorithm: ${result}`);
        results.attempts.push({ approach: "sha1_algorithm", result });
        if (result) {
          results.bestApproach = "sha1_algorithm";
          return { valid: true, approach: "sha1_algorithm", results };
        }
      } catch (err) {
        console.log("Approach 3 failed:", err.message);
        results.attempts.push({ approach: "sha1_algorithm", result: false, error: err.message });
      }
      
      // 4. Try with different key format
      try {
        const verify = crypto.createVerify("SHA256");
        verify.update(fileHash);
        try {
          const rsaKey = crypto.createPublicKey({
            key: formattedPublicKey,
            format: 'pem',
            type: 'spki'
          });
          const result = verify.verify(rsaKey, signatureBuffer);
          console.log(`Approach 4 - Different key format: ${result}`);
          results.attempts.push({ approach: "different_key_format", result });
          if (result) {
            results.bestApproach = "different_key_format";
            return { valid: true, approach: "different_key_format", results };
          }
        } catch (keyErr) {
          console.log("Key format conversion failed:", keyErr.message);
          results.attempts.push({ approach: "different_key_format", result: false, error: keyErr.message });
        }
      } catch (err) {
        console.log("Approach 4 failed:", err.message);
        results.attempts.push({ approach: "different_key_format", result: false, error: err.message });
      }
      
      // If all approaches fail, verification failed
      console.error("All RSA verification approaches failed");
      return { valid: false, error: "All verification approaches failed", results };
    } 
    // ECDSA verification
    else if (algorithm === "ECDSA") {
      try {
        console.log("Enhanced ECDSA verification with P1363 encoding support");
        
        // Convert base64 signature to buffer
        const signatureBuffer = Buffer.from(cleanedSignature, 'base64');
        console.log(`Raw signature buffer length: ${signatureBuffer.length} bytes`);
        
        // Create a public key object from the PEM format
        const publicKeyObject = crypto.createPublicKey({
          key: formattedPublicKey,
          format: 'pem',
        });
        console.log("Public key successfully imported as", publicKeyObject.asymmetricKeyType);
        
        // Try verification with the timestamp using IEEE P1363 format (which Web Crypto uses)
        if (timestamp) {
          try {
            const dataToVerify = `${fileHash}|${timestamp}`;
            console.log(`Verifying timestamped data: ${dataToVerify.substring(0, 30)}...`);
            
            // Use crypto.verify with explicit ieee-p1363 format - this is the key fix
            const result = crypto.verify(
              'sha256',
              Buffer.from(dataToVerify),
              {
                key: publicKeyObject,
                dsaEncoding: 'ieee-p1363'  // Specify raw format (r,s) from Web Crypto
              },
              signatureBuffer
            );
            
            console.log(`ECDSA P1363 timestamp verification: ${result}`);
            results.attempts.push({ approach: "ecdsa_p1363_timestamp", result });
            if (result) {
              results.bestApproach = "ecdsa_p1363_timestamp";
              return { valid: true, approach: "ecdsa_p1363_timestamp", results };
            }
          } catch (err) {
            console.log("P1363 timestamp verification failed:", err.message);
            results.attempts.push({ approach: "ecdsa_p1363_timestamp", result: false, error: err.message });
          }
        }
        
        // Also try standard verification without timestamp
        try {
          const result = crypto.verify(
            'sha256',
            Buffer.from(fileHash),
            {
              key: publicKeyObject,
              dsaEncoding: 'ieee-p1363'
            },
            signatureBuffer
          );
          console.log(`ECDSA P1363 standard verification: ${result}`);
          results.attempts.push({ approach: "ecdsa_p1363_standard", result });
          if (result) {
            results.bestApproach = "ecdsa_p1363_standard";
            return { valid: true, approach: "ecdsa_p1363_standard", results };
          }
        } catch (err) {
          console.log("Standard P1363 verification failed:", err.message);
          results.attempts.push({ approach: "ecdsa_p1363_standard", result: false, error: err.message });
        }
        
        // Fallback to other verification methods if the above fails
        // Existing verification code can remain as fallback
        // ...
        
        return { valid: false, error: "ECDSA verification failed - incompatible signature format", results };
      } catch (err) {
        console.error("ECDSA verification error:", err.message);
        results.attempts.push({ approach: "ecdsa", result: false, error: err.message });
        return { valid: false, error: `ECDSA verification error: ${err.message}`, results };
      }
    } else {
      console.error(`Unsupported algorithm: ${algorithm}`);
      return { valid: false, error: `Unsupported algorithm: ${algorithm}` };
    }
  } catch (error) {
    console.error(`Error during verification:`, error);
    return { valid: false, error: `General verification error: ${error.message}` };
  }
}

// Infer document type from name and metadata
function determineDocumentTypeFromName(filename, metadata = {}) {
  const name = filename.toLowerCase();

  // Check for common document patterns
  if (
    name.includes("invoice") ||
    name.includes("faktur") ||
    name.includes("tagihan")
  ) {
    return "invoice";
  } else if (
    name.includes("contract") ||
    name.includes("kontrak") ||
    name.includes("agreement") ||
    name.includes("perjanjian")
  ) {
    return "contract";
  } else if (
    name.includes("receipt") ||
    name.includes("kuitansi") ||
    name.includes("bukti")
  ) {
    return "receipt";
  } else if (name.includes("certificate") || name.includes("sertifikat")) {
    return "certificate";
  } else if (name.includes("report") || name.includes("laporan")) {
    return "report";
  } else if (name.includes("letter") || name.includes("surat")) {
    return "letter";
  } else if (metadata.title) {
    // Try to determine from metadata title if filename doesn't give us clues
    const title = metadata.title.toLowerCase();
    if (title.includes("invoice") || title.includes("faktur")) {
      return "invoice";
    } else if (title.includes("contract") || title.includes("kontrak")) {
      return "contract";
    }
  }

  // Default fallback
  return "document";
}

// Extract additional information from the title
function extractInfoFromTitle(title = "") {
  if (!title) return { documentNumber: null };

  // Try to extract document numbers using common patterns
  const numberPatterns = [
    /no[.:]\s*([A-Za-z0-9-\/]+)/i, // "No. XXX" pattern
    /nomor[.:]\s*([A-Za-z0-9-\/]+)/i, // "Nomor XXX" pattern
    /number[.:]\s*([A-Za-z0-9-\/]+)/i, // "Number XXX" pattern
    /#\s*([A-Za-z0-9-\/]+)/, // "#XXX" pattern
    /(?:^|[^A-Za-z0-9])([A-Za-z]{1,3}[-\/][0-9]{1,5})/, // Common document number patterns like "INV/123", "PO-456"
  ];

  for (const pattern of numberPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return { documentNumber: match[1].trim() };
    }
  }

  return { documentNumber: null };
}

// Generate a unique certificate ID
function generateCertificateId() {
  // Create a unique certificate ID using timestamp and random string
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `CERT-${timestamp}-${random}`.toUpperCase();
}

// Add QR code to PDF document
async function addQRCodeToPdf(pdfBuffer, certificateId, fileHash, options = {}) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Get the last page or specified page
    const pageIndex = options.pageIndex || pdfDoc.getPageCount() - 1;
    const page = pdfDoc.getPage(pageIndex);
    
    // Create verification URL with certificateId (shorter and more user-friendly)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${certificateId}`;
    
    // Generate QR code with direct URL
    const qrCodeBuffer = await QRCode.toBuffer(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 4
    });
    
    // Embed the QR code in the PDF
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
    
    // Determine position based on options or default to bottom right
    const { width, height } = page.getSize();
    const qrSize = 100;  // QR code size
    
    let x, y;
    const position = options.position || 'bottom-right';
    
    switch(position) {
      case 'top-left':
        x = 50;
        y = height - qrSize - 50;
        break;
      case 'top-right':
        x = width - qrSize - 50;
        y = height - qrSize - 50;
        break;
      case 'bottom-left':
        x = 50;
        y = 50;
        break;
      case 'bottom-center':
        x = (width - qrSize) / 2;
        y = 50;
        break;
      case 'top-center':
        x = (width - qrSize) / 2;
        y = height - qrSize - 50;
        break;
      case 'bottom-right':
      default:
        x = width - qrSize - 50;
        y = 50;
    }
    
    // Add background rectangle for the QR code
    page.drawRectangle({
      x: x - 5,
      y: y - 5,
      width: qrSize + 10,
      height: qrSize + 10,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      opacity: 0.9
    });
    
    // Draw the QR code
    page.drawImage(qrCodeImage, {
      x,
      y,
      width: qrSize,
      height: qrSize
    });
    
    // Add verification text
    const fontSize = 8;
    page.drawText(`Verified: ${new Date().toLocaleDateString()}`, {
      x,
      y: y - 15,
      size: fontSize,
      color: rgb(0.2, 0.2, 0.2)
    });
    
    page.drawText(`Certificate ID: ${certificateId}`, {
      x,
      y: y - 25,
      size: fontSize,
      color: rgb(0.2, 0.2, 0.2)
    });
    
    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  } catch (error) {
    console.error("Error adding QR code to PDF:", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be signed in to sign documents" },
        { status: 401 }
      );
    }

    // Get form data with file and metadata
    const formData = await req.formData();
    const file = formData.get("file");
    const fileHash = formData.get("fileHash");
    const signature = formData.get("signature");
    const publicKey = formData.get("publicKey");
    const explicitAlgorithm = formData.get("algorithm"); // Get algorithm from form if provided
    const timestamp = formData.get("timestamp");  // Get the timestamp from the request
    
    // Optional additional metadata from the form
    const customNotes = formData.get("notes") || null;
    const documentTags = formData.get("tags") || null;
    const customSubject = formData.get("subject") || null;

    // Process pre-analyzed data
    const preAnalyzedData = formData.get("analysisData");
    let documentAnalysis = null;
    let pdfMetadata = null;

    if (preAnalyzedData) {
      try {
        const parsedData = JSON.parse(preAnalyzedData);
        documentAnalysis = parsedData.analysis;
        pdfMetadata = parsedData.pdfMetadata;
        console.log("Using pre-analyzed document data");
      } catch (error) {
        console.error("Error parsing pre-analyzed data:", error);
      }
    }

    // Processing options
    const preferredQRPosition = formData.get("qrPosition") || null;

    // Validate required fields
    if (!file || !fileHash || !signature || !publicKey) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          details: {
            file: file ? "✓ Present" : "✗ Missing",
            fileHash: fileHash ? "✓ Present" : "✗ Missing",
            signature: signature ? "✓ Present" : "✗ Missing",
            publicKey: publicKey ? "✓ Present" : "✗ Missing"
          }
        },
        { status: 400 }
      );
    }

    // Fetch the user's current algorithm preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { algorithm: true, name: true, email: true },
    });

    // If user not found, this is a serious issue
    if (!user) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    // Use algorithm from form if provided, otherwise from user settings, default to RSA
    const userAlgorithm = explicitAlgorithm || user.algorithm || "RSA";
    console.log(`Using ${userAlgorithm} algorithm for document signing`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Verify the hash matches the file
    const calculatedHash = await calculateFileHash(fileBuffer);
    if (calculatedHash !== fileHash) {
      return NextResponse.json(
        { 
          error: "File hash mismatch. The file may have been tampered with.",
          details: {
            receivedHash: fileHash,
            calculatedHash: calculatedHash,
            fileSize: fileBuffer.length
          }
        },
        { status: 400 }
      );
    }
    console.log("File hash verification successful");
    
    // Log diagnostic information
    console.log(`Signature type: ${typeof signature}`);
    console.log(`Signature length: ${signature.length}`);
    console.log(`Public key length: ${publicKey.length}`);
    console.log(`Algorithm: ${userAlgorithm}`);

    // Verify the signature with enhanced response
    const verificationResult = await verifySignature(
      fileHash,
      signature,
      publicKey,
      userAlgorithm,
      timestamp  // Pass the timestamp to verifySignature
    );

    console.log("Verification parameters:");
    console.log(`- File hash: ${fileHash.substring(0, 20)}...`);
    console.log(`- Signature length: ${signature.length}`);
    console.log(`- Algorithm: ${userAlgorithm}`);
    console.log(`- Timestamp provided: ${timestamp ? 'Yes' : 'No'}`);

    // If timestamp is provided, log the exact data to verify
    if (timestamp) {
      const dataToVerify = `${fileHash}|${timestamp}`;
      console.log(`- Data to verify: ${dataToVerify.substring(0, 30)}...`);
    }

    if (!verificationResult.valid) {
      return NextResponse.json(
        { 
          error: "Invalid signature for the provided file hash",
          details: {
            errorMessage: verificationResult.error || "Signature verification failed",
            verificationAttempts: verificationResult.results?.attempts || [],
            suggestions: [
              "Make sure you're signing the exact hash string with SHA-256 algorithm",
              "Use the correct private key corresponding to the stored public key",
              "Do not transform the hash before signing (no base64/hex conversions)",
              "Use standard PKCS#1 v1.5 padding (default in most libraries)"
            ]
          },
          diagnosticInfo: {
            algorithm: userAlgorithm,
            hashPreview: fileHash.substring(0, 16) + "...",
            signatureFormat: /^[A-Za-z0-9+/=]+$/.test(signature) ? "base64" : "other",
            publicKeyFormat: publicKey.includes("BEGIN") ? "PEM" : "raw"
          }
        },
        { status: 400 }
      );
    }
    
    console.log("Signature verification successful - used approach:", verificationResult.approach);

    // Check if document with this hash already exists
    const existingDocument = await prisma.document.findFirst({
      where: { fileHash: fileHash }
    });
    
    if (existingDocument) {
      return NextResponse.json({
        error: "Document already exists",
        alreadySigned: true,
        documentInfo: {
          id: existingDocument.id,
          certificateId: existingDocument.certificateId,
          fileHash: existingDocument.fileHash,
          timestamp: existingDocument.timestamp,
          signedBy: user.name,
          email: user.email
        }
      }, { status: 409 });
    }

    // Extract metadata from the PDF file if not already provided
    if (!pdfMetadata) {
      try {
        pdfMetadata = await extractPdfMetadata(fileBuffer);
        console.log("PDF metadata extraction successful");
      } catch (error) {
        console.error("Error extracting PDF metadata:", error);
        pdfMetadata = {
          title: file.name,
          author: "",
          subject: "",
          keywords: "",
          pageCount: 0
        };
      }
    }

    // Generate unique certificate ID
    const certificateId = generateCertificateId();

    // Determine document type and additional info
    let documentType = documentAnalysis?.documentType || 
                       determineDocumentTypeFromName(file.name, pdfMetadata);
    
    let additionalInfo = extractInfoFromTitle(pdfMetadata.title || file.name);

    // Calculate hash of original document 
    const originalFileHash = await calculateFileHash(fileBuffer);

    // Add QR code to PDF
    let modifiedPdfBuffer;
    try {
      modifiedPdfBuffer = await addQRCodeToPdf(fileBuffer, certificateId, originalFileHash, {
        position: preferredQRPosition || 'bottom-right'
      });
      console.log("QR code added to PDF successfully");
    } catch (qrError) {
      console.error("Failed to add QR code to PDF:", qrError);
      // Fall back to original PDF
      modifiedPdfBuffer = fileBuffer;
    }

    // Calculate hash of the signed document (with QR code)
    const signedFileHash = await calculateFileHash(modifiedPdfBuffer);
    console.log("Original document hash:", originalFileHash);
    console.log("Signed document hash:", signedFileHash);

    // Upload to Google Drive
    let driveResult = null;
    try {
      const fileName = `signed_${certificateId}_${file.name}`;
      
      const uploadMetadata = {
        certificateId,
        signedBy: user.name,
        signedByEmail: user.email,
        documentType,
        timestamp: timestamp || new Date().toISOString()
      };
      
      driveResult = await uploadPdfToDrive(modifiedPdfBuffer, fileName, uploadMetadata);
      console.log("PDF uploaded to Google Drive:", driveResult);
    } catch (driveError) {
      console.error("Failed to upload PDF to Google Drive:", driveError);
    }

    // Prepare the document record for database insertion
    const documentData = {
      userId: session.user.id,
      fileName: file.name,
      fileHash: originalFileHash,  // This is the original hash
      signedFileHash: signedFileHash,  // This is the hash after adding QR code
      signature,
      publicKey,
      algorithm: userAlgorithm,
      certificateId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      // Include Drive file info if available
      driveFileId: driveResult?.fileId || null,
      driveViewUrl: driveResult?.viewUrl || null,
      driveDownloadUrl: driveResult?.downloadUrl || null,
      signedPdfUrl: driveResult?.viewUrl || null,
      // Include metadata
      metadata: {
        pdfInfo: pdfMetadata,
        documentType,
        documentNumber: additionalInfo.documentNumber,
        notes: customNotes,
        tags: documentTags ? documentTags.split(',').map(t => t.trim()) : [],
        subject: customSubject || pdfMetadata.title || file.name,
        analysis: documentAnalysis,
        verificationMethod: verificationResult.approach,
        signatureInfo: {
          algorithm: userAlgorithm,
          verified: true,
          signedAt: new Date().toISOString(),
          signedBy: user.name,
          signedByEmail: user.email
        },
        folderPath: driveResult?.folderPath || null
      },
    };

    // Store the document in the database
    const storedDocument = await prisma.document.create({
      data: documentData,
    });

    console.log("Document stored in database with ID:", storedDocument.id);

    return NextResponse.json(
      { 
        success: true,
        message: "Document signed successfully",
        savedDoc: {
          id: storedDocument.id,
          fileName: storedDocument.fileName,
          fileHash: storedDocument.fileHash,
          certificateId: storedDocument.certificateId,
          algorithm: storedDocument.algorithm,
          timestamp: storedDocument.timestamp,
          signedBy: user.name,
          signedByEmail: user.email,
          metadata: {
            documentType,
            documentNumber: additionalInfo.documentNumber,
            subject: customSubject || pdfMetadata.title || file.name,
            pageCount: pdfMetadata.pageCount || 0
          }
        },
        documentId: storedDocument.id,
        certificateId: storedDocument.certificateId,
        signedPdfUrl: storedDocument.signedPdfUrl,
        driveFileId: storedDocument.driveFileId,
        driveViewUrl: storedDocument.driveViewUrl, 
        driveDownloadUrl: storedDocument.driveDownloadUrl,
        verificationDetails: {
          approach: verificationResult.approach,
          attemptsMade: verificationResult.results?.attempts?.length || 1
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in document signing process:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}