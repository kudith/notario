import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getDefaultAvatarUrl } from "@/lib/cloudinary";
import nodemailer from "nodemailer";
import { generateUniqueKeyPair } from "@/utils/crypto-utils";

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: process.env.EMAIL_SERVER_PORT,
  secure: process.env.EMAIL_SERVER_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, institution } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique keypair for the user
    const { publicKey, privateKey } = await generateUniqueKeyPair();

    // Generate default avatar URL based on name
    const avatarUrl = getDefaultAvatarUrl(name);
    
    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        publicKey,
        algorithm: "RSA",
        institution: institution || null,
        avatarUrl,
        cloudinaryId: null,
        verified: false,
        role: "user",
      }
    });

    // Generate verification token
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
      text: `Hello ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link is valid for 24 hours.\n\nIf you did not request this email, please ignore it.\n\nRegards,\nNotar.io Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Notar.io!</h2>
          <p>Hello ${name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
          <p>This link is valid for 24 hours.</p>
          <p>If you did not request this email, please ignore it.</p>
          <p>Regards,<br>Notar.io Team</p>
        </div>
      `,
    });

    // Remove sensitive data from the response
    const newUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      institution: user.institution,
    };

    return NextResponse.json(
      { message: "User registered successfully. Please check your email to verify your account.", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}