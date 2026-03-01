"use client";

import { useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";

interface EmailVerificationBannerProps {
  userEmail: string;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ userEmail, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const { setUser } = useAuthStore();

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.resendVerificationEmail();
      setJustSent(true);
      toast.success("Verification email sent! Check your inbox.");
      
      // Reset after 2 minutes in production, 10 seconds in development
      const isDevelopment = process.env.NODE_ENV === "development";
      const cooldownTime = isDevelopment ? 10000 : 120000;
      
      setTimeout(() => {
        setJustSent(false);
      }, cooldownTime);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // If error says email is already verified, refresh user data
      if (errorMessage.includes("already verified")) {
        try {
          const { user } = await authService.getMe();
          setUser(user);
          toast.success("Your email is already verified!");
        } catch (refreshError) {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 sticky top-0 z-40 w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-yellow-200 truncate">
                <span className="font-medium">Email not verified.</span>{" "}
                <span className="hidden sm:inline">
                  Check your inbox at <span className="font-medium">{userEmail}</span> and verify your email.
                </span>
                <span className="sm:hidden">
                  Check your inbox to verify.
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleResend}
              disabled={isResending || justSent}
              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs sm:text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : justSent ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Resend</span>
                </>
              )}
            </button>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-yellow-200 hover:text-white transition-colors p-1"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
