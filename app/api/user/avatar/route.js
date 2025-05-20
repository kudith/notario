import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { uploadAvatar, deleteAvatar } from "@/lib/cloudinary";

// Helper to read form data with file
async function readFormData(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  if (!file) {
    throw new Error('No file uploaded');
  }
  
  // Convert File object to buffer or base64 string for Cloudinary
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// POST - Upload new avatar
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Process the file upload
    const base64File = await readFormData(request);
    const base64Data = `data:image/jpeg;base64,${base64File}`;

    // Upload to Cloudinary (will delete old image if cloudinaryId exists)
    const { url, cloudinaryId } = await uploadAvatar(base64Data, user.cloudinaryId);

    // Update user in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: url,
        cloudinaryId: cloudinaryId
      }
    });

    return NextResponse.json({ 
      message: "Avatar updated successfully",
      avatarUrl: url 
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

// DELETE - Remove avatar
export async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete from Cloudinary if exists
    if (user.cloudinaryId) {
      await deleteAvatar(user.cloudinaryId);
    }

    // Generate default avatar
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=256`;

    // Update user in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: defaultAvatar,
        cloudinaryId: null
      }
    });

    return NextResponse.json({ 
      message: "Avatar removed successfully",
      avatarUrl: defaultAvatar
    });
  } catch (error) {
    console.error("Avatar deletion error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete avatar" },
      { status: 500 }
    );
  }
} 