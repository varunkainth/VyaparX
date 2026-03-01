"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { invoiceSettingsService } from "@/services/invoice-settings.service"
import { useBusinessStore } from "@/store/useBusinessStore"
import type { InvoiceSettings, UpdateInvoiceSettingsInput } from "@/types/invoice-settings"
import { INVOICE_TEMPLATES, NUMBER_FORMATS } from "@/types/invoice-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
 
  FileText,
  Hash,
  DollarSign,
  Mail,
  Eye,
  RotateCcw,
  Save,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { PageLayout } from "@/components/layout/page-layout"

export function InvoiceSettingsPage() {
  const { currentBusiness } = useBusinessStore()
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<UpdateInvoiceSettingsInput>()

  const watchEnableTax = watch("enable_tax")
  const watchShowTerms = watch("show_terms")
  const watchShowNotes = watch("show_notes")

  useEffect(() => {
    if (currentBusiness) {
      fetchSettings()
    }
  }, [currentBusiness])

  const fetchSettings = async () => {
    if (!currentBusiness) return

    setIsLoading(true)
    try {
      const data = await invoiceSettingsService.getSettings(currentBusiness.id)
      setSettings(data)
      reset(data as UpdateInvoiceSettingsInput)
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UpdateInvoiceSettingsInput) => {
    if (!currentBusiness) return

    setIsSaving(true)
    try {
      const updated = await invoiceSettingsService.updateSettings(currentBusiness.id, data)
      setSettings(updated)
      reset(updated as UpdateInvoiceSettingsInput)
      toast.success("Invoice settings updated successfully!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!currentBusiness) return
    if (!confirm("Are you sure you want to reset all settings to defaults?")) return

    setIsResetting(true)
    try {
      const defaults = await invoiceSettingsService.resetToDefaults(currentBusiness.id)
      setSettings(defaults)
      reset(defaults as UpdateInvoiceSettingsInput)
      toast.success("Settings reset to defaults!")
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsResetting(false)
    }
  }

  if (!currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a business first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
          <div>
            <Skeleton className="h-8 md:h-9 w-48 md:w-64" />
            <Skeleton className="h-4 md:h-5 w-64 md:w-96 mt-2" />
          </div>
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 md:h-6 w-32 md:w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 md:h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!settings) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Failed to load settings</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout onRefresh={fetchSettings}>
      <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Invoice Settings</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Configure invoice preferences for {currentBusiness.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={isResetting}
          size="sm"
          className="w-full md:w-auto cursor-pointer active:scale-95"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{isResetting ? "Resetting..." : "Reset to Defaults"}</span>
          <span className="sm:hidden">Reset</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        {/* Invoice Numbering - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Hash className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Invoice Numbering</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure how invoices are numbered</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs md:text-sm">Sales Invoice Prefix</FieldLabel>
                  <Input
                    {...register("invoice_prefix")}
                    placeholder="INV"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Prefix for sales invoices (e.g., INV, SI)
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Next Invoice Number</FieldLabel>
                  <Input
                    type="number"
                    {...register("next_invoice_number", { valueAsNumber: true })}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Next number to be used
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Purchase Invoice Prefix</FieldLabel>
                  <Input
                    {...register("purchase_prefix")}
                    placeholder="PUR"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Prefix for purchase invoices
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Next Purchase Number</FieldLabel>
                  <Input
                    type="number"
                    {...register("next_purchase_number", { valueAsNumber: true })}
                    placeholder="1"
                  />
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel className="text-xs md:text-sm">Number Format</FieldLabel>
                  <Select
                    value={watch("invoice_number_format") || ""}
                    onValueChange={(value) => setValue("invoice_number_format", value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {NUMBER_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: {"{YYYY}"} = Year, {"{MM}"} = Month, {"{####}"} = Number
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Reset Numbering</FieldLabel>
                  <Select
                    value={watch("reset_numbering") || "never"}
                    onValueChange={(value: "never" | "yearly" | "monthly") => setValue("reset_numbering", value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="yearly">Every Year</SelectItem>
                      <SelectItem value="monthly">Every Month</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Default Settings - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Default Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Default values for new invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs md:text-sm">Default Due Days</FieldLabel>
                  <Input
                    type="number"
                    {...register("default_due_days", { valueAsNumber: true })}
                    placeholder="30"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Days until payment is due
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Default Template</FieldLabel>
                  <Select
                    value={watch("default_template") || "default"}
                    onValueChange={(value) => setValue("default_template", value, { shouldDirty: true })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_TEMPLATES.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Currency</FieldLabel>
                  <Input
                    {...register("default_currency")}
                    placeholder="INR"
                    disabled
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently only INR is supported
                  </p>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Tax Settings - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Tax Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure tax display and labels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Enable Tax</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Show tax calculations on invoices
                    </p>
                  </div>
                  <Switch
                    checked={watchEnableTax}
                    onCheckedChange={(checked: boolean) => setValue("enable_tax", checked, { shouldDirty: true })}
                  />
                </div>

                {watchEnableTax && (
                  <>
                    <Separator />
                    <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel className="text-xs md:text-sm">Tax Label</FieldLabel>
                        <Input
                          {...register("tax_label")}
                          placeholder="GST"
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Label to display (GST, VAT, Tax, etc.)
                        </p>
                      </Field>

                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5 flex-1">
                          <FieldLabel className="text-xs md:text-sm">Show Tax Number</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            Display GSTIN on invoice
                          </p>
                        </div>
                        <Switch
                          checked={watch("show_tax_number")}
                          onCheckedChange={(checked: boolean) => setValue("show_tax_number", checked, { shouldDirty: true })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Display Settings - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Display Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">What to show on invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Show Logo</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Display business logo on invoice
                    </p>
                  </div>
                  <Switch
                    checked={watch("show_logo")}
                    onCheckedChange={(checked: boolean) => setValue("show_logo", checked, { shouldDirty: true })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Show Signature</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Display authorized signature
                    </p>
                  </div>
                  <Switch
                    checked={watch("show_signature")}
                    onCheckedChange={(checked: boolean) => setValue("show_signature", checked, { shouldDirty: true })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Show Terms & Conditions</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Display default terms on invoice
                    </p>
                  </div>
                  <Switch
                    checked={watchShowTerms}
                    onCheckedChange={(checked: boolean) => setValue("show_terms", checked, { shouldDirty: true })}
                  />
                </div>

                {watchShowTerms && (
                  <Field>
                    <FieldLabel className="text-xs md:text-sm">Default Terms & Conditions</FieldLabel>
                    <Textarea
                      {...register("default_terms")}
                      rows={4}
                      placeholder="Enter default terms and conditions..."
                      className="text-sm"
                    />
                  </Field>
                )}

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Show Notes</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Display default notes on invoice
                    </p>
                  </div>
                  <Switch
                    checked={watchShowNotes}
                    onCheckedChange={(checked: boolean) => setValue("show_notes", checked, { shouldDirty: true })}
                  />
                </div>

                {watchShowNotes && (
                  <Field>
                    <FieldLabel className="text-xs md:text-sm">Default Notes</FieldLabel>
                    <Textarea
                      {...register("default_notes")}
                      rows={3}
                      placeholder="Enter default notes..."
                      className="text-sm"
                    />
                  </Field>
                )}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Email Settings - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Email Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure email templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="space-y-3 md:space-y-4">
                <Field>
                  <FieldLabel className="text-xs md:text-sm">Email Subject Template</FieldLabel>
                  <Input
                    {...register("email_subject_template")}
                    placeholder="Invoice {invoice_number} from {business_name}"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variables: {"{invoice_number}"}, {"{business_name}"}, {"{amount}"}
                  </p>
                </Field>

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Email Body Template</FieldLabel>
                  <Textarea
                    {...register("email_body_template")}
                    rows={5}
                    placeholder="Dear Customer,&#10;&#10;Please find attached invoice {invoice_number} for {amount}.&#10;&#10;Thank you for your business!"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the same variables as subject
                  </p>
                </Field>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Auto-send Email</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Automatically email invoice after creation
                    </p>
                  </div>
                  <Switch
                    checked={watch("auto_send_email")}
                    onCheckedChange={(checked: boolean) => setValue("auto_send_email", checked, { shouldDirty: true })}
                  />
                </div>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Payment Settings - Mobile Optimized */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Payment Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure payment options</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <FieldLabel className="text-xs md:text-sm">Enable Online Payment</FieldLabel>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Show online payment options
                    </p>
                  </div>
                  <Switch
                    checked={watch("enable_online_payment")}
                    onCheckedChange={(checked: boolean) => setValue("enable_online_payment", checked, { shouldDirty: true })}
                  />
                </div>

                <Separator />

                <Field>
                  <FieldLabel className="text-xs md:text-sm">Payment Instructions</FieldLabel>
                  <Textarea
                    {...register("payment_instructions")}
                    rows={4}
                    placeholder="Bank details, UPI ID, or other payment instructions..."
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Instructions shown on invoice for payment
                  </p>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Save Button - Mobile Optimized */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Save className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm md:text-base font-semibold">Save Settings</p>
                  {isDirty && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      You have unsaved changes
                    </p>
                  )}
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSaving || !isDirty}
                className="w-full sm:w-auto cursor-pointer active:scale-95"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      </div>
    </PageLayout>
  )
}
