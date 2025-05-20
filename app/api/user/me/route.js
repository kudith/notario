import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Calculates a fingerprint from a public key for identification purposes
 * @param {string} publicKey - The PEM formatted public key
 * @returns {string} A shortened fingerprint hash
 */
function calculateKeyFingerprint(publicKey) {
  if (!publicKey) return null;
  
  try {
    // Create a fingerprint by hashing the public key
    return crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 16); // First 16 chars are enough for display
  } catch (error) {
    console.error("Error calculating key fingerprint:", error);
    return null;
  }
}

/**
 * Enhances user data with additional metadata
 * @param {Object} user - User data from database
 * @returns {Object} Enhanced user object
 */
function enhanceUserData(user) {
  if (!user) return null;
  
  // Calculate statistics
  const documentCount = user.documents?.length || 0;
  const recentDocuments = user.documents?.slice(0, 5) || [];
  
  // Calculate security metrics
  const keyFingerprint = calculateKeyFingerprint(user.publicKey);
  const keySecurity = user.algorithm === 'RSA' ? 'Standard (2048-bit)' : 
                     user.algorithm === 'ECDSA' ? 'Enhanced (P-256 curve)' : 
                     'Unknown';
  
  // Determine key status
  const keyStatus = !user.publicKey 
    ? 'needs_key_generation' 
    : 'has_server_key';
    
  // Format document data
  const formattedDocuments = user.documents?.map(doc => ({
    ...doc,
    formattedDate: new Date(doc.timestamp).toISOString(),
    documentType: doc.metadata?.documentType || 'Unknown',
    subject: doc.metadata?.subject,
    parties: doc.metadata?.parties,
    securityStatus: 'valid', // Default valid unless we have a reason to mark otherwise
  }));

  // Format dates for easier consumption by the frontend
  const formattedCreatedAt = user.createdAt ? new Date(user.createdAt).toISOString() : null;
  const formattedUpdatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString() : null;
  
  // Calculate and return enhanced user object
  return {
    // Basic user data
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    institution: user.institution || null,
    avatarUrl: user.avatarUrl,
    
    // Security information
    security: {
      publicKey: user.publicKey,
      algorithm: user.algorithm,
      keyFingerprint,
      keySecurity,
      keyStatus,
      lastUpdated: formattedUpdatedAt
    },
    
    // Document statistics
    statistics: {
      totalDocuments: documentCount,
      recentActivity: documentCount > 0 ? recentDocuments[0]?.timestamp : null,
    },
    
    // Account information
    account: {
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt
    },
    
    // Documents data
    documents: formattedDocuments,
  };
}

export async function GET(req) {
  try {
    // Get the session and validate authentication
    const session = await getServerSession(authOptions);

    // Security: Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to access this information' },
        { status: 401 }
      );
    }
    
    // Get search parameters from URL
    const searchParams = req.nextUrl?.searchParams;
    const includeDocuments = searchParams?.get('includeDocuments') !== 'false'; // Default to true
    const documentLimit = Number(searchParams?.get('limit')) || 100; // Default to 100
    
    // Check for valid document limit to prevent abuse
    if (documentLimit > 1000) {
      return NextResponse.json(
        { error: 'Document limit cannot exceed 1000' },
        { status: 400 }
      );
    }

    // Get user data from database with documents if requested
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        publicKey: true,
        algorithm: true,
        role: true,
        verified: true,
        institution: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        // Include documents only if requested
        ...( includeDocuments ? {
          documents: {
            select: {
              id: true,
              fileName: true,
              fileHash: true,
              certificateId: true,
              signedPdfUrl: true,
              timestamp: true,
              driveFileId: true,
              driveViewUrl: true,
              metadata: true
            },
            orderBy: {
              timestamp: 'desc'
            },
            take: documentLimit
          }
        } : {})
      }
    });

    // Handle user not found
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Process and enhance the user data
    const enhancedUserData = enhanceUserData(user);
    
    // Return the enhanced user data
    return NextResponse.json(enhancedUserData, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60' // Allow caching for 60 seconds
      }
    });
    
  } catch (error) {
    console.error("Error fetching user data:", error);
    
    // Provide more specific error messages based on error type
    const errorMessage = error.code === 'P2023' ? 
      'Invalid ID format' : 
      'Failed to fetch user data';
      
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}