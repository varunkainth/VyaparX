"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { businessService } from "@/services/business.service"
import { useAuthStore } from "@/store/useAuthStore"
import type { BusinessInvite } from "@/types/business"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Wordmark } from "@/components/branding/wordmark"
import { getErrorMessage } from "@/lib/error-handler"

const roleLabel = (role?: string | null) => {
  if (!role) return "Member"
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [invite, setInvite] = useState<BusinessInvite | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    void businessService
      .getInvite(token)
      .then((data) => {
        if (isMounted) {
          setInvite(data)
        }
      })
      .catch((error) => {
        if (isMounted) {
          toast.error(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const nextQuery = token ? new URLSearchParams({ next: `/accept-invite?token=${token}`, email: invite?.email || "" }).toString() : ""
  const loginHref = nextQuery ? `/login?${nextQuery}` : "/login"
  const signupHref = nextQuery ? `/signup?${nextQuery}` : "/signup"

  const handleAccept = async () => {
    if (!token || !user) return

    setIsAccepting(true)
    try {
      const response = await businessService.acceptInvite(token)
      setAuth(user, response.tokens, response.session)
      toast.success(`Joined ${invite?.business_name || "the business"} successfully`)
      router.push("/dashboard")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsAccepting(false)
    }
  }

  const emailMismatch =
    isAuthenticated &&
    user?.email &&
    invite?.email &&
    user.email.toLowerCase() !== invite.email.toLowerCase()

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#111214_46%,#17120f_100%)] p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-[-5rem] h-80 w-80 rounded-full bg-orange-500/18 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-72 w-72 rounded-full bg-amber-300/12 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-2xl border-white/10 bg-white/6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur">
        <CardHeader className="space-y-3">
          <Wordmark compact />
          <div className="space-y-1">
            <CardTitle className="font-serif text-3xl italic text-white">Business invite</CardTitle>
            <CardDescription>
              Review the invite details and join the business from here.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <Alert>
              <AlertDescription>Invite token is missing from the link.</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && invite && (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{roleLabel(invite.role)}</Badge>
                  <Badge variant="outline">{invite.status || "pending"}</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-stone-300">
                  <p>
                    <span className="text-stone-500">Business:</span> {invite.business_name}
                  </p>
                  <p>
                    <span className="text-stone-500">Invited email:</span> {invite.email}
                  </p>
                  <p>
                    <span className="text-stone-500">Invited by:</span> {invite.inviter_name || invite.inviter_email || "A VyaparX admin"}
                  </p>
                  <p>
                    <span className="text-stone-500">Expires:</span> {new Date(invite.expires_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {invite.status !== "pending" && (
                <Alert>
                  <AlertDescription>
                    This invite is {invite.status}. Ask the business owner to send a new one if you still need access.
                  </AlertDescription>
                </Alert>
              )}

              {!isAuthenticated && invite.status === "pending" && (
                <Alert>
                  <AlertDescription>
                    Sign in with <strong>{invite.email}</strong>, or create an account with that email, then return here to accept the invite.
                  </AlertDescription>
                </Alert>
              )}

              {emailMismatch && (
                <Alert>
                  <AlertDescription>
                    You are signed in as <strong>{user?.email}</strong>. This invite was sent to <strong>{invite.email}</strong>. Switch accounts to accept it.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3">
                {!isAuthenticated && invite.status === "pending" && (
                  <>
                    <Button asChild>
                      <Link href={loginHref}>Sign in to accept</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={signupHref}>Create account</Link>
                    </Button>
                  </>
                )}

                {isAuthenticated && emailMismatch && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearAuth()
                      router.push(loginHref)
                    }}
                  >
                    Use another account
                  </Button>
                )}

                {isAuthenticated && !emailMismatch && invite.status === "pending" && (
                  <Button onClick={handleAccept} disabled={isAccepting}>
                    {isAccepting ? "Accepting..." : "Accept and join"}
                  </Button>
                )}

                <Button asChild variant="ghost">
                  <Link href={isAuthenticated ? "/dashboard" : "/"}>{isAuthenticated ? "Back to dashboard" : "Back to home"}</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
