import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';

// Helper function to calculate file hash
async function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Helper function to extract PDF metadata
async function extractPdfMetadata(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Get standard PDF metadata
    const title = pdfDoc.getTitle() || '';
    const author = pdfDoc.getAuthor() || '';
    const subject = pdfDoc.getSubject() || '';
    const keywords = pdfDoc.getKeywords() || '';
    const creator = pdfDoc.getCreator() || '';
    const producer = pdfDoc.getProducer() || '';
    const creationDate = pdfDoc.getCreationDate();
    const modificationDate = pdfDoc.getModificationDate();
    
    // Get page count
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
      pageCount
    };
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    return {};
  }
}

// Verify the signature with the stored public key
async function verifySignature(fileHash, signature, publicKey, algorithm = "RSA", timestamp = null) {
  try {
    console.log(`Verifying signature using ${algorithm} algorithm`);
    console.log(`Hash to verify: ${fileHash.substring(0, 20)}...`);

    // Ensure public key has proper PEM format
    let formattedPublicKey = publicKey;
    if (!publicKey.includes("-----BEGIN")) {
      formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    // Remove any whitespace from signature
    let cleanedSignature = signature;
    if (typeof signature === 'string') {
      cleanedSignature = signature.replace(/\s+/g, '');
    }

    // Convert signature string to buffer
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanedSignature) && cleanedSignature.length % 4 === 0;
    let signatureBuffer;
    
    try {
      if (isBase64) {
        signatureBuffer = Buffer.from(cleanedSignature, "base64");
      } else {
        signatureBuffer = Buffer.from(cleanedSignature, "hex");
      }
    } catch (convError) {
      console.error("Error converting signature format:", convError);
      return { valid: false, error: "Signature format conversion error" };
    }

    // For RSA verification
    if (algorithm === "RSA") {
      // Try first with timestamp if provided (more secure)
      if (timestamp) {
        try {
          const dataToVerify = `${fileHash}|${timestamp}`;
          const verify = crypto.createVerify("SHA256");
          verify.update(dataToVerify);
          const result = verify.verify(formattedPublicKey, signatureBuffer);
          if (result) {
            return { valid: true, method: "hash|timestamp" };
          }
        } catch (err) {
          console.log("Timestamp verification failed:", err.message);
        }
      }
      
      // Try with just the hash
      try {
        const verify = crypto.createVerify("SHA256");
        verify.update(fileHash);
        const result = verify.verify(formattedPublicKey, signatureBuffer);
        if (result) {
          return { valid: true, method: "direct_hash" };
        }
      } catch (err) {
        console.log("Direct hash verification failed:", err.message);
      }
      
      return { valid: false, error: "Signature verification failed" };
    } 
    // For ECDSA verification
    else if (algorithm === "ECDSA") {
      try {
        const publicKeyObject = crypto.createPublicKey({
          key: formattedPublicKey,
          format: 'pem',
        });
        
        // Try with timestamp first
        if (timestamp) {
          const dataToVerify = `${fileHash}|${timestamp}`;
          const result = crypto.verify(
            'sha256',
            Buffer.from(dataToVerify),
            {
              key: publicKeyObject,
              dsaEncoding: 'ieee-p1363'
            },
            signatureBuffer
          );
          if (result) {
            return { valid: true, method: "ecdsa_timestamp" };
          }
        }
        
        // Try with just the hash
        const result = crypto.verify(
          'sha256',
          Buffer.from(fileHash),
          {
            key: publicKeyObject,
            dsaEncoding: 'ieee-p1363'
          },
          signatureBuffer
        );
        if (result) {
          return { valid: true, method: "ecdsa_standard" };
        }
        
        return { valid: false, error: "ECDSA signature verification failed" };
      } catch (err) {
        return { valid: false, error: `ECDSA verification error: ${err.message}` };
      }
    } else {
      return { valid: false, error: `Unsupported algorithm: ${algorithm}` };
    }
  } catch (error) {
    console.error("Error during verification:", error);
    return { valid: false, error: `Verification error: ${error.message}` };
  }
}

// Find document by hash
async function findDocumentByHash(fileHash) {
  return prisma.document.findFirst({
    where: { fileHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          institution: true
        }
      }
    }
  });
}

