import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { generateUniqueKeyPair, generateUniqueECDSAKeyPair, generateKeyPairByAlgorithm } from "@/utils/crypto-utils";

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
    
    console.log("Algorithm change request received:", { 
      userId,
      requestedAlgorithm: algorithm
    });
    
    // Normalize algorithm to uppercase for consistent comparison
    const normalizedAlgorithm = algorithm?.toUpperCase();
    
    // Validate algorithm selection
    if (!normalizedAlgorithm || !["RSA", "ECDSA"].includes(normalizedAlgorithm)) {
      return NextResponse.json(
        { message: "Invalid algorithm. Choose either 'RSA' or 'ECDSA'" },
        { status: 400 }
      );
    }
    
    // First, fetch the current user to check their existing algorithm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { algorithm: true, publicKey: true }
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Normalize current algorithm for consistent comparison
    const currentAlgorithm = currentUser.algorithm?.toUpperCase();
    
    console.log("Current user algorithm:", { 
      currentAlgorithm,
      requestedAlgorithm: normalizedAlgorithm
    });
    
    // If user already uses the requested algorithm, no need to change
    if (currentAlgorithm === normalizedAlgorithm) {
      console.log(`User ${userId} is already using ${normalizedAlgorithm} algorithm, no change needed`);
      return NextResponse.json(
        { 
          message: `You are already using the ${algorithm} algorithm`,
          algorithm: currentUser.algorithm, // Send back the exact current algorithm string
          user: {
            id: userId,
            algorithm: currentUser.algorithm
          }
        },
        { status: 200 }
      );
    }
    
    // Collect audit information for security logging
    const audit = getAuditInfo(request);
    console.log(`Algorithm change requested for user ${userId} from ${currentUser.algorithm} to ${normalizedAlgorithm}`, audit);
    
    // Generate key pair using the modular function from crypto-utils.js
    // We'll use generateKeyPairByAlgorithm which returns the proper structure with algorithm included
    const keyPairResult = await generateKeyPairByAlgorithm(normalizedAlgorithm);
    const algorithmToSave = keyPairResult.algorithm; // Use the algorithm returned from the util function
    
    console.log(`Generated key pair with algorithm: ${algorithmToSave}`);
    
    // Verify the key pair result contains what we expect
    if (!keyPairResult.publicKey || !keyPairResult.privateKey) {
      throw new Error("Generated key pair is missing required keys");
    }
    
    try {
      // Explicitly record algorithm before update
      console.log("About to save algorithm:", algorithmToSave);
      
      // Directly update the user without transaction
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
      
      console.log("Database update result:", {
        userId,
        algorithmAfterUpdate: updatedUser.algorithm,
        algorithmRequested: algorithmToSave
      });
      
      // Verify that the update was successful
      if (updatedUser.algorithm !== algorithmToSave) {
        console.error("Algorithm mismatch after database update!", {
          expected: algorithmToSave,
          actual: updatedUser.algorithm
        });
        throw new Error(`Algorithm mismatch after update: expected ${algorithmToSave}, got ${updatedUser.algorithm}`);
      }
      
      // Log the successful algorithm change
      console.log(`Algorithm successfully changed to ${algorithmToSave} for user ${userId}`);
      
      // Generate timestamp for cache busting
      const timestamp = Date.now();
      
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
        algorithm: algorithmToSave,
        timestamp: timestamp
      };
      
      return NextResponse.json(response, { status: 200 });
      
    } catch (dbError) {
      console.error("Database update error:", dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }
  } catch (error) {
    console.error("Error changing signature algorithm:", error);
    
    return NextResponse.json(
      { message: `Failed to change signature algorithm: ${error.message}`, error: error.message },
      { status: 500 }
    );
  }
}