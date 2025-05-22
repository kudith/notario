import { Suspense } from "react";
import VerifyEmailClient from "@/components/verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  );
}