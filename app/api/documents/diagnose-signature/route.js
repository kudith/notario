import { NextResponse } from "next/server";
import crypto from "crypto";

// This is a diagnostic endpoint to determine what signature format works
export async function POST(req) {
  try {
    const formData = await req.formData();
    const signature = formData.get("signature");
    const publicKey = formData.get("publicKey");
    const fileHash = formData.get("fileHash");
    
    if (!signature || !publicKey || !fileHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format the public key if needed
    let formattedPublicKey = publicKey;
    if (!publicKey.includes("-----BEGIN")) {
      formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }
    
    // Convert signature to buffer
    const signatureBuffer = Buffer.from(signature, "base64");
    
    // Try all possible data formats and hash algorithms
    const results = {};
    const algorithms = ["SHA256", "SHA1", "MD5"];
    
    // Test different input formats
    const testInputs = [
      { name: "original_hex", value: fileHash },
      { name: "binary_hash", value: Buffer.from(fileHash, "hex") },
      { name: "utf8_hash", value: fileHash.toString("utf8") }
    ];
    
    // Test all combinations
    for (const algo of algorithms) {
      for (const input of testInputs) {
        try {
          const verify = crypto.createVerify(algo);
          verify.update(input.value);
          const result = verify.verify(formattedPublicKey, signatureBuffer);
          results[`${algo}_${input.name}`] = result;
        } catch (err) {
          results[`${algo}_${input.name}_error`] = err.message;
        }
      }
    }
    
    // NEW CODE: Test for timestamps in different formats
    // Generate some possible timestamp patterns
    const now = new Date();
    const possibleTimestamps = [
      now.toISOString(),
      new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
      new Date(now.getTime() - 120000).toISOString() // 2 minutes ago
    ];
    
    // Test combinations with timestamps
    for (const algo of algorithms) {
      for (const timestamp of possibleTimestamps) {
        const timestampedData = `${fileHash}|${timestamp}`;
        try {
          const verify = crypto.createVerify(algo);
          verify.update(timestampedData);
          const result = verify.verify(formattedPublicKey, signatureBuffer);
          results[`${algo}_with_timestamp_${timestamp.substring(0, 10)}`] = result;
          
          // If we found a match, add the exact format that worked
          if (result) {
            results.found_working_format = {
              algorithm: algo,
              format: "timestamp",
              data: timestampedData.substring(0, 40) + "..." // Truncate for readability
            };
          }
        } catch (err) {
          results[`${algo}_with_timestamp_error`] = err.message;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      hashPreview: fileHash.substring(0, 16) + "...",
      signatureLength: signatureBuffer.length,
      results: results,
      recommendedFix: results.found_working_format 
        ? `Use format: ${results.found_working_format.algorithm} with timestamp pattern`
        : "Check the client-side signing code to match the server verification"
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: "Diagnostic failed", details: error.message },
      { status: 500 }
    );
  }
}