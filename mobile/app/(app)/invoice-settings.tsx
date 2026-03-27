import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RotateCcw } from "lucide-react-native";

import { SubpageHeader } from "@/components/subpage-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { invoiceSettingsService } from "@/services/invoice-settings.service";
import { useAuthStore } from "@/store/auth-store";
import {
  INVOICE_TEMPLATES,
  NUMBER_FORMATS,
  type InvoiceSettings,
  type UpdateInvoiceSettingsInput,
} from "@/types/invoice-settings";

const INITIAL_FORM: UpdateInvoiceSettingsInput = {
  auto_send_email: false,
  default_currency: "INR",
  default_due_days: 30,
  default_notes: "",
  default_template: "default",
  default_terms: "",
  email_body_template: "",
  email_subject_template: "",
  enable_online_payment: false,
  enable_tax: true,
  invoice_number_format: "INV-{YYYY}-{####}",
  invoice_prefix: "INV",
  next_invoice_number: 1,
  next_purchase_number: 1,
  payment_instructions: "",
  purchase_number_format: "PINV-{YYYY}-{####}",
  purchase_prefix: "PINV",
  reset_numbering: "never",
  show_logo: true,
  show_notes: false,
  show_signature: false,
  show_tax_number: true,
  show_terms: false,
  tax_label: "GST",
};

