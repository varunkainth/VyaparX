import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, FileBadge2, Landmark, MapPinned, ReceiptIndianRupee, Users } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const settingsGroups = [
  ['Business profile', 'Trade name, registration details, and identity setup', Building2],
  ['GST and tax', 'GSTIN, PAN, and tax defaults for invoices', FileBadge2],
  ['Address and contact', 'Location, email, phone, and branch details', MapPinned],
  ['Invoice defaults', 'Prefix, numbering, and billing defaults', ReceiptIndianRupee],
  ['Bank and UPI', 'Accounts, IFSC, branch, and UPI setup', Landmark],
  ['Members and roles', 'Invite members and manage access levels', Users],
] as const;

export default function BusinessSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/business"
            eyebrow="Business settings"
            subtitle="This is where business-level configuration should live for the selected workspace."
            title="Manage business setup"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Settings groups</CardTitle>
              <CardDescription>Each group can become a dedicated editable section next.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {settingsGroups.map(([title, description, icon]) => (
                <View
                  key={title}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={icon} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{title}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
