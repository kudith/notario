"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { AuthTabs } from "@/components/auth-tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Mail, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Handle verification needed from AuthTabs
  const handleVerificationRequired = (email) => {
    setVerificationEmail(email);
    setShowVerificationDialog(true);
  };

  // Check for verification error in URL
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "EMAIL_NOT_VERIFIED") {
      const email = searchParams.get("email") || "";
      setVerificationEmail(email);
      setShowVerificationDialog(true);
    }
  }, [searchParams]);

  // Reset success state when dialog closes
  const handleDialogChange = (open) => {
    setShowVerificationDialog(open);
    if (!open) {
      setResendSuccess(false);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!verificationEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend verification email");
      }

      setResendSuccess(true);
      toast.success(data.message || "Verification email sent");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setResendLoading(false);
    }
  };

  // Redirect to profile if user is already logged in
  useEffect(() => {
    if (status === "authenticated") {
      redirect("/profile");
    }
  }, [status]);

  // Show loading state while checking authentication status
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="container max-w-6xl mx-auto py-12 px-4 md:py-24">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold">Authentication</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Sign in to your account or create a new one to use all features of Notar.io
            </p>
          </div>
          
          <AuthTabs onVerificationRequired={handleVerificationRequired} />
        </div>
      </div>
      
      {/* Email verification dialog - Now at the page level */}
      <Dialog open={showVerificationDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <Badge variant="outline" className="py-1.5 px-3 bg-amber-50 text-amber-600 border-amber-200">
                <AlertCircle className="h-4 w-4 mr-1" />
                Verification Required
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-base text-center px-4 sm:px-8">
              Your email address needs to be verified before you can log in
            </DialogDescription>
          </DialogHeader>

          {!resendSuccess ? (
            <div className="space-y-6 py-2 px-2">
              <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    We've sent a verification email to:
                  </p>
                  <p className="font-mono text-sm bg-muted py-1 px-2 rounded-md break-all">
                    {verificationEmail}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium text-center">Didn't receive the email?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  <li>Check your spam or junk folder</li>
                  <li>Verify that you entered the correct email address</li>
                  <li>Allow a few minutes for the email to arrive</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Verification email sent!</h3>
                <p className="text-sm text-muted-foreground">
                  Please check your inbox and click the verification link.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between border-t pt-4">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                Close
              </Button>
            </DialogClose>

            {!resendSuccess ? (
              <Button 
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="flex-1 sm:flex-none"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Resend Email 
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={handleResendVerification}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Send Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}