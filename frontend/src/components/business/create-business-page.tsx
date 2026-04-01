"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createBusinessSchema, type CreateBusinessFormData } from "@/validators/business.validator"
import { businessService } from "@/services/business.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { updateBusinessContext } from "@/lib/business-utils"
import {
  PIN_MAPPED_STATES,
  formatPinMappedStateDisplay,
  getPreferredStateCodeForPincode,
  getStateCodesForPincode,
  getStateNameForCode,
} from "@/constants/pin-state-mapping"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  Sparkles,
  CreditCard,
  MapPinned
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

export function CreateBusinessPage() {
  const router = useRouter()
  const { addBusiness } = useBusinessStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    setError,
    clearErrors,
    control,
  } = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessSchema),
  })

  const stateCode = useWatch({ name: "state_code", control: control })
  const stateName = useWatch({ name: "state", control: control })
  const pincode = useWatch({ name: "pincode", control: control })

  // Auto-fill state name when state code is selected
  const handleStateCodeChange = (code: string) => {
    setValue("state_code", code, { shouldDirty: true, shouldValidate: true })
    const mappedStateName = getStateNameForCode(code)
    if (mappedStateName) {
      setValue("state", mappedStateName, { shouldDirty: true, shouldValidate: true })
    }
  }

  useEffect(() => {
    const numericPincode = (pincode ?? "").replace(/\D/g, "")

    if (numericPincode !== (pincode ?? "")) {
      setValue("pincode", numericPincode, { shouldDirty: true, shouldValidate: true })
      return
    }

    if (numericPincode.length < 2) {
      clearErrors(["pincode", "state_code"])
      return
    }

    const matchingStateCodes = getStateCodesForPincode(numericPincode)

    if (matchingStateCodes.length === 0) {
      if (numericPincode.length === 6) {
        setError("pincode", {
          type: "manual",
          message: "Pincode prefix does not match any mapped state",
        })
      }
      return
    }

    clearErrors("pincode")

    const preferredStateCode = getPreferredStateCodeForPincode(numericPincode, stateCode || undefined)
    if (preferredStateCode && preferredStateCode !== stateCode) {
      setValue("state_code", preferredStateCode, { shouldDirty: true, shouldValidate: true })
      const preferredStateName = getStateNameForCode(preferredStateCode)
      if (preferredStateName) {
        setValue("state", preferredStateName, { shouldDirty: true, shouldValidate: true })
      }
      return
    }

    if (stateCode && !matchingStateCodes.includes(stateCode)) {
      setError("state_code", {
        type: "manual",
        message: "Selected state does not match pincode",
      })
      return
    }

    clearErrors("state_code")
  }, [pincode, stateCode, setValue, setError, clearErrors])

  const onSubmit = async (data: CreateBusinessFormData) => {
    try {
      const response = await businessService.createBusiness(data)
      
      // Add business to store
      const businessWithRole = {
        ...response.business,
        role: "owner" as const,
        membership_status: "active" as const,
      }
      addBusiness(businessWithRole)
      
      // Update session with new business context
      updateBusinessContext(response.tokens, response.session, businessWithRole)
      
      toast.success("Business created successfully!")
      router.push("/dashboard")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const extractFirstErrorMessage = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined
    const maybeError = value as { message?: unknown }
    if (typeof maybeError.message === "string" && maybeError.message.trim().length > 0) {
      return maybeError.message
    }

    for (const nested of Object.values(value as Record<string, unknown>)) {
      const message = extractFirstErrorMessage(nested)
      if (message) return message
    }

    return undefined
  }

  const onInvalid = (formErrors: FieldErrors<CreateBusinessFormData>) => {
    const firstError = extractFirstErrorMessage(formErrors)
    toast.error(firstError ?? "Please fill all mandatory fields correctly")
  }

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
                  <BreadcrumbPage>Create Business</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header - Mobile Optimized */}
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
              <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Create Business</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                <span className="hidden sm:inline">Set up your business profile to start managing invoices and inventory</span>
                <span className="sm:hidden">Set up your business</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {/* Basic Information - Mobile Optimized */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">Business Details</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Basic information about your business</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name" required className="flex items-center gap-2 text-xs md:text-sm">
                        <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                        Business Name
                      </FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your business name"
                        {...register("name")}
                        disabled={isSubmitting}
                        className="text-sm"
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.name.message}
                        </p>
                      )}
                      <FieldDescription className="text-xs">
                        This will appear on all your invoices and documents
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Tax Information - Mobile Optimized */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">Tax Information</CardTitle>
                      <CardDescription className="text-xs md:text-sm">GST and PAN details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="gstin" className="flex items-center gap-2 text-xs md:text-sm">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        GSTIN
                      </FieldLabel>
                      <Input
                        id="gstin"
                        type="text"
                        placeholder="22AAAAA0000A1Z5"
                        {...register("gstin")}
                        disabled={isSubmitting}
                        className="uppercase text-sm"
                      />
                      {errors.gstin && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.gstin.message}
                        </p>
                      )}
                      <FieldDescription className="text-xs">15-digit GST number (optional)</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="pan" className="flex items-center gap-2 text-xs md:text-sm">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        PAN
                      </FieldLabel>
                      <Input
                        id="pan"
                        type="text"
                        placeholder="AAAAA0000A"
                        {...register("pan")}
                        disabled={isSubmitting}
                        className="uppercase text-sm"
                      />
                      {errors.pan && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.pan.message}
                        </p>
                      )}
                      <FieldDescription className="text-xs">10-character PAN (optional)</FieldDescription>
                    </Field>
                  </FieldGroup>
                  </CardContent>
                </Card>

              {/* Contact Information - Mobile Optimized */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">Contact Details</CardTitle>
                      <CardDescription className="text-xs md:text-sm">How to reach your business</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="phone" required className="flex items-center gap-2 text-xs md:text-sm">
                        <Phone className="h-3 w-3 md:h-4 md:w-4" />
                        Phone Number
                      </FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        {...register("phone")}
                        disabled={isSubmitting}
                        className="text-sm"
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.phone.message}
                        </p>
                      )}
                      <FieldDescription className="text-xs">10-digit mobile number</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email" required className="flex items-center gap-2 text-xs md:text-sm">
                        <Mail className="h-3 w-3 md:h-4 md:w-4" />
                        Email Address
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="business@example.com"
                        {...register("email")}
                        disabled={isSubmitting}
                        className="text-sm"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.email.message}
                        </p>
                      )}
                      <FieldDescription className="text-xs">Business email address</FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Address Information - Mobile Optimized */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <MapPinned className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">Business Address</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Your business location</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="address_line1" required className="flex items-center gap-2 text-xs md:text-sm">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                        Street Address
                      </FieldLabel>
                      <Input
                        id="address_line1"
                        type="text"
                        placeholder="123 Business Street, Area Name"
                        {...register("address_line1")}
                        disabled={isSubmitting}
                        className="text-sm"
                      />
                      {errors.address_line1 && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.address_line1.message}
                        </p>
                      )}
                    </Field>

                    <div className="grid gap-3 md:gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="city" required className="text-xs md:text-sm">City</FieldLabel>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Mumbai"
                          {...register("city")}
                          disabled={isSubmitting}
                          className="text-sm"
                        />
                        {errors.city && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.city.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="state_code" required className="text-xs md:text-sm">State</FieldLabel>
                        <Select
                          value={stateCode}
                          onValueChange={handleStateCodeChange}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {PIN_MAPPED_STATES.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {formatPinMappedStateDisplay(state)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.state_code && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.state_code.message}
                          </p>
                        )}
                        <input type="hidden" {...register("state")} value={stateName} />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="pincode" required className="text-xs md:text-sm">Pincode</FieldLabel>
                        <Input
                          id="pincode"
                          type="text"
                          placeholder="400001"
                          {...register("pincode")}
                          disabled={isSubmitting}
                          className="text-sm"
                        />
                        {errors.pincode && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.pincode.message}
                          </p>
                        )}
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {/* Submit Section - Mobile Optimized */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-sm md:text-base">Ready to get started?</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        <span className="hidden sm:inline">Create your business and unlock all features</span>
                        <span className="sm:hidden">Create and unlock features</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none min-w-[120px] sm:min-w-[160px] cursor-pointer"
                    >
                      {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
