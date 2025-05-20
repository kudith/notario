import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to check documents' }, 
        { status: 401 }
      );
    }
    
    // Get the file hash from the query parameters
    const { searchParams } = new URL(req.url);
    const fileHash = searchParams.get('fileHash');
    
    if (!fileHash) {
      return NextResponse.json(
        { error: 'Missing file hash' },
        { status: 400 }
      );
    }
    
    // Check if document with this hash exists
    const existingDocument = await prisma.document.findFirst({
      where: {
        fileHash: fileHash
      }
    });
    
    if (existingDocument) {
      // Get folder path information by extracting from the Google Drive URL or database field
      let folderPath = null;
      
      // Check if we have a stored folder path or can extract it
      if (existingDocument.metadata?.folderPath) {
        folderPath = existingDocument.metadata.folderPath;
      } else if (existingDocument.folderPath) {
        folderPath = existingDocument.folderPath;
      } else if (existingDocument.driveViewUrl) {
        // Try to extract folder info from Google Drive URL or structure
        folderPath = '/NotarioDocuments/';
      }
      
      return NextResponse.json({
        exists: true,
        documentInfo: {
          certificateId: existingDocument.certificateId,
          signedAt: existingDocument.timestamp || existingDocument.createdAt,
          signedPdfUrl: existingDocument.driveViewUrl || existingDocument.signedPdfUrl,
          driveFileId: existingDocument.driveFileId,
          driveViewUrl: existingDocument.driveViewUrl,
          driveDownloadUrl: existingDocument.driveDownloadUrl,
          metadata: existingDocument.metadata || {},
          folderPath: folderPath
        }
      });
    }
    
    return NextResponse.json({
      exists: false
    });
    
  } catch (error) {
    console.error('Error checking document:', error);
    return NextResponse.json(
      { error: 'Failed to check document', details: error.message },
      { status: 500 }
    );
  }
} 