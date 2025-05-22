import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp'; // Add this dependency for image processing

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

// Enhanced function to extract certificate ID from QR codes in a PDF
async function extractQRFromPDF(pdfBuffer) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const results = [];
    
    // Check the last page first (where we typically add QR codes)
    const pagesToCheck = [
      pageCount - 1, // Last page (most likely)
      0,             // First page (sometimes QR codes are here)
      Math.floor(pageCount / 2) // Middle page as a fallback
    ];
    
    for (const pageIndex of pagesToCheck) {
      if (pageIndex < 0 || pageIndex >= pageCount) continue;
      
      try {
        // Render the PDF page to PNG using pdf-lib and sharp
        // Note: This is a simplified approach - real implementation would need
        // proper PDF rendering which is complex
        // In a production environment, you might use a service like pdf2image
        
        // For now, we'll use a dummy implementation that demonstrates the approach
        const pdfBytes = await pdfDoc.save();
        
        // Use sharp to convert the first page to an image (simplified)
        // In a real implementation, you'd use a more robust PDF-to-image conversion
        const imageBuffer = await sharp(Buffer.from(pdfBytes))
          .toFormat('png')
          .toBuffer();
        
        // Create a canvas and load the image
        const canvas = createCanvas(1000, 1000); // Assume reasonable size
        const ctx = canvas.getContext('2d');
        const image = await loadImage(imageBuffer);
        ctx.drawImage(image, 0, 0);
        
        // Get image data for QR scanning
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR codes
        const qrCode = jsQR(
          imageData.data, 
          imageData.width, 
          imageData.height
        );
        
        if (qrCode) {
          try {
            // Try to parse the QR code data
            const parsedData = JSON.parse(qrCode.data);
            if (parsedData.certificateId || parsedData.fileHash) {
              results.push({
                certificateId: parsedData.certificateId,
                fileHash: parsedData.fileHash,
                qrData: parsedData,
                confidence: 'high',
                source: 'qr_code'
              });
              // We found a valid QR code, no need to check more pages
              break;
            }
          } catch (e) {
            // If it's not JSON, check if it's a direct certificate ID or URL
            const qrText = qrCode.data;
            
            // Check for certificate ID pattern
            const certMatch = qrText.match(/CERT-[A-Z0-9]{7,}-[A-Z0-9]{6,}/);
            if (certMatch) {
              results.push({
                certificateId: certMatch[0],
                confidence: 'medium',
                source: 'qr_text_pattern'
              });
            }
            
            // Check for verification URL
            const urlMatch = qrText.match(/\/verify\/([A-Z0-9-]+)/);
            if (urlMatch && urlMatch[1]) {
              results.push({
                certificateId: urlMatch[1],
                confidence: 'medium',
                source: 'qr_url_pattern'
              });
            }
          }
        }
      } catch (pageError) {
        console.warn(`Error processing page ${pageIndex} for QR codes:`, pageError);
        // Continue with next page
      }
    }
    
    // Look for text patterns in the PDF that might contain certificate IDs
    const textContent = await extractTextFromPDF(pdfBuffer);
    const certIdPatterns = [
      /Certificate ID:\s*([A-Z0-9-]{10,})/i,
      /Cert ID:\s*([A-Z0-9-]{10,})/i,
      /Document ID:\s*([A-Z0-9-]{10,})/i,
      /CERT-[A-Z0-9]{7,}-[A-Z0-9]{6,}/
    ];
    
    for (const pattern of certIdPatterns) {
      const match = textContent.match(pattern);
      if (match && match[1]) {
        results.push({
          certificateId: match[1],
          confidence: 'medium',
          source: 'text_extraction'
        });
        break;
      }
    }
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("Error extracting QR codes from PDF:", error);
    return null;
  }
}

// Helper function to extract text from PDF
async function extractTextFromPDF(pdfBuffer) {
  try {
    // This is a simplified placeholder function
    // In a real implementation, you would use a PDF text extraction library
    // such as pdf.js or pdfjs-dist
    
    // For now, return empty string as this is just a placeholder
    return "";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "";
  }
}

