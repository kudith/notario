"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Loader2, Shield, CheckCircle, Info, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

// Helper function to verify if a string is valid base64
function isValidBase64(str) {
  if (!str) return false;
  try {
    // Check if the string contains only valid base64 characters
    return /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;
  } catch (e) {
    return false;
  }
}

// Web Crypto API functions for key generation and signing
async function generateKeyPair(algorithm = "RSA") {
  try {
    // Support both RSA and ECDSA algorithms
    if (algorithm === "ECDSA") {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256", // Use P-256 curve for ECDSA
        },
        true,
        ["sign", "verify"]
      );
      
      const publicKeyExport = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const privateKeyExport = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      
      return {
        privateKey: keyPair.privateKey,
        publicKeyBase64: btoa(String.fromCharCode.apply(null, new Uint8Array(publicKeyExport))),
        privateKeyBase64: btoa(String.fromCharCode.apply(null, new Uint8Array(privateKeyExport)))
      };
    } else {
      // Default to RSA
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );
      
      const publicKeyExport = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const privateKeyExport = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      
      return {
        privateKey: keyPair.privateKey,
        publicKeyBase64: btoa(String.fromCharCode.apply(null, new Uint8Array(publicKeyExport))),
        privateKeyBase64: btoa(String.fromCharCode.apply(null, new Uint8Array(privateKeyExport)))
      };
    }
  } catch (error) {
    console.error("Error generating key pair:", error);
    throw new Error("Failed to generate cryptographic keys");
  }
}

