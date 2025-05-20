import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { toast } from "sonner";

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: process.env.EMAIL_SERVER_PORT,
  secure: process.env.EMAIL_SERVER_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return NextResponse.json(
        { message: "If the email exists, a verification link has been sent" },
        { status: 200 }
      );
    }

    if (user.verified) {
      return NextResponse.json(
        { message: "Email is already verified. You can now log in." },
        { status: 200 }
      );
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: user.id
      }
    });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token valid for 24 hours

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.id,
        token: verificationToken,
        expires: expiresAt,
      }
    });

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${verificationToken}`;

    // Send verification email
    await transporter.sendMail({
      from: `"Notar.io" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify your Notar.io account",
      text: `Hello ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link is valid for 24 hours.\n\nIf you did not request this email, please ignore it.\n\nRegards,\nNotar.io Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your Notar.io account</h2>
          <p>Hello ${user.name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
          <p>This link is valid for 24 hours.</p>
          <p>If you did not request this email, please ignore it.</p>
          <p style="text-align: right; color: #666; margin-top: 30px; font-size: 12px;">
            Generated on: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "Verification email sent successfully. Please check your inbox." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { message: "An error occurred while sending the verification email" },
      { status: 500 }
    );
  }
}