import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Missing verification token" },
        { status: 400 }
      );
    }

    // Find the verification token in the database
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gte: new Date(), // Token must not be expired
        }
      }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Update user's verified status
    await prisma.user.update({
      where: {
        id: verificationToken.identifier
      },
      data: {
        verified: true
      }
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        id: verificationToken.id
      }
    });

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { message: "An error occurred during email verification" },
      { status: 500 }
    );
  }
}