export async function POST(req) {
  try {
    // This endpoint can be used without authentication to verify documents
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer and calculate hash
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const calculatedHash = await calculateFileHash(fileBuffer);
    
    console.log(`Verifying document with calculated hash: ${calculatedHash.substring(0, 16)}...`);
    
    // Extract PDF metadata for additional verification
    const pdfMetadata = await extractPdfMetadata(fileBuffer);
    
    // First try to find document by signedFileHash (exact match with QR code)
    let document = await prisma.document.findFirst({
      where: { signedFileHash: calculatedHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            institution: true
          }
        }
      }
    });
    
    // If not found, check if it matches the original hash
    if (!document) {
      document = await prisma.document.findFirst({
        where: { fileHash: calculatedHash },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              institution: true
            }
          }
        }
      });
      
      // Found by original hash but not signed hash - this is the original unsigned document
      if (document) {
        return NextResponse.json({
          verified: false,
          isOriginalVersion: true,
          message: "This appears to be the original unsigned version of a document that has been signed",
          documentId: document.id,
          signedDocumentUrl: document.signedPdfUrl || document.driveViewUrl,
          calculatedHash: calculatedHash,
          storedOriginalHash: document.fileHash,
          storedSignedHash: document.signedFileHash
        }, { status: 200 });
      }
    }
    
    if (!document) {
      console.log(`No document found with hash: ${calculatedHash.substring(0, 16)}...`);
      return NextResponse.json({
        verified: false,
        message: "Document not found or has not been signed",
        calculatedHash: calculatedHash,
        uploadedPdfInfo: pdfMetadata
      }, { status: 200 });
    }
    
    // This is the properly signed document - continue with signature verification
    const signatureVerification = await verifySignature(
      document.fileHash, // Use the original file hash for signature verification
      document.signature,
      document.publicKey,
      document.algorithm,
      document.timestamp ? document.timestamp.toISOString() : null
    );
    
    if (!signatureVerification.valid) {
      console.warn(`Signature verification failed for document: ${document.id}`);
      return NextResponse.json({
        verified: false,
        message: "Document found but signature verification failed",
        error: signatureVerification.error,
        calculatedHash: calculatedHash,
        storedHash: document.fileHash,
        documentId: document.id,
        uploadedPdfInfo: pdfMetadata
      }, { status: 200 });
    }
    
    console.log(`Document verified successfully. ID: ${document.id}, Method: ${signatureVerification.method}`);
    
    // Prepare a detailed response with comprehensive metadata
    const documentInfo = {
      // Basic document information
      id: document.id,
      certificateId: document.certificateId,
      fileName: document.fileName,
      fileHash: document.fileHash,
      algorithm: document.algorithm,
      timestamp: document.timestamp || document.createdAt,
      
      // URLs and links
      qrCodeUrl: document.qrCodeUrl,
      signedPdfUrl: document.driveViewUrl || document.signedPdfUrl,
      driveFileId: document.driveFileId,
      driveViewUrl: document.driveViewUrl,
      driveDownloadUrl: document.driveDownloadUrl,
      
      // Signer information
      signer: document.user ? {
        id: document.user.id,
        name: document.user.name,
        email: document.user.email,
        institution: document.user.institution
      } : null,
      
      // Full metadata with AI analysis properly mapped
      metadata: {
        ...document.metadata,
        aiAnalysis: document.metadata?.analysis || null
      }
    };
    
    return NextResponse.json({
      verified: true,
      message: `Document verified successfully using ${signatureVerification.method}`,
      documentInfo: documentInfo,
      uploadedPdfInfo: pdfMetadata,
      verificationDetails: {
        method: signatureVerification.method,
        calculatedHash: calculatedHash,
        matchesStoredHash: calculatedHash === document.fileHash
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error verifying document:", error);
    return NextResponse.json(
      { error: 'Failed to verify document', details: error.message },
      { status: 500 }
    );
  }
}

// Update the GET endpoint for more robust certificate ID verification

export async function GET(req) {
  try {
    // Get the certificate ID or file hash from query parameters
    const { searchParams } = new URL(req.url);
    const certificateId = searchParams.get("certificateId");
    const fileHash = searchParams.get("fileHash");

    // Add detailed logging for debugging
    console.log("Document verification request:", {
      certificateId: certificateId || "(none)",
      fileHash: fileHash ? `${fileHash.substring(0, 8)}...` : "(none)"
    });

    if (!certificateId && !fileHash) {
      return NextResponse.json(
        { error: "Either certificateId or fileHash is required" },
        { status: 400 }
      );
    }

    // Normalize IDs for better matching (trim, fix case sensitivity)
    const normalizedCertId = certificateId ? certificateId.trim().toUpperCase() : "";
    const normalizedFileHash = fileHash ? fileHash.trim().toLowerCase() : "";

    console.log(`Looking up document with certificateId: ${normalizedCertId || '(none)'}`);

    // Find the document by certificate ID or file hash with normalized values
    const document = await prisma.document.findFirst({
      where: {
        OR: [
          normalizedCertId ? { 
            certificateId: {
              equals: normalizedCertId,
              mode: 'insensitive' // Make case-insensitive if your DB supports it
            }
          } : {},
          normalizedFileHash ? { fileHash: normalizedFileHash } : {}
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            institution: true,
          }
        }
      }
    });

    if (!document) {
      console.log("No document found with the provided identifier");
      
      // Perform a broader search to help diagnose issues
      let diagnosticInfo = {};
      
      if (certificateId) {
        // Look for similar certificate IDs to help diagnose case/format issues
        const similarCertificates = await prisma.document.findMany({
          where: {
            certificateId: {
              contains: certificateId.substring(5, 10), // Look for a substring match
              mode: 'insensitive'
            }
          },
          select: { certificateId: true },
          take: 5
        });
        
        diagnosticInfo.similarCertificateIds = similarCertificates.map(d => d.certificateId);
      }
      
      return NextResponse.json(
        { 
          verified: false, 
          message: "Document not found",
          query: {
            certificateId: normalizedCertId || null,
            fileHash: normalizedFileHash ? `${normalizedFileHash.substring(0, 8)}...` : null
          },
          diagnostic: diagnosticInfo
        },
        { status: 200 }
      );
    }

    console.log(`Document found. ID: ${document.id}, CertificateID: ${document.certificateId}`);
    
    // Enhanced security: Verify the signature cryptographically
    // This adds an extra security layer to certificate ID lookup
    const signatureVerification = await verifySignature(
      document.fileHash,
      document.signature,
      document.publicKey,
      document.algorithm,
      document.timestamp ? document.timestamp.toISOString() : null
    );
    
    // If signature verification fails, return warning but still return the document
    // This alerts the user that while the cert ID exists, there may be security issues
    if (!signatureVerification.valid) {
      console.warn(`⚠️ Signature verification failed for document: ${document.id}`);
      
      return NextResponse.json({
        verified: true,
        signedBy: document.user.name,
        securityWarning: "Document found but signature verification failed. This could indicate tampering.",
        documentInfo: {
          id: document.id,
          fileName: document.fileName,
          fileHash: document.fileHash,
          certificateId: document.certificateId,
          algorithm: document.algorithm,
          signatureStatus: "INVALID",
          timestamp: document.timestamp,
          signedPdfUrl: document.signedPdfUrl || document.driveViewUrl,
          metadata: {
            ...document.metadata,
            aiAnalysis: document.metadata?.analysis || null
          },
          signer: {
            name: document.user.name,
            email: document.user.email,
            institution: document.user.institution,
          }
        },
        securityNotice: "WARNING: This document was found by ID only. Upload the actual document for full verification."
      });
    }

    console.log(`Document signature verified successfully using method: ${signatureVerification.method}`);
    
    // Format the response with correct mapping for AI analysis
    const response = {
      verified: true,
      signedBy: document.user.name,
      documentInfo: {
        id: document.id,
        fileName: document.fileName,
        fileHash: document.fileHash,
        signedFileHash: document.signedFileHash,
        certificateId: document.certificateId,
        algorithm: document.algorithm,
        signature: document.signature,
        timestamp: document.timestamp,
        signedPdfUrl: document.signedPdfUrl || document.driveViewUrl,
        driveFileId: document.driveFileId,
        driveViewUrl: document.driveViewUrl,
        driveDownloadUrl: document.driveDownloadUrl,
        metadata: {
          ...document.metadata,
          // Map analysis to aiAnalysis to match UI expectations
          aiAnalysis: document.metadata.analysis 
        },
        signer: {
          name: document.user.name,
          email: document.user.email,
          institution: document.user.institution,
        }
      },
      securityDetails: {
        verificationMethod: signatureVerification.method,
        identifierUsed: certificateId ? "certificateId" : "fileHash",
        signatureVerified: true
      },
      securityNotice: "For complete cryptographic verification, please upload the actual document."
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error verifying document:", error);
    return NextResponse.json(
      { 
        error: "Failed to verify document", 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}