"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState("loading"); // loading, success, error
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [isResendLoading, setIsResendLoading] = useState(false);

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setVerificationStatus("error");
        return;
      }

      try {
        const response = await fetch(`/api/verify-email?token=${token}`, {
          method: "GET",
        });

        if (response.ok) {
          setVerificationStatus("success");
        } else {
          setVerificationStatus("error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationStatus("error");
      }
    }

    verifyEmail();
  }, [token]);

  const handleResendVerification = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsResendLoading(true);

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend verification email");
      }

      toast.success(data.message || "Verification email sent");
      setEmail("");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>
            Verifying your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pt-6">
          {verificationStatus === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-lg">Verifying your email address...</p>
            </>
          )}
          
          {verificationStatus === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">Email verified successfully!</p>
              <p className="text-muted-foreground text-center">
                Your email has been verified. You can now log in and access all features of Notar.io.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="mt-4"
              >
                Go to Login
              </Button>
            </>
          )}
          
          {verificationStatus === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-lg font-medium">Verification Failed</p>
              <p className="text-muted-foreground text-center">
                {!token 
                  ? "No verification token found. Please check your verification link."
                  : "The verification link is invalid or has expired. Please request a new verification link."}
              </p>
              
              <div className="w-full border-t border-border mt-6 pt-6">
                <div className="text-center mb-4">
                  <h3 className="font-medium">Need a new verification link?</h3>
                  <p className="text-sm text-muted-foreground">Enter your email below to receive a new verification link</p>
                </div>
                
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div className="grid gap-2">
                    <input
                      type="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isResendLoading}>
                    {isResendLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </Button>
                </form>
              </div>
              
              <Button
                onClick={() => router.push("/login")}
                className="mt-6"
                variant="outline"
              >
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
        
        <CardFooter className="text-center text-sm text-muted-foreground pt-0">
          <p>
            Time of verification: {new Date().toLocaleString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}