"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createBusinessSchema, type CreateBusinessFormData } from "@/validators/business.validator"
import { businessService } from "@/services/business.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { updateBusinessContext } from "@/lib/business-utils"
import { INDIAN_STATES, formatStateDisplay } from "@/constants/indian-states"
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  Sparkles,
  CreditCard,
  MapPinned,
  X
} from "lucide-react"

interface CreateBusinessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateBusinessModal({ open, onOpenChange, onSuccess }: CreateBusinessModalProps) {
  const router = useRouter()
  const { addBusiness } = useBusinessStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    control,
  } = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: "",
      gstin: "",
      pan: "",
      phone: "",
      email: "",
      address_line1: "",
      city: "",
      state_code: "",
      state: "",
      pincode: "",
    }
  })

  const stateCode = useWatch({ name: "state_code", control: control })
  const stateName = useWatch({ name: "state", control: control })

  // Auto-fill state name when state code is selected
  const handleStateCodeChange = (code: string) => {
    setValue("state_code", code)
    const state = INDIAN_STATES.find((s) => s.code === code)
    if (state) {
      setValue("state", state.name)
    }
  }

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
      
      // Update tokens and session with new business context
      updateBusinessContext(response.tokens, response.session, businessWithRole)
      
      toast.success("Business created successfully! Welcome to VyaparX!")
      
      // Close modal and trigger success callback
      onOpenChange(false)
      onSuccess?.()
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    }
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border-2 border-primary/20">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Create Your First Business</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Set up your business profile to start managing invoices, inventory, and finances
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Basic Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Business Details</CardTitle>
                      <CardDescription>Basic information about your business</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Business Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your business name"
                        {...register("name")}
                        disabled={isSubmitting}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.name.message}
                        </p>
                      )}
                      <FieldDescription>
                        This will appear on all your invoices and documents
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Tax Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Tax Information</CardTitle>
                      <CardDescription>GST and PAN details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="gstin" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        GSTIN
                      </FieldLabel>
                      <Input
                        id="gstin"
                        type="text"
                        placeholder="22AAAAA0000A1Z5"
                        {...register("gstin")}
                        disabled={isSubmitting}
                        className="uppercase"
                      />
                      {errors.gstin && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.gstin.message}
                        </p>
                      )}
                      <FieldDescription>15-digit GST number (optional)</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="pan" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PAN
                      </FieldLabel>
                      <Input
                        id="pan"
                        type="text"
                        placeholder="AAAAA0000A"
                        {...register("pan")}
                        disabled={isSubmitting}
                        className="uppercase"
                      />
                      {errors.pan && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.pan.message}
                        </p>
                      )}
                      <FieldDescription>10-character PAN (optional)</FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Contact Details</CardTitle>
                      <CardDescription>How to reach your business</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FieldLabel>
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
                      <FieldDescription>10-digit mobile number</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="business@example.com"
                        {...register("email")}
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.email.message}
                        </p>
                      )}
                      <FieldDescription>Business email address</FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPinned className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Business Address</CardTitle>
                      <CardDescription>Your business location</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="address_line1" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Street Address
                      </FieldLabel>
                      <Input
                        id="address_line1"
                        type="text"
                        placeholder="123 Business Street, Area Name"
                        {...register("address_line1")}
                        disabled={isSubmitting}
                      />
                      {errors.address_line1 && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.address_line1.message}
                        </p>
                      )}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="city">City</FieldLabel>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Mumbai"
                          {...register("city")}
                          disabled={isSubmitting}
                        />
                        {errors.city && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.city.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="state_code">State</FieldLabel>
                        <Select
                          value={stateCode}
                          onValueChange={handleStateCodeChange}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
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
                          <p className="text-sm text-destructive mt-1">
                            {errors.state_code.message}
                          </p>
                        )}
                        <input type="hidden" {...register("state")} value={stateName} />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
                        <Input
                          id="pincode"
                          type="text"
                          placeholder="400001"
                          {...register("pincode")}
                          disabled={isSubmitting}
                        />
                        {errors.pincode && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.pincode.message}
                          </p>
                        )}
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {/* Submit Section */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Ready to get started?</p>
                      <p className="text-sm text-muted-foreground">
                        Create your business and unlock all features
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none min-w-[160px]"
                    >
                      {isSubmitting ? "Creating..." : "Create Business"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}