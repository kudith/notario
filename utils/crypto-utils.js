import crypto from "crypto";
import prisma from "@/lib/prisma";

/**
 * Generates a unique RSA key pair and ensures the public key doesn't already exist in the database
 * @returns {Promise<{publicKey: string, privateKey: string, algorithm: string}>} A unique key pair
 */
export async function generateUniqueKeyPair() {
  // Maximum retry attempts to prevent infinite loops
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    
    try {
      // Generate new key pair with enhanced randomness
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
        // Guaranteed to be 65537 in most implementations, but explicit is better
        publicExponent: 65537,
      });

      // Create a unique fingerprint of the public key for logging/debugging
      const keyFingerprint = crypto
        .createHash("sha256")
        .update(publicKey)
        .digest("hex")
        .substring(0, 8);
        
      console.log(`Generated RSA key pair with fingerprint: ${keyFingerprint}`);
      
      // Verify this public key doesn't already exist in database
      const existingUser = await prisma.user.findFirst({
        where: { publicKey: publicKey },
        select: { id: true }
      });
      
      if (existingUser) {
        console.warn(`Key collision detected on attempt ${attempts}. Regenerating...`);
        continue; // Try again
      }
      
      // Key is unique, return it with explicit algorithm property
      return { publicKey, privateKey, algorithm: "RSA" };
    } catch (error) {
      console.error("Error generating RSA key pair:", error);
      
      // If we've reached max attempts, throw an error
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error("Failed to generate a unique RSA key pair after multiple attempts");
      }
    }
  }
  
  // This should never be reached due to the throw above, but TypeScript might complain without it
  throw new Error("Failed to generate a unique RSA key pair");
}

/**
 * Generates a unique ECDSA key pair and ensures the public key doesn't already exist in the database
 * @returns {Promise<{publicKey: string, privateKey: string, algorithm: string}>} A unique ECDSA key pair
 */
export async function generateUniqueECDSAKeyPair() {
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
      
      // Key is unique, return it with explicit algorithm property
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
 * Generates a unique key pair based on the requested algorithm
 * @param {string} algorithm - 'RSA' or 'ECDSA'
 * @returns {Promise<{publicKey: string, privateKey: string, algorithm: string}>} A unique key pair
 */
export async function generateKeyPairByAlgorithm(algorithm) {
  if (algorithm.toUpperCase() === "RSA") {
    const keyPair = await generateUniqueKeyPair();
    return keyPair; // Already includes algorithm: "RSA"
  } else if (algorithm.toUpperCase() === "ECDSA") {
    const keyPair = await generateUniqueECDSAKeyPair();
    return keyPair; // Already includes algorithm: "ECDSA"
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}. Choose either 'RSA' or 'ECDSA'`);
  }
}

/**
 * Enhanced ECDSA key generation with support for multiple curves
 * @param {string} curve - The elliptic curve to use ('P-256', 'P-384', 'P-521', 'secp256k1')
 * @returns {Promise<{publicKey: string, privateKey: string, algorithm: string, curve: string}>}
 */
export async function generateECDSAKeyPairWithCurve(curve = 'P-256') {
  // Validate curve selection
  const supportedCurves = ['P-256', 'P-384', 'P-521', 'secp256k1'];
  if (!supportedCurves.includes(curve)) {
    throw new Error(`Unsupported curve: ${curve}. Supported curves: ${supportedCurves.join(', ')}`);
  }
  
  try {
    // Generate new ECDSA key pair with specified curve
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: curve,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });
    
    // Create a unique fingerprint of the public key
    const keyFingerprint = crypto
      .createHash("sha256")
      .update(publicKey)
      .digest("hex")
      .substring(0, 8);
      
    console.log(`Generated ECDSA key pair using ${curve} curve with fingerprint: ${keyFingerprint}`);
    
    // Check for database collisions if needed
    const existingUser = await prisma.user.findFirst({
      where: { publicKey: publicKey },
      select: { id: true }
    });
    
    if (existingUser) {
      throw new Error("Key collision detected. Please try again.");
    }
    
    // Return complete information
    return { 
      publicKey, 
      privateKey, 
      algorithm: "ECDSA", 
      curve,
      keyFingerprint
    };
  } catch (error) {
    console.error(`Error generating ECDSA key pair with curve ${curve}:`, error);
    throw new Error(`Failed to generate ECDSA key pair: ${error.message}`);
  }
}