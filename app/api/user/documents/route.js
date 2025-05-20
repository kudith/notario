import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Get user documents - GET /api/user/documents
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to access your documents' },
        { status: 401 }
      );
    }

    // Get documents for the user with detailed information
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        fileName: true,
        fileHash: true,
        certificateId: true,
        signature: true,
        algorithm: true,
        qrCodeUrl: true,
        signedPdfUrl: true,
        driveFileId: true,
        driveViewUrl: true,
        driveDownloadUrl: true,
        metadata: true,
        timestamp: true
      }
    });

    // Get a count of user documents
    const documentCount = await prisma.document.count({
      where: {
        userId: session.user.id
      }
    });

    return NextResponse.json({
      documents,
      count: documentCount
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user documents:", error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error.message },
      { status: 500 }
    );
  }
}

// Trigger refresh of user documents - POST /api/user/documents/refresh
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to refresh your documents' },
        { status: 401 }
      );
    }

    // This is a utility endpoint to refresh the relationship between users and documents
    // Useful if you notice documents aren't showing up in the user's document list

    // Find all documents belonging to this user
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true
      }
    });

    // Update the user to ensure the documents relation is properly set
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        documents: {
          connect: documents.map(doc => ({ id: doc.id }))
        }
      },
      include: {
        documents: {
          select: {
            id: true,
            certificateId: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      documentCount: updatedUser.documents.length,
      message: 'Documents relationship refreshed successfully'
    }, { status: 200 });
  } catch (error) {
    console.error("Error refreshing document relationships:", error);
    return NextResponse.json(
      { error: 'Failed to refresh document relationships', details: error.message },
      { status: 500 }
    );
  }
} 