async function importPrivateKey(privateKeyBase64, algorithm = "RSA") {
  // Safety check for invalid base64 input
  if (!privateKeyBase64 || !isValidBase64(privateKeyBase64)) {
    console.error("Invalid private key format");
    throw new Error("Invalid private key format");
  }
  
  try {
    const binaryString = atob(privateKeyBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    if (algorithm === "ECDSA") {
      return window.crypto.subtle.importKey(
        "pkcs8",
        bytes.buffer,
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        false,
        ["sign"]
      );
    } else {
      // Default to RSA
      return window.crypto.subtle.importKey(
        "pkcs8",
        bytes.buffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
    }
  } catch (error) {
    console.error("Error importing private key:", error);
    throw new Error("Failed to import private key");
  }
}

async function signData(privateKey, data, algorithm = "RSA") {
  try {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    if (algorithm === "ECDSA") {
      // For ECDSA, get raw signature and ensure proper formatting
      const signature = await window.crypto.subtle.sign(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        privateKey,
        encodedData
      );
      
      // Log information to help with debugging
      console.log(`Generated ECDSA signature of ${encodedData.length} bytes of data`);
      console.log(`Raw signature size: ${signature.byteLength} bytes`);
      
      // Return raw signature in base64 format
      // Important: this is in IEEE P1363 format (r,s concatenated)
      return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
    } else {
      // Default to RSA (unchanged)
      const signature = await window.crypto.subtle.sign(
        {
          name: "RSASSA-PKCS1-v1_5",
        },
        privateKey,
        encodedData
      );
      
      return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
    }
  } catch (error) {
    console.error("Error signing data:", error);
    throw new Error("Failed to create digital signature");
  }
}

export default function SignaturePanel({ fileHash, onSignatureGenerated, userPublicKey }) {
  const { data: session } = useSession();
  const [privateKey, setPrivateKey] = useState(null);
  const [publicKeyBase64, setPublicKeyBase64] = useState("");
  const [keyStatus, setKeyStatus] = useState("checking");
  const [isWorking, setIsWorking] = useState(false);
  const [algorithm, setAlgorithm] = useState("RSA"); // Default to RSA
  const [needsKeyRefresh, setNeedsKeyRefresh] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Check for existing keys on component mount
  useEffect(() => {
    const checkForKeys = async () => {
      if (!session?.user?.id) {
        setKeyStatus("notLoggedIn");
        return;
      }
      
      setKeyStatus("checking");
      
      try {
        // Check for session key
        const sessionKeyId = `pk_${session.user.id}`;
        const privateKeyBase64 = sessionStorage.getItem(sessionKeyId);
        
        // Fetch current user data to get algorithm preference and public key
        let userData;
        try {
          const userResponse = await fetch('/api/user/me');
          
          if (userResponse.ok) {
            userData = await userResponse.json();
            
            // Set the algorithm from user data
            const userAlgorithm = userData.security?.algorithm || "RSA";
            setAlgorithm(userAlgorithm);
          } else {
            console.error("Error fetching user data");
            setKeyStatus("needsKey");
            return;
          }
        } catch (fetchError) {
          console.error("Error fetching user data:", fetchError);
          setKeyStatus("needsKey");
          return;
        }
        
        // If we have a private key in session storage, attempt to import it
        if (privateKeyBase64 && isValidBase64(privateKeyBase64)) {
          try {
            if (userData.security?.publicKey) {
              // Import the private key
              const importedKey = await importPrivateKey(privateKeyBase64, userData.security.algorithm);
              setPrivateKey(importedKey);
              setPublicKeyBase64(userData.security.publicKey);
              
              // Check if the server public key matches what we expect - it might have changed
              if (userPublicKey && userPublicKey !== userData.security.publicKey) {
                console.log("Key mismatch detected, needs refresh");
                setNeedsKeyRefresh(true);
              }
              
              setKeyStatus("ready");
            } else {
              // User has no public key in database
              console.log("No public key found in user data");
              setKeyStatus("needsKey");
            }
          } catch (importError) {
            console.error("Error importing keys:", importError);
            setLastError("Failed to load cryptographic keys");
            setKeyStatus("needsKey");
            
            // Clean up potentially corrupted key
            sessionStorage.removeItem(sessionKeyId);
          }
        } else {
          // No session key found or invalid key format
          if (privateKeyBase64 && !isValidBase64(privateKeyBase64)) {
            console.warn("Invalid private key format found in session storage");
            sessionStorage.removeItem(sessionKeyId);
          }
          console.log("No valid private key found, new key needed");
          setKeyStatus("needsKey");
        }
      } catch (error) {
        console.error("Error checking for keys:", error);
        setLastError(error.message);
        setKeyStatus("error");
      }
    };
    
    checkForKeys();
  }, [session, userPublicKey]);

  // Handle activating a new key
  const handleActivateKey = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to sign documents");
      return;
    }
    
    setIsWorking(true);
    setLastError(null);
    
    try {
      // Generate a new key pair using the correct algorithm
      const { privateKey, publicKeyBase64, privateKeyBase64 } = await generateKeyPair(algorithm);
      
      // Update public key in database
      const response = await fetch('/api/user/updateKeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          publicKey: publicKeyBase64,
          algorithm: algorithm // Also send the algorithm to ensure it's stored
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update signature key");
      }
      
      // Store private key in session storage 
      sessionStorage.setItem(`pk_${session.user.id}`, privateKeyBase64);
      
      // Update state
      setPrivateKey(privateKey);
      setPublicKeyBase64(publicKeyBase64);
      setKeyStatus("ready");
      setNeedsKeyRefresh(false);
      
      toast.success(`${algorithm} signature key activated for this session`);
    } catch (error) {
      console.error("Error activating signature key:", error);
      setLastError(error.message || "Failed to activate signature key");
      toast.error("Failed to activate signature key");
      setKeyStatus("error");
    } finally {
      setIsWorking(false);
    }
  };

  // Sign the document
  const handleSignDocument = async () => {
    if (!privateKey || !fileHash) {
      toast.error("Cannot sign document");
      return;
    }
    
    setIsWorking(true);
    
    try {
      // Add timestamp to the signature data
      const timestamp = new Date().toISOString();
      const dataToSign = `${fileHash}|${timestamp}`;
      
      const signature = await signData(privateKey, dataToSign, algorithm);
      
      // Pass both the signature and timestamp back to parent component
      onSignatureGenerated(signature, publicKeyBase64, timestamp);
      
      toast.success(`Document signed successfully with ${algorithm}`);
    } catch (error) {
      console.error("Error signing document:", error);
      toast.error("Failed to sign document");
    } finally {
      setIsWorking(false);
    }
  };

  // Render different content based on key status
  const renderContent = () => {
    switch (keyStatus) {
      case "checking":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-center">Preparing signature system...</p>
          </div>
        );
        
      case "notLoggedIn":
        return (
          <Alert className="mb-4">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Sign in Required</AlertTitle>
            <AlertDescription>
              Please sign in to digitally sign this document.
            </AlertDescription>
          </Alert>
        );
        
      case "needsKey":
        return (
          <>
            <Alert className="mb-4">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="flex items-center justify-between">
                <span>Digital Signature Needed</span>
                <Badge variant="outline" className="ml-2">
                  {algorithm}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">Activate a digital signature key for this session.</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Each browser session requires a new signature key for security.
                  Your key will use the {algorithm} algorithm.
                </p>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleActivateKey} 
              disabled={isWorking}
              className="w-full"
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Activate {algorithm} Signature Key
                </>
              )}
            </Button>
            
            {lastError && (
              <p className="text-xs text-destructive mt-2 text-center">
                Error: {lastError}
              </p>
            )}
          </>
        );
        
      case "ready":
        return (
          <>
            {needsKeyRefresh ? (
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Key Refresh Recommended</AlertTitle>
                <AlertDescription className="text-sm">
                  <p>Your signature keys may be out of sync with your account settings.</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleActivateKey} 
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Keys
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-muted/30 border-primary/20 mb-4">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Ready to Sign</span>
                  <Badge variant="secondary" className="ml-2">
                    {algorithm}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-sm">
                  Your {algorithm} digital signature key is active and ready to use.
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleSignDocument}
              disabled={isWorking || !fileHash}
              className="w-full"
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Sign Document with {algorithm}
                </>
              )}
            </Button>
          </>
        );
        
      case "error":
        return (
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {lastError || "An error occurred with the signature system. Please try again."}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleActivateKey} 
              disabled={isWorking}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </>
        );
        
      default:
        return <p>Initializing...</p>;
    }
  };

  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader className="pb-3 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center">
            <Shield className="h-4 w-4 text-primary mr-2" />
            Digital Signature
          </CardTitle>
          {algorithm && (
            <Badge variant="outline" className="font-mono text-xs">
              {algorithm}
            </Badge>
          )}
        </div>
        <CardDescription>Sign this document to verify its authenticity</CardDescription>
      </CardHeader>
      
      <CardContent className="p-5 space-y-4 bg-card/50">
        <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-md">
          <p>
            Digital signatures create cryptographic proof of document authenticity. 
            Your {algorithm} signature key is valid for this browser session only.
          </p>
          {algorithm === "ECDSA" && (
            <p className="mt-2 text-xs text-primary-foreground/70">
              ECDSA provides equivalent security to RSA with smaller key sizes and faster processing.
            </p>
          )}
        </div>
        
        {renderContent()}
      </CardContent>
    </Card>
  );
}