"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updatePartySchema, type UpdatePartyFormData } from "@/validators/party.validator"
import { partyService } from "@/services/party.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { Party } from "@/types/party"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { INDIAN_STATES, formatStateDisplay } from "@/constants/indian-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Users, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  CreditCard,
  Save,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle
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
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PartyDetailsPageProps {
  partyId: string
}

export function PartyDetailsPage({ partyId }: PartyDetailsPageProps) {
  const router = useRouter()
  const { currentBusiness } = useBusinessStore()
  const [party, setParty] = useState<Party | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<UpdatePartyFormData>({
    resolver: zodResolver(updatePartySchema),
  })

  const openingBalanceType = watch("opening_balance_type")
  const partyType = watch("party_type")
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

  useEffect(() => {
    if (currentBusiness && partyId) {
      fetchParty()
    }
  }, [currentBusiness, partyId])

  const fetchParty = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await partyService.getParty(currentBusiness.id, partyId)
      setParty(data)
      
      // Set form values
      reset({
        name: data.name,
        party_type: data.party_type,
        gstin: data.gstin || "",
        pan: data.pan || "",
        state_code: data.state_code || "",
        state: data.state || "",
        address: data.address || "",
        city: data.city || "",
        pincode: data.pincode || "",
        phone: data.phone || "",
        email: data.email || "",
        opening_balance: data.opening_balance,
        opening_balance_type: data.opening_balance_type,
        notes: data.notes || "",
      })
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
      router.push("/parties")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UpdatePartyFormData) => {
    if (!currentBusiness || !party) return

    try {
      // Clean up empty strings
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "")
      ) as UpdatePartyFormData

      const updatedParty = await partyService.updateParty(
        currentBusiness.id,
        party.id,
        cleanData
      )
      
      setParty(updatedParty)
      setIsEditing(false)
      toast.success("Party updated successfully!")
      reset(data)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  const handleDelete = async () => {
    if (!currentBusiness || !party) return

    setIsDeleting(true)
    try {
      await partyService.deleteParty(currentBusiness.id, party.id)
      toast.success("Party deleted successfully!")
      router.push("/parties")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(balance)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getPartyTypeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "default"
      case "supplier":
        return "secondary"
      case "both":
        return "outline"
      default:
        return "outline"
    }
  }

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Please select a business first</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Loading party details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!party) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLayout onRefresh={fetchParty}>
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
                  <BreadcrumbLink href="/parties">Parties</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{party.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          {/* Page Header - Mobile Optimized */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{party.name}</h1>
                  <Badge variant={getPartyTypeColor(party.party_type)} className="capitalize text-xs flex-shrink-0">
                    {party.party_type}
                  </Badge>
                  {!party.is_active && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">Inactive</Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  <span className="hidden sm:inline">Party details and transaction history</span>
                  <span className="sm:hidden">Party details</span>
                </p>
              </div>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex gap-2 md:hidden">
              <Button variant="outline" onClick={() => router.push("/parties")} className="flex-1 cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="flex-1 cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex gap-2 -mt-3">
            <Button variant="outline" onClick={() => router.push("/parties")} className="cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {/* Balance Cards - Mobile Optimized */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">
                  <span className="hidden sm:inline">Current Balance</span>
                  <span className="sm:hidden">Balance</span>
                </CardTitle>
                {party.current_balance > 0 ? (
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                ) : party.current_balance < 0 ? (
                  <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600 flex-shrink-0" />
                ) : (
                  <FileText className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className={`text-lg sm:text-xl md:text-2xl font-bold truncate ${party.current_balance > 0 ? "text-green-600" : party.current_balance < 0 ? "text-red-600" : ""}`}>
                  {formatBalance(party.current_balance)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  {party.current_balance > 0 ? "You'll receive" : party.current_balance < 0 ? "You'll pay" : "Settled"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">
                  <span className="hidden sm:inline">Opening Balance</span>
                  <span className="sm:hidden">Opening</span>
                </CardTitle>
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  {formatBalance(party.opening_balance)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1 capitalize">
                  {party.opening_balance_type}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Created On</CardTitle>
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-sm sm:text-base md:text-lg font-semibold truncate">
                  {formatDate(party.created_at)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                  Updated: {formatDate(party.updated_at)}
                </p>
              </CardContent>
            </Card>
          </div>

          {isEditing ? (
            /* Edit Form - Mobile Optimized */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              {isDirty && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs md:text-sm">
                    You have unsaved changes. Don't forget to save your updates.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Basic Information - Mobile Optimized */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">Basic Information</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Party details and type</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="name" className="text-xs md:text-sm">
                            Party Name <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="name"
                            type="text"
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

                        <Field>
                          <FieldLabel htmlFor="party_type" className="text-xs md:text-sm">Party Type</FieldLabel>
                          <Select
                            value={partyType}
                            onValueChange={(value) => setValue("party_type", value as "customer" | "supplier" | "both")}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="supplier">Supplier</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.party_type && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.party_type.message}
                            </p>
                          )}
                        </Field>
                      </div>
                    </FieldGroup>
                  </CardContent>
                </Card>

                {/* Tax Information - Mobile Optimized */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
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
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">Contact Details</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Phone and email</CardDescription>
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
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">Address</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Party location details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="address" className="text-xs md:text-sm">Street Address</FieldLabel>
                        <Input
                          id="address"
                          type="text"
                          {...register("address")}
                          disabled={isSubmitting}
                          className="text-sm"
                        />
                        {errors.address && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.address.message}
                          </p>
                        )}
                      </Field>

                      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-4">
                        <Field>
                          <FieldLabel htmlFor="city" className="text-xs md:text-sm">City</FieldLabel>
                          <Input
                            id="city"
                            type="text"
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

                        <Field className="col-span-2">
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

                {/* Notes - Mobile Optimized */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">Notes</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Additional information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Field>
                      <Textarea
                        id="notes"
                        {...register("notes")}
                        disabled={isSubmitting}
                        rows={3}
                        className="text-sm"
                      />
                      {errors.notes && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.notes.message}
                        </p>
                      )}
                    </Field>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons - Mobile Optimized */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-3">
                      <Save className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm md:text-base">Save Changes</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          <span className="hidden sm:inline">Update party information</span>
                          <span className="sm:hidden">Update party</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false)
                          reset()
                        }}
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isDirty}
                        className="flex-1 sm:flex-none min-w-[120px] sm:min-w-[160px] cursor-pointer"
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          ) : (
            /* View Mode */
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {party.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{party.phone}</span>
                    </div>
                  )}
                  {party.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{party.email}</span>
                    </div>
                  )}
                  {!party.phone && !party.email && (
                    <p className="text-sm text-muted-foreground">No contact information</p>
                  )}
                </CardContent>
              </Card>

              {/* Tax Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {party.gstin && (
                    <div>
                      <p className="text-sm text-muted-foreground">GSTIN</p>
                      <p className="font-medium">{party.gstin}</p>
                    </div>
                  )}
                  {party.pan && (
                    <div>
                      <p className="text-sm text-muted-foreground">PAN</p>
                      <p className="font-medium">{party.pan}</p>
                    </div>
                  )}
                  {!party.gstin && !party.pan && (
                    <p className="text-sm text-muted-foreground">No tax information</p>
                  )}
                </CardContent>
              </Card>

              {/* Address */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {party.address || party.city || party.state ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        {party.address && <p>{party.address}</p>}
                        <p>
                          {[party.city, party.state, party.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No address information</p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {party.notes && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{party.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Delete Party - Mobile Optimized */}
              <Card className="lg:col-span-2 border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive text-base md:text-lg">Danger Zone</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Permanently delete this party and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting} className="cursor-pointer w-full sm:w-auto">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Party
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs md:text-sm">
                          This action cannot be undone. This will permanently delete the
                          party "{party.name}" and remove all associated data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