// Enhanced function to check document by multiple factors with confidence rating
async function findDocumentWithConfidence(fileHash, metadata, qrData = null) {
  const results = [];
  
  // 1. Direct hash match - most secure, highest confidence
  const hashMatch = await prisma.document.findFirst({
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
  
  if (hashMatch) {
    results.push({
      document: hashMatch, 
      matchType: 'direct_hash',
      confidence: 1.0 // 100% confidence
    });
    return results;
  }
  
  // 2. Certificate ID match from QR code - high confidence
  if (qrData && qrData.length > 0) {
    const bestQrMatch = qrData[0];
    if (bestQrMatch.certificateId) {
      const certMatch = await prisma.document.findFirst({
        where: { certificateId: bestQrMatch.certificateId },
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
      
      if (certMatch) {
        results.push({
          document: certMatch, 
          matchType: 'qr_certificate_id', 
          confidence: 0.95, // 95% confidence
          qrData: bestQrMatch
        });
      }
    }
    
    if (bestQrMatch.fileHash) {
      const qrHashMatch = await prisma.document.findFirst({
        where: { fileHash: bestQrMatch.fileHash },
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
      
      if (qrHashMatch) {
        results.push({
          document: qrHashMatch, 
          matchType: 'qr_file_hash',
          confidence: 0.9, // 90% confidence 
          qrData: bestQrMatch
        });
      }
    }
  }
  
  // 3. Strict metadata match - multiple criteria must match - medium confidence
  if (metadata && metadata.title && metadata.title.length > 5) {
    // Try to find documents with matching title AND similar page count
    const strictMetadataMatches = await prisma.document.findMany({
      where: {
        OR: [
          // Match by nearly identical title
          {
            fileName: {
              equals: metadata.title,
              mode: 'insensitive'
            }
          },
          // Match by substantial title similarity
          {
            fileName: {
              contains: metadata.title,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            institution: true
          }
        }
      },
      take: 5 // Limit to 5 potential matches
    });
    
    if (strictMetadataMatches.length > 0) {
      // Score each match by similarity
      for (const doc of strictMetadataMatches) {
        let score = 0;
        
        // Title match score
        if (doc.fileName.toLowerCase() === metadata.title.toLowerCase()) {
          score += 0.5; // Exact title match
        } else if (doc.fileName.toLowerCase().includes(metadata.title.toLowerCase())) {
          score += 0.3; // Partial title match
        }
        
        // Additional metadata validation from document.metadata
        if (doc.metadata && doc.metadata.pdfInfo) {
          const pdfInfo = doc.metadata.pdfInfo;
          
          // Page count match
          if (pdfInfo.pageCount === metadata.pageCount) {
            score += 0.2;
          }
          
          // Author match
          if (pdfInfo.author && metadata.author && 
              pdfInfo.author.toLowerCase() === metadata.author.toLowerCase()) {
            score += 0.1;
          }
          
          // Creation date proximity
          if (pdfInfo.creationDate && metadata.creationDate) {
            const date1 = new Date(pdfInfo.creationDate);
            const date2 = new Date(metadata.creationDate);
            const diffDays = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 2) { // Created within 2 days
              score += 0.1;
            }
          }
        }
        
        // Only include if score is significant
        if (score >= 0.5) {
          results.push({
            document: doc,
            matchType: 'enhanced_metadata',
            confidence: score,
            details: 'Multiple metadata factors matched'
          });
        }
      }
    }
  }
  
  // 4. Simple title match - lowest confidence (only if no other matches)
  if (results.length === 0 && metadata?.title && metadata.title.length > 10) {
    const titleSearch = metadata.title.trim();
    const titleMatch = await prisma.document.findFirst({
      where: {
        fileName: {
          contains: titleSearch,
          mode: 'insensitive'
        }
      },
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
    
    if (titleMatch) {
      results.push({
        document: titleMatch,
        matchType: 'basic_title_match',
        confidence: 0.3, // Low confidence
        details: 'Title similarity only'
      });
    }
  }
  
  // Sort results by confidence and return
  return results.sort((a, b) => b.confidence - a.confidence);
}

// Log verification attempt for security auditing
async function logVerificationAttempt(result, fileHash, ipAddress, userAgent) {
  try {
    // In a production system, you'd log this to a database or secure log
    console.log(`[SECURITY LOG] Document verification attempt:`, {
      timestamp: new Date().toISOString(),
      successful: result.verified,
      fileHash: fileHash?.substring(0, 8) + '...',
      matchType: result.matchType || 'none',
      confidence: result.confidence || 0,
      ipAddress,
      userAgent: userAgent?.substring(0, 30) + '...',
    });
  } catch (error) {
    console.error("Error logging verification attempt:", error);
  }
}

export async function POST(req) {
  try {
    // Security tracking
    const requestUrl = new URL(req.url);
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
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
    
    // Extract PDF metadata for additional verification
    const pdfMetadata = await extractPdfMetadata(fileBuffer);
    
    // NEW: Try to extract QR codes from the PDF
    const qrResults = await extractQRFromPDF(fileBuffer);
    console.log("QR extraction results:", qrResults);
    
    // Find document using our comprehensive matching algorithm
    const matches = await findDocumentWithConfidence(calculatedHash, pdfMetadata, qrResults);
    
    // If we got any matches
    if (matches.length > 0) {
      const bestMatch = matches[0];
      
      // Determine trust level based on confidence
      let trustLevel = 'low';
      if (bestMatch.confidence >= 0.9) {
        trustLevel = 'high';
      } else if (bestMatch.confidence >= 0.7) {
        trustLevel = 'medium';
      }
      
      console.log(`Found document match by ${bestMatch.matchType} with ${bestMatch.confidence} confidence`);
      
      // Log this verification for security audit
      await logVerificationAttempt(
        { 
          verified: true, 
          matchType: bestMatch.matchType,
          confidence: bestMatch.confidence 
        },
        calculatedHash,
        ipAddress,
        userAgent
      );
      
      // Return verified result with complete document info
      return NextResponse.json({
        verified: true,
        message: `Document verification successful (matched via ${bestMatch.matchType})`,
        trustLevel: trustLevel,
        confidence: bestMatch.confidence,
        matchDetails: {
          type: bestMatch.matchType,
          details: bestMatch.details || null
        },
        documentInfo: {
          id: bestMatch.document.id,
          certificateId: bestMatch.document.certificateId,
          fileName: bestMatch.document.fileName,
          fileHash: bestMatch.document.fileHash, // Original hash
          algorithm: bestMatch.document.algorithm,
          timestamp: bestMatch.document.timestamp || bestMatch.document.createdAt,
          qrCodeUrl: bestMatch.document.qrCodeUrl,
          signedPdfUrl: bestMatch.document.driveViewUrl || bestMatch.document.signedPdfUrl,
          driveFileId: bestMatch.document.driveFileId,
          driveViewUrl: bestMatch.document.driveViewUrl,
          driveDownloadUrl: bestMatch.document.driveDownloadUrl,
          signer: bestMatch.document.user ? {
            id: bestMatch.document.user.id,
            name: bestMatch.document.user.name,
            email: bestMatch.document.user.email,
            institution: bestMatch.document.user.institution
          } : null,
          metadata: bestMatch.document.metadata
        },
        uploadedPdfInfo: pdfMetadata,
        qrDataFound: qrResults ? true : false,
        securityInfo: {
          verificationMethod: bestMatch.matchType,
          confidenceScore: bestMatch.confidence,
          timestamp: new Date().toISOString(),
          documentHash: calculatedHash,
          originalHash: bestMatch.document.fileHash,
          hashMatch: calculatedHash === bestMatch.document.fileHash
        }
      }, { status: 200 });
    }
    
    // If still not found, try one more check with the filename for certificate ID
    const filenameMatch = file.name.match(/CERT-[A-Z0-9]{7,}-[A-Z0-9]{6,}/);
    if (filenameMatch && filenameMatch[0]) {
      const potentialCertId = filenameMatch[0];
      const certDocument = await prisma.document.findFirst({
        where: { certificateId: potentialCertId },
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
      
      if (certDocument) {
        // Log this verification
        await logVerificationAttempt(
          { 
            verified: true, 
            matchType: 'filename_certificate_id',
            confidence: 0.8
          },
          calculatedHash,
          ipAddress,
          userAgent
        );
        
        // Found by certificate ID in filename
        return NextResponse.json({
          verified: true,
          message: 'Document verified by certificate ID in filename',
          trustLevel: 'medium',
          confidence: 0.8,
          documentInfo: {
            id: certDocument.id,
            certificateId: certDocument.certificateId,
            fileName: certDocument.fileName,
            fileHash: certDocument.fileHash,
            algorithm: certDocument.algorithm,
            timestamp: certDocument.timestamp || certDocument.createdAt,
            qrCodeUrl: certDocument.qrCodeUrl,
            signedPdfUrl: certDocument.driveViewUrl || certDocument.signedPdfUrl,
            driveFileId: certDocument.driveFileId,
            driveViewUrl: certDocument.driveViewUrl,
            driveDownloadUrl: certDocument.driveDownloadUrl,
            signer: certDocument.user ? {
              id: certDocument.user.id,
              name: certDocument.user.name,
              email: certDocument.user.email,
              institution: certDocument.user.institution
            } : null,
            metadata: certDocument.metadata
          },
          uploadedPdfInfo: pdfMetadata,
          matchType: 'certificate_id',
          securityInfo: {
            verificationMethod: 'filename_certificate_id',
            confidenceScore: 0.8,
            timestamp: new Date().toISOString(),
            documentHash: calculatedHash,
            originalHash: certDocument.fileHash,
            hashMatch: calculatedHash === certDocument.fileHash
          }
        }, { status: 200 });
      }
    }
    
    // Log failed verification attempt
    await logVerificationAttempt(
      { verified: false },
      calculatedHash,
      ipAddress,
      userAgent
    );
    
    // Document not found in our system
    return NextResponse.json({
      verified: false,
      message: 'Document has not been signed or is not in our records',
      uploadedPdfInfo: pdfMetadata,
      securityInfo: {
        attemptedVerificationMethods: [
          'direct_hash_match',
          'qr_code_extraction',
          'enhanced_metadata_matching',
          'filename_certificate_id'
        ],
        timestamp: new Date().toISOString()
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

// The GET endpoint implementation remains unchanged
export async function GET(req) {
  // Existing code for GET endpoint...
}