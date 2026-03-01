import type { Metadata } from "next"
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verify Email",
}
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

function VerifyEmailContent() {
  return <VerifyEmailForm />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950"><p className="text-gray-400">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
