import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

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
    
    // Extract PDF metadata for additional verification
    const pdfMetadata = await extractPdfMetadata(fileBuffer);
    
    // Check if a document with this hash exists in our database
    const existingDocument = await prisma.document.findFirst({
      where: {
        fileHash: calculatedHash
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
    
    if (existingDocument) {
      // Document exists - it was previously signed
      // Extract all relevant information for a comprehensive response
      
      // Prepare a more detailed response with comprehensive metadata
      const documentInfo = {
        // Basic document information
        id: existingDocument.id,
        certificateId: existingDocument.certificateId,
        fileName: existingDocument.fileName,
        fileHash: existingDocument.fileHash,
        algorithm: existingDocument.algorithm,
        timestamp: existingDocument.timestamp || existingDocument.createdAt,
        
        // URLs and links
        qrCodeUrl: existingDocument.qrCodeUrl,
        signedPdfUrl: existingDocument.driveViewUrl || existingDocument.signedPdfUrl,
        driveFileId: existingDocument.driveFileId,
        driveViewUrl: existingDocument.driveViewUrl,
        driveDownloadUrl: existingDocument.driveDownloadUrl,
        
        // Signer information
        signer: existingDocument.user ? {
          id: existingDocument.user.id,
          name: existingDocument.user.name,
          email: existingDocument.user.email,
          institution: existingDocument.user.institution
        } : null,
        
        // Full metadata (if available)
        metadata: existingDocument.metadata
      };
      
      return NextResponse.json({
        verified: true,
        message: 'Document has been previously signed',
        documentInfo: documentInfo,
        uploadedPdfInfo: pdfMetadata
      }, { status: 200 });
    } else {
      // Document not found in our system
      return NextResponse.json({
        verified: false,
        message: 'Document has not been signed or is not in our records',
        uploadedPdfInfo: pdfMetadata
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error("Error verifying document:", error);
    return NextResponse.json(
      { error: 'Failed to verify document', details: error.message },
      { status: 500 }
    );
  }
}

// Optional GET endpoint to verify by certificate ID or hash
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateId = searchParams.get('certificateId');
    const fileHash = searchParams.get('fileHash');
    
    if (!certificateId && !fileHash) {
      return NextResponse.json(
        { error: 'Either certificateId or fileHash must be provided' },
        { status: 400 }
      );
    }
    
    // Search criteria
    const whereClause = certificateId 
      ? { certificateId } 
      : { fileHash };
    
    // Find document with complete user relation
    const document = await prisma.document.findFirst({
      where: whereClause,
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
    
    if (document) {
      // Prepare a comprehensive response with all document details
      // This is especially important for displaying complete verification information
      
      const documentInfo = {
        // Basic document information
        id: document.id,
        certificateId: document.certificateId,
        fileName: document.fileName,
        fileHash: document.fileHash,
        algorithm: document.algorithm,
        signature: document.signature,
        publicKey: document.publicKey,
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
        
        // Complete metadata from the document
        metadata: document.metadata
      };
      
      return NextResponse.json({
        verified: true,
        message: 'Document verification successful',
        documentInfo: documentInfo
      }, { status: 200 });
    } else {
      return NextResponse.json({
        verified: false,
        message: 'Document not found in our records'
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error("Error in document verification:", error);
    return NextResponse.json(
      { error: 'Verification failed', details: error.message },
      { status: 500 }
    );
  }
} 