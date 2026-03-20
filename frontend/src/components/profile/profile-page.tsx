"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { authService } from "@/services/auth.service"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
} from "@/validators/auth.validator"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { passkeyClient } from "@/lib/passkeys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Shield,
  Loader2,
  KeyRound,
  Trash2
} from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageLayout } from "@/components/layout/page-layout"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { PasskeyCredential } from "@/types/auth"

export function ProfilePage() {
  const router = useRouter()
  const { user, setUser, clearAuth } = useAuthStore()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false)
  const [isAddingPasskey, setIsAddingPasskey] = useState(false)
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
    reset: resetPasswordForm,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onUpdateProfile = async (data: UpdateProfileFormData) => {
    try {
      const updatedUser = await authService.updateProfile(data)
      setUser(updatedUser)
      toast.success("Profile updated successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const onChangePassword = async (data: ChangePasswordFormData) => {
    try {
      await authService.changePassword(data)
      toast.success("Password changed successfully! Please login again.")
      clearAuth()
      router.push("/login")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      resetPasswordForm()
    }
  }

  const handleResendVerification = async () => {
    setIsResendingVerification(true)
    try {
      await authService.resendVerificationEmail()
      setVerificationEmailSent(true)
      toast.success("Verification email sent! Check your inbox.")
      
      // Reset after 2 minutes in production, 10 seconds in development
      const isDevelopment = process.env.NODE_ENV === "development"
      const cooldownTime = isDevelopment ? 10000 : 120000
      
      setTimeout(() => {
        setVerificationEmailSent(false)
      }, cooldownTime)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      
      // If error says email is already verified, refresh user data
      if (errorMessage.includes("already verified")) {
        try {
          const { user: updatedUser } = await authService.getMe()
          setUser(updatedUser)
          toast.success("Your email is already verified!")
        } catch (refreshError) {
          toast.error(errorMessage)

        }
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsResendingVerification(false)
    }
  }

  const loadPasskeys = async () => {
    if (!passkeyClient.isSupported()) {
      return
    }

    setIsLoadingPasskeys(true)
    try {
      const credentials = await authService.listPasskeys()
      setPasskeys(credentials)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoadingPasskeys(false)
    }
  }

  useEffect(() => {
    void loadPasskeys()
  }, [])

  const handleAddPasskey = async () => {
    if (!passkeyClient.isSupported()) {
      toast.error("Passkeys are not supported in this browser.")
      return
    }

    setIsAddingPasskey(true)
    try {
      const options = await authService.beginPasskeyRegistration()
      const credential = await passkeyClient.register(options)
      const savedCredential = await authService.verifyPasskeyRegistration({
        response: credential,
      })
      setPasskeys((current) => [savedCredential, ...current])
      toast.success("Passkey added successfully!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsAddingPasskey(false)
    }
  }

  const handleDeletePasskey = async (credentialId: string) => {
    setDeletingCredentialId(credentialId)
    try {
      await authService.deletePasskey(credentialId)
      setPasskeys((current) =>
        current.filter((credential) => credential.credential_id !== credentialId)
      )
      toast.success("Passkey removed successfully!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setDeletingCredentialId(null)
    }
  }

  if (!user) {
    return null
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 sm:p-6">
          {/* Profile Header Card */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-primary/10">
                  <AvatarFallback className="text-3xl font-semibold bg-linear-to-br from-primary/20 to-primary/5">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{user.name}</h1>
                    <p className="text-muted-foreground mt-1">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge variant={user.is_active ? "default" : "secondary"} className="gap-1">
                      {user.is_active ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={user.is_verified ? "default" : "outline"} className="gap-1">
                      {user.is_verified ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {user.is_verified ? "Verified" : "Not Verified"}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Email Verification Card - Only show if not verified */}
            {!user.is_verified && (
              <Card className="md:col-span-2 border-yellow-500/50 bg-yellow-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Mail className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle>Email Verification</CardTitle>
                      <CardDescription>Verify your email address to unlock all features</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <XCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          Your email address is not verified
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          We sent a verification email to <span className="font-medium">{user.email}</span>. 
                          Click the link in the email to verify your account.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={handleResendVerification}
                        disabled={isResendingVerification || verificationEmailSent}
                        variant="outline"
                        className="border-yellow-500/50 hover:bg-yellow-500/10 w-full sm:w-auto"
                      >
                        {isResendingVerification ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : verificationEmailSent ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Email Sent!
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Verification Email
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {verificationEmailSent 
                          ? "Email sent successfully! You can request another email in 2 minutes."
                          : "Didn't receive the email? Check your spam folder or click to resend."
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Update Profile Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitProfile(onUpdateProfile)}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        {...registerProfile("name")}
                        disabled={isSubmittingProfile}
                      />
                      {profileErrors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {profileErrors.name.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        {...registerProfile("email")}
                        disabled={isSubmittingProfile}
                      />
                      {profileErrors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {profileErrors.email.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        {...registerProfile("phone")}
                        disabled={isSubmittingProfile}
                      />
                      {profileErrors.phone && (
                        <p className="text-sm text-destructive mt-1">
                          {profileErrors.phone.message}
                        </p>
                      )}
                      <FieldDescription>10-digit phone number</FieldDescription>
                    </Field>

                    <Button 
                      type="submit" 
                      disabled={isSubmittingProfile}
                      className="w-full"
                    >
                      {isSubmittingProfile ? "Updating..." : "Update Profile"}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Shield className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Change your password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPassword(onChangePassword)}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="currentPassword" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Current Password
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter current password"
                          {...registerPassword("currentPassword")}
                          disabled={isSubmittingPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSubmittingPassword}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-sm text-destructive mt-1">
                          {passwordErrors.currentPassword.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="newPassword" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        New Password
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          {...registerPassword("newPassword")}
                          disabled={isSubmittingPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSubmittingPassword}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-sm text-destructive mt-1">
                          {passwordErrors.newPassword.message}
                        </p>
                      )}
                      <FieldDescription>
                        Min 8 chars with uppercase, lowercase & number
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="confirmNewPassword" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Confirm New Password
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="confirmNewPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          {...registerPassword("confirmNewPassword")}
                          disabled={isSubmittingPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSubmittingPassword}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.confirmNewPassword && (
                        <p className="text-sm text-destructive mt-1">
                          {passwordErrors.confirmNewPassword.message}
                        </p>
                      )}
                    </Field>

                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isSubmittingPassword}
                      className="w-full"
                    >
                      {isSubmittingPassword ? "Changing..." : "Change Password"}
                    </Button>
                    <FieldDescription className="text-center">
                      You will be logged out after changing password
                    </FieldDescription>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <KeyRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Passkeys</CardTitle>
                      <CardDescription>Use your device or security key to sign in without typing a password</CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddPasskey}
                    disabled={isAddingPasskey || !passkeyClient.isSupported()}
                  >
                    {isAddingPasskey ? "Waiting for passkey..." : "Add Passkey"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!passkeyClient.isSupported() ? (
                  <p className="text-sm text-muted-foreground">
                    This browser does not support passkeys.
                  </p>
                ) : isLoadingPasskeys ? (
                  <p className="text-sm text-muted-foreground">Loading passkeys...</p>
                ) : passkeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No passkeys registered yet. Add one to sign in faster and reduce password use.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {passkeys.map((credential) => (
                      <div
                        key={credential.credential_id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{credential.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {credential.credential_device_type === "multiDevice" ? "Synced passkey" : "Single-device passkey"}
                            {credential.transports.length > 0 ? ` • ${credential.transports.join(", ")}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(credential.created_at).toLocaleDateString()}
                            {credential.last_used_at
                              ? ` • Last used ${new Date(credential.last_used_at).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePasskey(credential.credential_id)}
                          disabled={deletingCredentialId === credential.credential_id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingCredentialId === credential.credential_id ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
