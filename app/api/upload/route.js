import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { uploadPdfToDrive } from '@/lib/google-drive';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to upload files' }, 
        { status: 401 }
      );
    }
    
    // Get form data with file
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Upload to Google Drive
    const result = await uploadPdfToDrive(Buffer.from(buffer), file.name);
    
    return NextResponse.json({ 
      url: result.viewUrl,
      fileId: result.fileId,
      downloadUrl: result.downloadUrl
    }, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}