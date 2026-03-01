import type { Metadata } from "next"
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password",
}
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

function ResetPasswordContent() {
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950"><p className="text-gray-400">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
