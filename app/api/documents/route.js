import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to create a document' }, 
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // Ensure required fields are present
    if (!data.userId || !data.fileName || !data.fileHash || !data.signature || !data.certificateId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that the user is only saving documents for themselves
    if (data.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only save documents for your own account' },
        { status: 403 }
      );
    }
    
    // Create the document in the database using proper relation
    const document = await prisma.document.create({
      data: {
        user: {
          connect: { id: data.userId }  // Connect to existing user using relation
        },
        fileName: data.fileName,
        fileHash: data.fileHash,
        signature: data.signature,
        publicKey: data.publicKey,
        algorithm: data.algorithm || 'RSA',
        certificateId: data.certificateId,
        qrCodeUrl: data.qrCodeUrl,
        metadata: data.metadata || {}
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error saving document:", error);
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to view documents' }, 
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    // Validate that the user is only accessing their own documents
    if (userId && userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: You can only view your own documents' },
        { status: 403 }
      );
    }
    
    // Get documents for the user with the user relation included
    const documents = await prisma.document.findMany({
      where: {
        userId: userId || session.user.id
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            publicKey: true,
            institution: true
          }
        }
      }
    });
    
    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error("Error getting documents:", error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}