"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Wordmark } from "@/components/branding/wordmark";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-400" />
          <p className="text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#111214_38%,#17120f_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-10%] top-[-8rem] h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute right-[-8%] top-24 h-96 w-96 rounded-full bg-amber-300/12 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <Wordmark compact />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-white/6 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/8 px-4 py-2 text-sm text-orange-100 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-orange-300" />
              Built for Indian businesses that need speed, clarity, and control
            </div>
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.96] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Accounting that
              <span className="block italic text-orange-300">stays sharp</span>
              while your business moves fast.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300 sm:text-xl">
              VyaparX brings invoices, inventory, parties, payments, and reports into one focused workspace designed to feel premium instead of heavy.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-7 py-4 text-base font-medium text-white transition-colors hover:bg-orange-400"
              >
                Create your workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-700 bg-white/4 px-7 py-4 text-base font-medium text-white transition-colors hover:bg-white/8"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-semibold text-white">Invoices</p>
                <p className="mt-1 text-sm text-stone-400">Create polished bills and share them fast.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-semibold text-white">Inventory</p>
                <p className="mt-1 text-sm text-stone-400">Track stock movement without spreadsheet drift.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-semibold text-white">Reports</p>
                <p className="mt-1 text-sm text-stone-400">See cash, GST, and margins clearly.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="rounded-[1.5rem] bg-stone-950 p-6 text-white ring-1 ring-white/8">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.25em] text-stone-400">VyaparX Desk</p>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-stone-400">Today&apos;s collections</p>
                    <p className="mt-2 text-3xl font-semibold">₹1,28,400</p>
                    <p className="mt-1 text-sm text-emerald-400">+12.4% from yesterday</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-sm text-stone-400">Pending</p>
                      <p className="mt-2 text-2xl font-semibold">18</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-sm text-stone-400">Low stock</p>
                      <p className="mt-2 text-2xl font-semibold">07</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-r from-orange-500/16 to-amber-300/8 p-4">
                    <p className="text-sm text-orange-100">Clean books. Faster billing. Better follow-up.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-400/12 bg-orange-500/10 p-4">
                  <p className="text-sm text-orange-100">Payment collection rate</p>
                  <p className="mt-2 text-2xl font-semibold text-white">91%</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-sm text-stone-400">GST-ready records</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Always on</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Why it feels better</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-white sm:text-5xl">
            A sharper surface for routine business work.
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            The product is built to reduce clutter, shorten billing cycles, and keep the numbers readable when the day gets messy.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-6 shadow-sm backdrop-blur">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/14 text-orange-300">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Invoicing</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Build sales and purchase invoices, track payment status, and share documents without the usual admin drag.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-6 shadow-sm backdrop-blur">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/14 text-emerald-300">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Inventory</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Stay ahead of low stock, movement history, and valuation shifts before they become operational surprises.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-6 shadow-sm backdrop-blur">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/14 text-sky-300">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Parties</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Keep customer and supplier relationships organized with balances, records, and transaction context in one place.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/6 p-6 shadow-sm backdrop-blur">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/14 text-amber-300">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Reports</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Read sales, purchases, GST, and profit trends quickly enough to act while the numbers still matter.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[2rem] border border-orange-400/18 bg-gradient-to-r from-orange-500/16 via-red-500/10 to-amber-300/8 px-8 py-12 text-center text-white shadow-[0_30px_80px_rgba(0,0,0,0.25)] sm:px-12">
          <p className="text-sm uppercase tracking-[0.28em] text-orange-200">Ready when you are</p>
          <h2 className="mt-4 font-serif text-4xl italic text-white sm:text-5xl">
            Make the back office feel lighter.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-300">
            Start with clean invoicing, better stock visibility, and a calmer daily workflow.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-4 font-medium text-white transition-colors hover:bg-orange-400"
          >
            Create your free account
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-stone-500 sm:px-6 lg:px-8">
          <div className="mb-3 flex justify-center">
            <Wordmark compact />
          </div>
          <div className="text-sm">
            <p>&copy; {new Date().getFullYear()} VyaparX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
