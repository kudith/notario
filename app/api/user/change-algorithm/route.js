import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { generateUniqueKeyPair } from "@/utils/crypto-utils";

/**
 * Generates a unique ECDSA key pair and ensures the public key doesn't already exist in the database
 * @returns {Promise<{publicKey: string, privateKey: string, algorithm: string}>} A unique ECDSA key pair
 */
async function generateUniqueECDSAKeyPair() {
  // Maximum retry attempts to prevent infinite loops
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    
    try {
      // Generate new ECDSA key pair with enhanced security
      // Using P-256 curve (secp256r1) which offers good balance of security and performance
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
        namedCurve: "P-256", // NIST P-256 curve (equivalent to secp256r1)
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      // Create a unique fingerprint of the public key for logging/debugging
      const keyFingerprint = crypto
        .createHash("sha256")
        .update(publicKey)
        .digest("hex")
        .substring(0, 8);
        
      console.log(`Generated ECDSA key pair with fingerprint: ${keyFingerprint}`);
      
      // Verify this public key doesn't already exist in database
      const existingUser = await prisma.user.findFirst({
        where: { publicKey: publicKey },
        select: { id: true }
      });
      
      if (existingUser) {
        console.warn(`Key collision detected on attempt ${attempts}. Regenerating...`);
        continue; // Try again
      }
      
      // Key is unique, return it
      return { publicKey, privateKey, algorithm: "ECDSA" };
    } catch (error) {
      console.error("Error generating ECDSA key pair:", error);
      
      // If we've reached max attempts, throw an error
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error("Failed to generate a unique ECDSA key pair after multiple attempts");
      }
    }
  }
  
  // This should never be reached due to the throw above, but TypeScript might complain without it
  throw new Error("Failed to generate a unique ECDSA key pair");
}

/**
 * Retrieves sensitive audit information for security logging
 */
function getAuditInfo(req) {
  return {
    ip: req.headers.get("x-forwarded-for") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
    timestamp: new Date().toISOString()
  };
}

export async function POST(request) {
  try {
    // Security: Ensure user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Get the requested algorithm from request body
    const body = await request.json();
    const { algorithm } = body;
    
    // Normalize algorithm to uppercase for consistent comparison
    const normalizedAlgorithm = algorithm?.toUpperCase();
    
    // Validate algorithm selection
    if (!normalizedAlgorithm || !["RSA", "ECDSA"].includes(normalizedAlgorithm)) {
      return NextResponse.json(
        { message: "Invalid algorithm. Choose either 'RSA' or 'ECDSA'" },
        { status: 400 }
      );
    }
    
    // Fetch current user to check their existing algorithm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { algorithm: true }
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Normalize current algorithm for consistent comparison
    const currentAlgorithm = currentUser.algorithm?.toUpperCase();
    
    // If user already uses the requested algorithm, no need to change
    if (currentAlgorithm === normalizedAlgorithm) {
      return NextResponse.json(
        { message: `You are already using the ${algorithm} algorithm` },
        { status: 200 }
      );
    }
    
    // Collect audit information for security logging
    const audit = getAuditInfo(request);
    console.log(`Algorithm change requested for user ${userId} from ${currentUser.algorithm} to ${normalizedAlgorithm}`, audit);
    
    // Generate appropriate key pair based on the requested algorithm
    let keyPairResult;
    let algorithmToSave;
    
    if (normalizedAlgorithm === "RSA") {
      keyPairResult = await generateUniqueKeyPair();
      algorithmToSave = "RSA"; // Explicitly set algorithm
    } else {
      // Must be ECDSA since we validated earlier
      keyPairResult = await generateUniqueECDSAKeyPair();
      algorithmToSave = "ECDSA"; // Explicitly set algorithm
    }
    
    // Always explicitly update with the correct algorithm
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        publicKey: keyPairResult.publicKey,
        algorithm: algorithmToSave // Use our explicitly defined algorithm value
      },
      select: {
        id: true,
        name: true,
        email: true,
        algorithm: true
      }
    });
    
    // Log the successful algorithm change
    console.log(`Algorithm successfully changed to ${algorithmToSave} for user ${userId}`, {
      ...audit,
      keyFingerprint: crypto.createHash("sha256").update(keyPairResult.publicKey).digest("hex").substring(0, 8)
    });
    
    // Prepare response with consistent algorithm value
    const response = {
      message: `Successfully changed signature algorithm to ${algorithmToSave}`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        algorithm: updatedUser.algorithm
      },
      publicKey: keyPairResult.publicKey,
      privateKey: keyPairResult.privateKey,
      // Include algorithm in response for client to verify
      algorithm: algorithmToSave
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error changing signature algorithm:", error);
    
    return NextResponse.json(
      { message: "Failed to change signature algorithm", error: error.message },
      { status: 500 }
    );
  }
}