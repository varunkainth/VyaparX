"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPartySchema,
  type CreatePartyFormData,
} from "@/validators/party.validator";
import { partyService } from "@/services/party.service";
import { useBusinessStore } from "@/store/useBusinessStore";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";
import { hasPermission } from "@/lib/permissions";
import {
  PIN_MAPPED_STATES,
  formatPinMappedStateDisplay,
  getPreferredStateCodeForPincode,
  getStateCodesForPincode,
  getStateNameForCode,
} from "@/constants/pin-state-mapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Save,
  ArrowLeft,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

type CreatePartyPageProps = {
  initialPartyType?: "customer" | "supplier" | "both";
};

export function CreatePartyPage({ initialPartyType }: CreatePartyPageProps) {
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<CreatePartyFormData>({
    resolver: zodResolver(createPartySchema),
    defaultValues: {
      party_type: "customer",
      opening_balance_type: "none",
      opening_balance: 0,
      state_code: "",
      state: "",
      name: "",
      gstin: "",
      pan: "",
      address: undefined,
      city: "",
      pincode: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const openingBalanceType = watch("opening_balance_type");
  const partyType = watch("party_type");
  const stateCode = watch("state_code");
  const stateName = watch("state");
  const pincode = watch("pincode");

  useEffect(() => {
    if (initialPartyType) {
      setValue("party_type", initialPartyType, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [initialPartyType, setValue]);

  // Auto-fill state name when state code is selected
  const handleStateCodeChange = (code: string) => {
    setValue("state_code", code, { shouldDirty: true, shouldValidate: true });
    const mappedStateName = getStateNameForCode(code);
    if (mappedStateName) {
      setValue("state", mappedStateName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  useEffect(() => {
    const numericPincode = (pincode ?? "").replace(/\D/g, "");

    if (numericPincode !== (pincode ?? "")) {
      setValue("pincode", numericPincode, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (numericPincode.length < 2) {
      clearErrors(["pincode", "state_code"]);
      return;
    }

    const matchingStateCodes = getStateCodesForPincode(numericPincode);

    if (matchingStateCodes.length === 0) {
      if (numericPincode.length === 6) {
        setError("pincode", {
          type: "manual",
          message: "Pincode prefix does not match any mapped state",
        });
      }
      return;
    }

    clearErrors("pincode");

    const preferredStateCode = getPreferredStateCodeForPincode(
      numericPincode,
      stateCode || undefined,
    );
    if (preferredStateCode && preferredStateCode !== stateCode) {
      setValue("state_code", preferredStateCode, {
        shouldDirty: true,
        shouldValidate: true,
      });
      const preferredStateName = getStateNameForCode(preferredStateCode);
      if (preferredStateName) {
        setValue("state", preferredStateName, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      return;
    }

    if (stateCode && !matchingStateCodes.includes(stateCode)) {
      setError("state_code", {
        type: "manual",
        message: "Selected state does not match pincode",
      });
      return;
    }

    clearErrors("state_code");
  }, [pincode, stateCode, setValue, setError, clearErrors]);

  const onSubmit = async (data: CreatePartyFormData) => {
    if (!currentBusiness) {
      toast.error("Please select a business first");
      return;
    }

    try {
      // Clean up empty strings
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== ""),
      ) as CreatePartyFormData;

      await partyService.createParty(currentBusiness.id, cleanData);
      toast.success("Party created successfully!");
      router.push("/parties");
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const extractFirstErrorMessage = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const maybeError = value as { message?: unknown };
    if (
      typeof maybeError.message === "string" &&
      maybeError.message.trim().length > 0
    ) {
      return maybeError.message;
    }

    for (const nested of Object.values(value as Record<string, unknown>)) {
      const message = extractFirstErrorMessage(nested);
      if (message) return message;
    }

    return undefined;
  };

  const onInvalid = (formErrors: FieldErrors<CreatePartyFormData>) => {
    const firstError = extractFirstErrorMessage(formErrors);
    toast.error(firstError ?? "Please fill all mandatory fields correctly");
  };

  if (!currentBusiness) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">
              Please select a business first
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const canCreateEdit = hasPermission(currentBusiness.role, "createEdit");

  if (!canCreateEdit) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Read-only access</CardTitle>
                <CardDescription>
                  Your role can view parties but cannot create new ones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push("/parties")}>
                  Go to Parties
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/parties">Parties</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Create Party</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Content - Mobile Optimized */}
          <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 pb-20 md:pb-6">
            {/* Page Header - Mobile Optimized */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                  <UserPlus className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    Create Party
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    <span className="hidden sm:inline">
                      Add a new customer or supplier
                    </span>
                    <span className="sm:hidden">Add customer/supplier</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/parties")}
                className="cursor-pointer hidden sm:flex"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit, onInvalid)}
              className="space-y-4 md:space-y-6"
            >
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Basic Information - Mobile Optimized */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">
                          Basic Information
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Party details and type
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel
                            htmlFor="name"
                            required
                            className="text-xs md:text-sm"
                          >
                            Party Name
                          </FieldLabel>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Enter party name"
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
                          <FieldLabel
                            htmlFor="party_type"
                            required
                            className="text-xs md:text-sm"
                          >
                            Party Type
                          </FieldLabel>
                          <Select
                            value={partyType}
                            onValueChange={(value) =>
                              setValue(
                                "party_type",
                                value as "customer" | "supplier" | "both",
                              )
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select party type" />
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
                        <CardTitle className="text-base md:text-lg">
                          Tax Information
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          GST and PAN details
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel
                          htmlFor="gstin"
                          className="text-xs md:text-sm"
                        >
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
                      </Field>

                      <Field>
                        <FieldLabel
                          htmlFor="pan"
                          className="text-xs md:text-sm"
                        >
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
                        <CardTitle className="text-base md:text-lg">
                          Contact Details
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Phone and email
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel
                          htmlFor="phone"
                          className="text-xs md:text-sm"
                        >
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
                      </Field>

                      <Field>
                        <FieldLabel
                          htmlFor="email"
                          className="text-xs md:text-sm"
                        >
                          Email Address
                        </FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          placeholder="party@example.com"
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
                        <CardTitle className="text-base md:text-lg">
                          Address
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Party location details
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel
                          htmlFor="address"
                          required
                          className="text-xs md:text-sm"
                        >
                          Street Address
                        </FieldLabel>
                        <Input
                          id="address"
                          type="text"
                          placeholder="123 Business Street, Area Name"
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
                          <FieldLabel
                            htmlFor="city"
                            className="text-xs md:text-sm"
                          >
                            City
                          </FieldLabel>
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

                        <Field className="col-span-2">
                          <FieldLabel
                            htmlFor="state_code"
                            className="text-xs md:text-sm"
                          >
                            State
                          </FieldLabel>
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
                          <input
                            type="hidden"
                            {...register("state")}
                            value={stateName}
                          />
                        </Field>

                        <Field>
                          <FieldLabel
                            htmlFor="pincode"
                            className="text-xs md:text-sm"
                          >
                            Pincode
                          </FieldLabel>
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

                {/* Opening Balance - Mobile Optimized */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg">
                          Opening Balance
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          Initial balance for this party
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel
                            htmlFor="opening_balance_type"
                            className="text-xs md:text-sm"
                          >
                            Balance Type
                          </FieldLabel>
                          <Select
                            value={openingBalanceType}
                            onValueChange={(value) =>
                              setValue(
                                "opening_balance_type",
                                value as "receivable" | "payable" | "none",
                              )
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select balance type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="receivable">
                                Receivable (You&apos;ll receive)
                              </SelectItem>
                              <SelectItem value="payable">
                                Payable (You&apos;ll pay)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.opening_balance_type && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.opening_balance_type.message}
                            </p>
                          )}
                        </Field>

                        {openingBalanceType !== "none" && (
                          <Field>
                            <FieldLabel
                              htmlFor="opening_balance"
                              className="text-xs md:text-sm"
                            >
                              Amount
                            </FieldLabel>
                            <Input
                              id="opening_balance"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...register("opening_balance", {
                                valueAsNumber: true,
                              })}
                              disabled={isSubmitting}
                              className="text-sm"
                            />
                            {errors.opening_balance && (
                              <p className="text-xs text-destructive mt-1">
                                {errors.opening_balance.message}
                              </p>
                            )}
                          </Field>
                        )}
                      </div>

                      <Field>
                        <FieldLabel
                          htmlFor="notes"
                          className="text-xs md:text-sm"
                        >
                          Notes
                        </FieldLabel>
                        <Textarea
                          id="notes"
                          placeholder="Additional notes about this party..."
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
                        <p className="font-semibold text-sm md:text-base">
                          Create Party
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          <span className="hidden sm:inline">
                            Add this party to your business
                          </span>
                          <span className="sm:hidden">Add to business</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/parties")}
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
  );
}
