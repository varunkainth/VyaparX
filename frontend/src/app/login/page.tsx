import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Login",
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#111214_46%,#17120f_100%)] p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-5rem] top-[-6rem] h-72 w-72 rounded-full bg-orange-500/18 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-amber-300/12 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
