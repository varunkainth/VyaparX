import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Boxes, FileSpreadsheet, TrendingUp } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const reportItems = [
  ['Sales report', 'Revenue, billing velocity, and collections trend', TrendingUp],
  ['Inventory report', 'Stock movement, low inventory, and category status', Boxes],
  ['Financial summary', 'Profit, expenses, and cash health overview', BarChart3],
  ['Tax exports', 'Structured GST and accounting-ready output', FileSpreadsheet],
] as const;

export default function ReportsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Reports"
            subtitle="Reporting belongs in a dedicated section, not the main day-to-day navigation tabs."
            title="Business insights"
          />

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Report groups</CardTitle>
              <CardDescription>High-value business visibility areas for the app.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {reportItems.map(([title, description, icon]) => (
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
