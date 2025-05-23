import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { downloadFileFromR2 } from '@/lib/r2-storage';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to download documents' }, 
        { status: 401 }
      );
    }
    
    // Get the file ID or certificate ID from the query parameters
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const certificateId = searchParams.get('certificateId');
    let fileName = searchParams.get('fileName') || 'document.pdf';
    
    // Make sure fileName has .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    // For certificate ID based downloads (most common case)
    if (certificateId) {
      try {
        // Find the document in the database
        const document = await prisma.document.findUnique({
          where: { certificateId }
        });
        
        if (!document) {
          return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
          );
        }
        
        // Use the document's file name if available
        if (document.fileName) {
          fileName = document.fileName;
          if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
          }
        }
        
        // Check if we have a file ID
        if (!document.driveFileId) {
          return NextResponse.json(
            { error: 'Document has no associated file ID' },
            { status: 404 }
          );
        }
        
        // Option 1: Redirect to the downloadUrl if available
        if (document.driveDownloadUrl) {
          return NextResponse.redirect(document.driveDownloadUrl);
        }
        
        // Option 2: Download the file from R2 and serve it
        const fileData = await downloadFileFromR2(document.driveFileId);
        
        return new NextResponse(fileData.buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`
          }
        });
      } catch (error) {
        console.error('Error downloading document by certificate ID:', error);
        return NextResponse.json(
          { error: 'Failed to download document' },
          { status: 500 }
        );
      }
    }
    
    // For direct file ID based downloads
    if (fileId) {
      try {
        // Download the file from R2
        const fileData = await downloadFileFromR2(fileId);
        
        return new NextResponse(fileData.buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileData.fileName || fileName}"`
          }
        });
      } catch (error) {
        console.error('Error downloading document by file ID:', error);
        return NextResponse.json(
          { error: 'Failed to download document' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'No file ID or certificate ID provided' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Failed to download PDF', details: error.message },
      { status: 500 }
    );
  }
}