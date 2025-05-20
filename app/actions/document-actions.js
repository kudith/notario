'use server'

import dbConnect from '@/lib/mongoose';
import Document from '@/models/Document';
import User from '@/models/User';
import { revalidatePath } from 'next/cache';

// Example server action to fetch documents for a user
export async function getUserDocuments(userId) {
  try {
    await dbConnect();
    const documents = await Document.find({ userId }).sort({ timestamp: -1 });
    return { success: true, data: documents };
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return { success: false, error: 'Failed to fetch documents' };
  }
}

// Example server action to create a document
export async function createDocument(documentData) {
  try {
    await dbConnect();
    
    // Verify user exists
    const user = await User.findById(documentData.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Create document with user's public key and algorithm
    const newDocument = await Document.create({
      ...documentData,
      publicKey: user.publicKey,
      algorithm: user.algorithm,
      // Generate a unique certificate ID
      certificateId: `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      qrCodeUrl: `/verify/${documentData.fileHash}`
    });
    
    revalidatePath('/dashboard');
    return { success: true, data: newDocument };
  } catch (error) {
    console.error('Failed to create document:', error);
    return { success: false, error: 'Failed to create document' };
  }
}