import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boxes, PackageCheck, PackageSearch, Warehouse } from 'lucide-react-native';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const inventoryRows = [
  ['Parle-G Carton', '16 units', 'Reorder soon'],
  ['Aashirvaad Atta 5kg', '42 units', 'Healthy stock'],
  ['Amul Butter', '9 units', 'Urgent refill'],
];

export default function InventoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-14 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-44 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Inventory</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Stock room</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              See low-stock items, receiving priorities, and movement highlights without extra clutter.
            </Text>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Stock overview</CardTitle>
              <CardDescription>Fast checks before purchase or dispatch activity.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <InventoryPill icon={Warehouse} label="1,284 SKUs tracked" />
              <InventoryPill icon={PackageCheck} label="18 purchase receipts this week" />
              <InventoryPill icon={PackageSearch} label="7 low-stock alerts right now" />
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Items that may affect the next billing cycle.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {inventoryRows.map(([name, qty, meta]) => (
                <View
                  key={name}
                  className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <View className="rounded-2xl bg-primary/10 px-3 py-3">
                    <Icon as={Boxes} className="text-primary" size={18} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">{name}</Text>
                    <Text className="text-sm leading-5 text-muted-foreground">{meta}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{qty}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InventoryPill({ icon, label }: { icon: typeof Warehouse; label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="font-medium text-foreground">{label}</Text>
    </View>
  );
}
