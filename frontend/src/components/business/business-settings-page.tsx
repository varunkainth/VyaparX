"use client"

import { useRouter } from "next/navigation"
import { useForm, Watch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateBusinessSchema, type UpdateBusinessFormData, inviteMemberSchema, type InviteMemberFormData } from "@/validators/business.validator"
import { businessService } from "@/services/business.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { BusinessMember } from "@/types/business"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { INDIAN_STATES, formatStateDisplay } from "@/constants/indian-states"

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args)
  }
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Phone,
  CreditCard,
  MapPinned,
  Save,
  AlertCircle,
  Users,
  UserPlus,
  Shield,
  Calendar,
  Info,
  RefreshCw
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { NativeSelect } from "@/components/ui/native-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BusinessSettingsPage() {
  const router = useRouter()
  const { currentBusiness, updateBusiness: updateBusinessInStore, businesses, isLoading, setCurrentBusiness } = useBusinessStore()
  // Extended member type with UI-specific fields (email, name from user profile)
  type MemberWithProfile = BusinessMember & { email?: string; name?: string }
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [refreshingBusiness, setRefreshingBusiness] = useState(false)

  // Debug: Log current business to check role
  useEffect(() => {
    if (currentBusiness) {
      devLog("[BusinessSettings] Current business:", currentBusiness)
      devLog("[BusinessSettings] Role:", currentBusiness.role)
    }
  }, [currentBusiness])

  // Function to refresh business data from API
  const refreshBusinessData = async () => {
    if (!currentBusiness) return

    setRefreshingBusiness(true)
    try {
      devLog("[BusinessSettings] Refreshing business data...")
      const updatedBusiness = await businessService.getBusiness(currentBusiness.id)
      devLog("[BusinessSettings] Updated business:", updatedBusiness)
      setCurrentBusiness(updatedBusiness)
      toast.success("Business data refreshed!")
    } catch (error) {
      console.error("[BusinessSettings] Failed to refresh:", error)
      toast.error("Failed to refresh business data")
    } finally {
      setRefreshingBusiness(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<UpdateBusinessFormData>({
    resolver: zodResolver(updateBusinessSchema),
    defaultValues: {
      name: currentBusiness?.name || "",
      gstin: currentBusiness?.gstin || "",
      pan: currentBusiness?.pan || "",
      address_line1: currentBusiness?.address_line1 || "",
      city: currentBusiness?.city || "",
      state: currentBusiness?.state || "",
      pincode: currentBusiness?.pincode || "",
      phone: currentBusiness?.phone || "",
      email: currentBusiness?.email || "",
    },
  })

  const stateCode = watch("state_code")
  const stateName = watch("state")

  // Auto-fill state name when state code is selected
  const handleStateCodeChange = (code: string) => {
    setValue("state_code", code)
    const state = INDIAN_STATES.find((s) => s.code === code)
    if (state) {
      setValue("state", state.name)
    }
  }

  // Reset form when business changes when state code is selected
  useEffect(() => {
    if (currentBusiness) {
      reset({
        name: currentBusiness.name || "",
        gstin: currentBusiness.gstin || "",
        pan: currentBusiness.pan || "",
        address_line1: currentBusiness.address_line1 || "",
        city: currentBusiness.city || "",
        state: currentBusiness.state || "",
        pincode: currentBusiness.pincode || "",
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
      })
    }
  }, [currentBusiness, reset])

  // Auto-select first business if none selected but businesses exist
  useEffect(() => {
    if (!isLoading && !currentBusiness && businesses.length > 0) {
      setCurrentBusiness(businesses[0])
    }
  }, [currentBusiness, businesses, isLoading, setCurrentBusiness])

  // Redirect to create business if no businesses exist
  useEffect(() => {
    if (!isLoading && businesses.length === 0) {
      router.push("/business/create")
    }
  }, [businesses.length, isLoading, router])

  // Show loading while waiting for business to be selected
  if (isLoading || (!currentBusiness && businesses.length > 0)) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">
                {isLoading ? "Loading business settings..." : "Setting up business..."}
              </p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Don't render if no business (will redirect)
  if (!currentBusiness) {
    return null
  }

  const onSubmit = async (data: UpdateBusinessFormData) => {
    if (!currentBusiness) return

    try {
      const updatedBusiness = await businessService.updateBusiness(currentBusiness.id, data)

      // Update in store
      updateBusinessInStore(currentBusiness.id, updatedBusiness)

      toast.success("Business settings updated successfully!")
      reset(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={refreshBusinessData}>
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Business Settings</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content - Mobile Optimized */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header - Mobile Optimized */}
            <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shrink-0">
                  <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Business Settings</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    <span className="hidden sm:inline">Manage your business information, members, and settings</span>
                    <span className="sm:hidden">Manage business</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshBusinessData}
                  disabled={refreshingBusiness}
                  className="cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshingBusiness ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {currentBusiness.is_active ? (
                  <Badge variant="default" className="h-7">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="h-7">Inactive</Badge>
                )}
              </div>
            </div>

            {/* Business Information Display - Mobile Optimized */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Info className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg">Business Information</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Overview of your business details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      <Users className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">Owner</span>
                    </p>
                    <div>
                      <p className="text-xs md:text-sm font-medium truncate">{currentBusiness.owner_name || "Unknown"}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{currentBusiness.owner_email || "No email"}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      <Shield className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">Your Role</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {currentBusiness.role ? (
                        <Badge variant={currentBusiness.role === "owner" ? "default" : "outline"} className="capitalize text-xs">
                          {currentBusiness.role === "owner" && "👑 "}
                          {currentBusiness.role === "admin" && "🔧 "}
                          {currentBusiness.role === "staff" && "👤 "}
                          {currentBusiness.role === "accountant" && "💼 "}
                          {currentBusiness.role === "viewer" && "👁️ "}
                          {currentBusiness.role}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No role</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      <Info className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">Status</span>
                    </p>
                    <Badge variant={currentBusiness.is_active ? "default" : "secondary"} className="text-xs">
                      {currentBusiness.is_active ? "✓ Active" : "✗ Inactive"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">Created</span>
                    </p>
                    <p className="text-xs md:text-sm truncate">{formatDate(currentBusiness.created_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">Updated</span>
                    </p>
                    <p className="text-xs md:text-sm truncate">{formatDate(currentBusiness.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unsaved Changes Alert */}
            {isDirty && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You have unsaved changes. Don&apos;t forget to save your updates.
                </AlertDescription>
              </Alert>
            )}

            {/* Edit Business Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
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
                        <CardDescription className="text-xs md:text-sm">Edit basic information about your business</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="name" className="flex items-center gap-2 text-xs md:text-sm">
                          <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                          Business Name
                          <span className="text-destructive">*</span>
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
                        <FieldLabel htmlFor="gstin" className="text-xs md:text-sm">GSTIN</FieldLabel>
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
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="pan" className="text-xs md:text-sm">PAN</FieldLabel>
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
                        <CardDescription className="text-xs md:text-sm">Business contact information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="phone" className="text-xs md:text-sm">Phone Number</FieldLabel>
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
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="email" className="text-xs md:text-sm">Email Address</FieldLabel>
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
                        <FieldLabel htmlFor="address_line1" className="text-xs md:text-sm">Street Address</FieldLabel>
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
                          <FieldLabel htmlFor="city" className="text-xs md:text-sm">City</FieldLabel>
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
                          <FieldLabel htmlFor="state_code" className="text-xs md:text-sm">State</FieldLabel>
                          <Select
                            value={stateCode}
                            onValueChange={handleStateCodeChange}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDIAN_STATES.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {formatStateDisplay(state)}
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
                          <FieldLabel htmlFor="pincode" className="text-xs md:text-sm">Pincode</FieldLabel>
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
                      <Save className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm md:text-base">Save Changes</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          <span className="hidden sm:inline">Update your business information</span>
                          <span className="sm:hidden">Update business</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => reset()}
                        disabled={isSubmitting || !isDirty}
                        className="flex-1 sm:flex-none cursor-pointer"
                      >
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isDirty}
                        className="flex-1 sm:flex-none min-w-30 sm:min-w-40 cursor-pointer"
                      >
                        {isSubmitting ? "Saving..." : "Save"}
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
