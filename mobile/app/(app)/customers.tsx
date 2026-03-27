import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ChevronUp, CircleDollarSign, Phone, Plus, ScrollText, Users, UserRoundSearch } from 'lucide-react-native';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatCompactNumber, formatCurrency } from '@/lib/formatters';
import { partyService } from '@/services/party.service';
import { useAuthStore } from '@/store/auth-store';
import type { Party } from '@/types/party';

export default function CustomersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string; toast?: string }>();
  const { message, showToast } = useTimedToast();
  const { session } = useAuthStore();
  const [parties, setParties] = React.useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const handledRefreshRef = React.useRef<string | null>(null);
  const handledToastRef = React.useRef<string | null>(null);
  const hasFocusedOnceRef = React.useRef(false);

  const loadParties = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!session?.business_id) {
        setParties([]);
        setError('Select a business to view customers.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setError(null);
        const nextParties = await partyService.listParties(session.business_id, {
          include_inactive: includeInactive ? 'true' : 'false',
        });
        setParties(nextParties);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load parties.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [includeInactive, session?.business_id],
  );

  React.useEffect(() => {
    void loadParties();
  }, [loadParties]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadParties('refresh');
    }, [loadParties]),
  );

  React.useEffect(() => {
    if (!params.toast || params.toast === handledToastRef.current) return;
    handledToastRef.current = params.toast;
    showToast(params.toast);
  }, [params.toast, showToast]);

  React.useEffect(() => {
    if (!params.refresh || params.refresh === handledRefreshRef.current) return;
    handledRefreshRef.current = params.refresh;
    void loadParties('refresh');
  }, [loadParties, params.refresh]);

  const customerParties = React.useMemo(
    () => parties.filter((party) => party.party_type === 'customer' || party.party_type === 'both'),
    [parties],
  );

  const filteredCustomers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return customerParties.filter((party) => {
      if (!query) return true;
      return (
        party.name.toLowerCase().includes(query) ||
        party.phone?.toLowerCase().includes(query) ||
        party.email?.toLowerCase().includes(query) ||
        party.city?.toLowerCase().includes(query) ||
        party.gstin?.toLowerCase().includes(query)
      );
    });
  }, [customerParties, searchQuery]);

  const stats = React.useMemo(() => {
    const receivables = customerParties.filter((party) => party.current_balance > 0).reduce((sum, party) => sum + party.current_balance, 0);
    return {
      customerCount: customerParties.length,
      neutralCount: customerParties.filter((party) => party.current_balance === 0).length,
      receivables,
      withPhoneCount: customerParties.filter((party) => Boolean(party.phone)).length,
    };
  }, [customerParties]);

  if (isLoading) {
    return <FullScreenLoader label="Loading customers" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-16 h-32 w-32 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-40 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadParties('refresh')} />}>
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm uppercase tracking-[2px] text-muted-foreground">Customers</Text>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Party book</Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Live customer balances, contacts, and collection visibility for your active business.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <MiniPill icon={Users} label={`${stats.customerCount} active customer parties`} />
            <MiniPill icon={CircleDollarSign} label={`${formatCompactNumber(stats.receivables)} receivable`} />
            <MiniPill icon={Phone} label={`${stats.withPhoneCount} with phone details`} />
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search customers and decide whether inactive parties should be visible.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <Input
                placeholder="Search by name, phone, city, GSTIN, or email"
                returnKeyType="search"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View className="flex-row items-center gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium text-foreground">Include inactive</Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Show customers that have been deactivated from the party list.
                  </Text>
                </View>
                <Switch onValueChange={setIncludeInactive} value={includeInactive} />
              </View>
            </CardContent>
          </Card>

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="gap-4 px-5 py-5">
                <Text className="font-semibold text-foreground">Customer sync failed</Text>
                <Text className="text-sm leading-6 text-muted-foreground">{error}</Text>
                <Button className="h-12 rounded-2xl" onPress={() => void loadParties()}>
                  <Text>Retry customer sync</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                {filteredCustomers.length} results shown {searchQuery ? `for "${searchQuery.trim()}"` : 'in this business'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {filteredCustomers.length ? (
                filteredCustomers.map((party) => (
                  <Pressable
                    key={party.id}
                    className="rounded-[24px] border border-border/70 bg-background px-4 py-4"
                    onPress={() => router.push({ pathname: '/(app)/party-detail', params: { id: party.id } })}>
                    <View className="flex-row items-start gap-4">
                      <View className="rounded-2xl bg-primary/10 px-3 py-3">
                        <Icon as={party.phone ? Phone : UserRoundSearch} className="text-primary" size={18} />
                      </View>
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center justify-between gap-4">
                          <Text className="flex-1 font-semibold text-foreground">{party.name}</Text>
                          <Text className={`text-sm font-semibold ${party.current_balance > 0 ? 'text-emerald-600' : party.current_balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {formatCurrency(party.current_balance)}
                          </Text>
                        </View>
                        <Text className="text-sm leading-5 text-muted-foreground">
                          {party.phone || party.email || party.city || 'No contact details added yet.'}
                        </Text>
                        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                          {party.party_type === 'both' ? 'Customer and supplier' : 'Customer'}
                          {party.is_active ? '' : ' | Inactive'}
                          {party.current_balance === 0 ? ' | Settled' : ''}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <EmptyState hasFilters={Boolean(searchQuery.trim())} includeInactive={includeInactive} neutralCount={stats.neutralCount} />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Customer tools</CardTitle>
              <CardDescription>Open deeper customer finance views from here.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <Pressable onPress={() => router.push('/(app)/ledger')}>
                <Button variant="outline" className="h-14 justify-between rounded-2xl px-4">
                  <View className="flex-row items-center gap-3">
                    <Icon as={ScrollText} className="text-primary" size={18} />
                    <Text>Party ledger</Text>
                  </View>
                  <Icon as={ArrowUpRight} className="text-muted-foreground" size={18} />
                </Button>
              </Pressable>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <PartyActionFab
        isOpen={isFabOpen}
        onCreate={() => {
          setIsFabOpen(false);
          router.push('/(app)/party-create');
        }}
        onToggle={() => setIsFabOpen((current) => !current)}
      />
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function MiniPill({ icon, label }: { icon: typeof Users; label: string }) {
  return (
    <View className="min-w-[140px] flex-1 flex-row items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <Text className="flex-1 font-medium text-foreground">{label}</Text>
    </View>
  );
}

function EmptyState({
  hasFilters,
  includeInactive,
  neutralCount,
}: {
  hasFilters: boolean;
  includeInactive: boolean;
  neutralCount: number;
}) {
  return (
    <View className="items-center gap-4 rounded-[28px] border border-dashed border-border/70 bg-muted/20 px-6 py-8">
      <View className="rounded-[24px] bg-primary/10 px-4 py-4">
        <Icon as={UserRoundSearch} className="text-primary" size={24} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground">
          {hasFilters ? 'No matching customers found' : 'No customer parties yet'}
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? 'Try a broader search to find the customer you are looking for.'
            : includeInactive
              ? 'There are no customer parties in this business, including inactive records.'
              : neutralCount > 0
                ? 'Customer balances look settled right now, but there are no customer results in this filtered view.'
                : 'Create customer parties from the mobile party flow to see them here.'}
        </Text>
      </View>
    </View>
  );
}

function PartyActionFab({
  isOpen,
  onCreate,
  onToggle,
}: {
  isOpen: boolean;
  onCreate: () => void;
  onToggle: () => void;
}) {
  return (
    <View className="absolute bottom-28 right-6 items-end gap-3">
      {isOpen ? (
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-full border border-border/70 bg-card px-4 py-3"
          onPress={onCreate}
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 18,
          }}>
          <View className="rounded-full bg-primary/10 px-2.5 py-2.5">
            <Icon as={Plus} className="text-primary" size={18} />
          </View>
          <Text className="font-semibold text-foreground">Add party</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel={isOpen ? 'Close party actions' : 'Open party actions'}
        accessibilityRole="button"
        className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        onPress={onToggle}
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
        }}>
        <Icon as={isOpen ? ChevronUp : Plus} className="text-primary-foreground" size={24} />
      </Pressable>
    </View>
  );
}
