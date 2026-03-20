"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth.service"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema, type SignupFormData } from "@/validators/auth.validator"
import { getErrorMessage } from "@/lib/error-handler"
import { Wordmark } from "@/components/branding/wordmark"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { setAuth, setLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);

    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...signupData } = data;
      const response = await authService.signup(signupData);
      setAuth(response.user, response.tokens, response.session);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-white/10 bg-white/6 p-0 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Wordmark className="items-center" compact />
                <h1 className="mt-2 font-serif text-3xl italic text-white">Create your account</h1>
                <p className="text-sm text-balance text-stone-400">
                  Set up your workspace and start billing with a cleaner system.
                </p>
              </div>
              
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...register("name")}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.name.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  {...register("phone")}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.phone.message}
                  </p>
                )}
                <FieldDescription>
                  Enter 10-digit phone number without country code
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
                <FieldDescription>
                  Must be at least 8 characters with uppercase, lowercase, and number
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Already have an account? <Link href="/login">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden overflow-hidden md:flex md:flex-col md:justify-between bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.2),_transparent_34%),linear-gradient(160deg,#111214_0%,#1c1917_44%,#09090b_100%)] p-8 text-white">
            <div className="absolute inset-0 opacity-45">
              <div className="absolute left-6 top-12 h-28 w-28 rounded-full bg-amber-200 blur-3xl" />
              <div className="absolute bottom-8 right-8 h-36 w-36 rounded-full bg-orange-300 blur-3xl" />
            </div>
            <div className="relative">
              <p className="text-sm uppercase tracking-[0.26em] text-orange-200/80">Start with style</p>
              <h2 className="mt-4 font-serif text-4xl italic leading-tight">
                A smarter
                <span className="block text-orange-200">business desk.</span>
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-stone-200/80">
                Bring billing, inventory, parties, and reporting together from day one.
              </p>
            </div>
            <div className="relative grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-sm text-stone-300">Get started fast</p>
                <p className="mt-1 text-xl font-semibold">No spreadsheet sprawl</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-sm text-stone-300">Designed for</p>
                <p className="mt-1 text-xl font-semibold">Small teams and growing shops</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