export default function InvoiceSettingsScreen() {
  const { session } = useAuthStore();
  const [form, setForm] = React.useState<UpdateInvoiceSettingsInput>(INITIAL_FORM);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const applySettings = React.useCallback((settings: InvoiceSettings) => {
    setForm({
      auto_send_email: settings.auto_send_email,
      default_currency: settings.default_currency,
      default_due_days: settings.default_due_days,
      default_notes: settings.default_notes ?? "",
      default_template: settings.default_template,
      default_terms: settings.default_terms ?? "",
      email_body_template: settings.email_body_template,
      email_subject_template: settings.email_subject_template,
      enable_online_payment: settings.enable_online_payment,
      enable_tax: settings.enable_tax,
      invoice_number_format: settings.invoice_number_format,
      invoice_prefix: settings.invoice_prefix,
      next_invoice_number: settings.next_invoice_number,
      next_purchase_number: settings.next_purchase_number,
      payment_instructions: settings.payment_instructions ?? "",
      purchase_number_format: settings.purchase_number_format,
      purchase_prefix: settings.purchase_prefix,
      reset_numbering: settings.reset_numbering,
      show_logo: settings.show_logo,
      show_notes: settings.show_notes,
      show_signature: settings.show_signature,
      show_tax_number: settings.show_tax_number,
      show_terms: settings.show_terms,
      tax_label: settings.tax_label,
    });
  }, []);

  const loadSettings = React.useCallback(async () => {
    if (!session?.business_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const settings = await invoiceSettingsService.getSettings(session.business_id);
      applySettings(settings);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          "Unable to load invoice settings right now."
      );
    } finally {
      setIsLoading(false);
    }
  }, [applySettings, session?.business_id]);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function onSave() {
    if (!session?.business_id) {
      setError("No active business selected.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await invoiceSettingsService.updateSettings(session.business_id, {
        ...form,
        default_notes: normalizeOptional(form.default_notes),
        default_terms: normalizeOptional(form.default_terms),
        email_body_template: form.email_body_template?.trim() ?? "",
        email_subject_template: form.email_subject_template?.trim() ?? "",
        invoice_prefix: form.invoice_prefix?.trim() ?? "",
        payment_instructions: normalizeOptional(form.payment_instructions),
        purchase_prefix: form.purchase_prefix?.trim() ?? "",
        tax_label: form.tax_label?.trim() ?? "GST",
      });

      setSuccessMessage("Invoice settings saved successfully.");
    } catch (saveError: any) {
      setError(
        saveError?.response?.data?.error?.message ??
          saveError?.response?.data?.message ??
          "Unable to save invoice settings right now."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function onReset() {
    if (!session?.business_id) {
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const settings = await invoiceSettingsService.resetToDefaults(session.business_id);
      applySettings(settings);
      setSuccessMessage("Invoice settings reset to defaults.");
    } catch (resetError: any) {
      setError(
        resetError?.response?.data?.error?.message ??
          resetError?.response?.data?.message ??
          "Unable to reset invoice settings right now."
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/business"
            eyebrow="Invoice settings"
            subtitle="Control numbering, template defaults, visibility rules, and email behavior for invoices."
            title="Configure invoices"
          />

          {error ? (
            <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
              <Text className="text-sm text-foreground">{successMessage}</Text>
            </View>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Invoice numbering</CardTitle>
              <CardDescription>Control prefixes, formats, and the next running numbers.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {isLoading ? (
                <LoadingState />
              ) : (
                <>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <SettingsField label="Sales prefix">
                        <Input value={form.invoice_prefix ?? ""} onChangeText={(value) => updateField(setForm, "invoice_prefix", value)} />
                      </SettingsField>
                    </View>
                    <View className="flex-1">
                      <SettingsField label="Next sales number">
                        <Input
                          keyboardType="number-pad"
                          value={String(form.next_invoice_number ?? 0)}
                          onChangeText={(value) => updateField(setForm, "next_invoice_number", parseNumber(value))}
                        />
                      </SettingsField>
                    </View>
                  </View>

                  <SettingsField label="Sales format">
                    <View className="flex-row flex-wrap gap-3">
                      {NUMBER_FORMATS.map((format) => (
                        <ChoiceChip
                          key={format.value}
                          label={format.label}
                          selected={form.invoice_number_format === format.value}
                          onPress={() => updateField(setForm, "invoice_number_format", format.value)}
                        />
                      ))}
                    </View>
                  </SettingsField>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <SettingsField label="Purchase prefix">
                        <Input value={form.purchase_prefix ?? ""} onChangeText={(value) => updateField(setForm, "purchase_prefix", value)} />
                      </SettingsField>
                    </View>
                    <View className="flex-1">
                      <SettingsField label="Next purchase number">
                        <Input
                          keyboardType="number-pad"
                          value={String(form.next_purchase_number ?? 0)}
                          onChangeText={(value) => updateField(setForm, "next_purchase_number", parseNumber(value))}
                        />
                      </SettingsField>
                    </View>
                  </View>

                  <SettingsField label="Reset numbering">
                    <View className="flex-row flex-wrap gap-3">
                      {([
                        { label: "Never", value: "never" },
                        { label: "Yearly", value: "yearly" },
                        { label: "Monthly", value: "monthly" },
                      ] as const).map((option) => (
                        <ChoiceChip
                          key={option.value}
                          label={option.label}
                          selected={form.reset_numbering === option.value}
                          onPress={() => updateField(setForm, "reset_numbering", option.value)}
                        />
                      ))}
                    </View>
                  </SettingsField>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Defaults</CardTitle>
              <CardDescription>Set the template and payment due behavior for future invoices.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SettingsField label="Default due days">
                    <Input
                      keyboardType="number-pad"
                      value={String(form.default_due_days ?? 0)}
                      onChangeText={(value) => updateField(setForm, "default_due_days", parseNumber(value))}
                    />
                  </SettingsField>
                </View>
                <View className="flex-1">
                  <SettingsField label="Currency">
                    <Input editable={false} value={form.default_currency ?? "INR"} />
                  </SettingsField>
                </View>
              </View>

              <SettingsField label="Default template">
                <View className="flex-row flex-wrap gap-3">
                  {INVOICE_TEMPLATES.map((template) => (
                    <ChoiceChip
                      key={template.value}
                      label={template.label}
                      selected={form.default_template === template.value}
                      onPress={() => updateField(setForm, "default_template", template.value)}
                    />
                  ))}
                </View>
              </SettingsField>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Visibility and tax</CardTitle>
              <CardDescription>Choose what invoice fields are displayed to customers and suppliers.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <ToggleRow
                checked={Boolean(form.enable_tax)}
                description="Turn tax calculation sections on for invoices."
                label="Enable tax"
                onCheckedChange={(value) => updateField(setForm, "enable_tax", value)}
              />
              <SettingsField label="Tax label">
                <Input value={form.tax_label ?? ""} onChangeText={(value) => updateField(setForm, "tax_label", value)} />
              </SettingsField>
              <Separator />
              <ToggleRow
                checked={Boolean(form.show_tax_number)}
                description="Show GSTIN or equivalent tax registration number."
                label="Show tax number"
                onCheckedChange={(value) => updateField(setForm, "show_tax_number", value)}
              />
              <ToggleRow
                checked={Boolean(form.show_logo)}
                description="Include the business logo on invoice output."
                label="Show logo"
                onCheckedChange={(value) => updateField(setForm, "show_logo", value)}
              />
              <ToggleRow
                checked={Boolean(form.show_signature)}
                description="Include signature space or image on invoices."
                label="Show signature"
                onCheckedChange={(value) => updateField(setForm, "show_signature", value)}
              />
              <ToggleRow
                checked={Boolean(form.show_terms)}
                description="Display standard terms and conditions below totals."
                label="Show terms"
                onCheckedChange={(value) => updateField(setForm, "show_terms", value)}
              />
              {form.show_terms ? (
                <SettingsField label="Default terms">
                  <Textarea value={form.default_terms ?? ""} onChangeText={(value) => updateField(setForm, "default_terms", value)} />
                </SettingsField>
              ) : null}
              <ToggleRow
                checked={Boolean(form.show_notes)}
                description="Display a default notes section on invoices."
                label="Show notes"
                onCheckedChange={(value) => updateField(setForm, "show_notes", value)}
              />
              {form.show_notes ? (
                <SettingsField label="Default notes">
                  <Textarea value={form.default_notes ?? ""} onChangeText={(value) => updateField(setForm, "default_notes", value)} />
                </SettingsField>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Email and payment</CardTitle>
              <CardDescription>Define outgoing email copy and payment instructions bundled with invoices.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <ToggleRow
                checked={Boolean(form.auto_send_email)}
                description="Automatically send invoice emails after creation."
                label="Auto-send email"
                onCheckedChange={(value) => updateField(setForm, "auto_send_email", value)}
              />
              <SettingsField label="Email subject template">
                <Input
                  value={form.email_subject_template ?? ""}
                  onChangeText={(value) => updateField(setForm, "email_subject_template", value)}
                />
              </SettingsField>
              <SettingsField label="Email body template">
                <Textarea
                  value={form.email_body_template ?? ""}
                  onChangeText={(value) => updateField(setForm, "email_body_template", value)}
                />
              </SettingsField>
              <Separator />
              <ToggleRow
                checked={Boolean(form.enable_online_payment)}
                description="Show online payment instructions for recipients."
                label="Enable online payment"
                onCheckedChange={(value) => updateField(setForm, "enable_online_payment", value)}
              />
              <SettingsField label="Payment instructions">
                <Textarea
                  value={form.payment_instructions ?? ""}
                  onChangeText={(value) => updateField(setForm, "payment_instructions", value)}
                />
              </SettingsField>
            </CardContent>
          </Card>

          <View className="flex-row gap-3">
            <Button variant="outline" className="h-14 flex-1 rounded-[22px]" disabled={isResetting || isLoading} onPress={onReset}>
              {isResetting ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Icon as={RotateCcw} className="text-foreground" size={16} />
                  <Text>Reset</Text>
                </>
              )}
            </Button>
            <Button className="h-14 flex-1 rounded-[22px]" disabled={isSaving || isLoading} onPress={onSave}>
              {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text>Save settings</Text>}
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-foreground">{label}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
      </View>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </View>
  );
}

function LoadingState() {
  return (
    <View className="items-center py-8">
      <ActivityIndicator />
    </View>
  );
}

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-2.5 ${selected ? "border-primary bg-primary" : "border-border/70 bg-background"}`}
      onPress={onPress}>
      <Text className={selected ? "text-primary-foreground" : "text-foreground"}>{label}</Text>
    </Pressable>
  );
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function updateField<T extends keyof UpdateInvoiceSettingsInput>(
  setForm: React.Dispatch<React.SetStateAction<UpdateInvoiceSettingsInput>>,
  key: T,
  value: UpdateInvoiceSettingsInput[T]
) {
  setForm((current) => ({ ...current, [key]: value }));
}
