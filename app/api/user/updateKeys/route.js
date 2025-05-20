import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get the public key from the request body
    const { publicKey } = await request.json();
    
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Public key is required' },
        { status: 400 }
      );
    }
    
    // Update the user's public key
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        publicKey: publicKey,
        algorithm: "RSA", // Make sure algorithm is also set
      },
      select: {
        id: true,
        name: true,
        email: true,
        publicKey: true,
      },
    });
    
    return NextResponse.json({
      message: 'Public key updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating public key:', error);
    return NextResponse.json(
      { error: 'Failed to update public key' },
      { status: 500 }
    );
  }
}