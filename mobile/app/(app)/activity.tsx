import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  CheckCircle2,
  Edit3,
  FileText,
  Package,
  Settings2,
  Trash2,
  UserPlus,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { CollectionScreenSkeleton } from '@/components/screen-skeleton';
import { SubpageHeader } from '@/components/subpage-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { analyticsService } from '@/services/analytics.service';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { ActivityData } from '@/types/analytics';

const PAGE_SIZE = 20;

const EVENT_META: Record<string, { icon: LucideIcon; tone: string }> = {
  business_updated: { icon: Settings2, tone: 'text-slate-600' },
  inventory_created: { icon: Package, tone: 'text-indigo-600' },
  inventory_stock_adjusted: { icon: Package, tone: 'text-orange-600' },
  inventory_updated: { icon: Edit3, tone: 'text-amber-600' },
  invoice_cancelled: { icon: XCircle, tone: 'text-destructive' },
  invoice_created: { icon: FileText, tone: 'text-primary' },
  invoice_updated: { icon: Edit3, tone: 'text-amber-600' },
  member_invited: { icon: UserPlus, tone: 'text-violet-600' },
  party_created: { icon: UserPlus, tone: 'text-violet-600' },
  party_deleted: { icon: Trash2, tone: 'text-destructive' },
  party_updated: { icon: Edit3, tone: 'text-amber-600' },
  payment_reconciled: { icon: CheckCircle2, tone: 'text-emerald-600' },
  payment_recorded: { icon: Wallet, tone: 'text-emerald-600' },
};

export default function ActivityScreen() {
  const { session } = useAuthStore();
  const [businessName, setBusinessName] = React.useState<string | null>(null);
  const [activity, setActivity] = React.useState<ActivityData | null>(null);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadActivity = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!session?.business_id) {
        setBusinessName(null);
        setActivity(null);
        setError(null);
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
        const [business, activityData] = await Promise.all([
          businessService.getBusiness(session.business_id),
          analyticsService.getActivity(session.business_id, page, PAGE_SIZE),
        ]);
        setBusinessName(business.name);
        setActivity(activityData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load activity right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, session?.business_id]
  );

  React.useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  if (isLoading) {
    return <CollectionScreenSkeleton metricCount={2} rowCount={6} showFilterCard={false} />;
  }

  const total = activity?.total ?? 0;
  const currentEvents = activity?.events ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstIndex = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastIndex = total ? Math.min(page * PAGE_SIZE, total) : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadActivity('refresh')} />}>
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/more"
            eyebrow="Activity"
            subtitle={`Timeline of important actions inside ${businessName ?? 'your active workspace'}.`}
            title="Recent activity"
          />

          <View className="flex-row gap-4">
            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>Total events</CardTitle>
                <CardDescription>Tracked server-side business actions.</CardDescription>
              </CardHeader>
              <CardContent>
                <Text className="text-2xl font-extrabold text-foreground">{total}</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 rounded-[28px]">
              <CardHeader>
                <CardTitle>Page</CardTitle>
                <CardDescription>Current slice of the activity timeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <Text className="text-2xl font-extrabold text-foreground">
                  {page}/{totalPages}
                </Text>
              </CardContent>
            </Card>
          </View>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                {total ? `Showing ${firstIndex}-${lastIndex} of ${total} events.` : 'No recorded activity yet.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {currentEvents.length ? (
                currentEvents.map((event) => {
                  const meta = EVENT_META[event.event_type] ?? { icon: Activity, tone: 'text-primary' };

                  return (
                    <View key={event.id} className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start gap-4">
                        <View className="rounded-2xl bg-primary/10 px-3 py-3">
                          <Icon as={meta.icon} className={meta.tone} size={18} />
                        </View>
                        <View className="flex-1 gap-2">
                          <View className="flex-row items-start justify-between gap-3">
                            <Text className="flex-1 font-semibold text-foreground">{event.description}</Text>
                            <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                              {formatRelativeTime(event.created_at)}
                            </Text>
                          </View>
                          <View className="flex-row flex-wrap gap-2">
                            <Tag label={formatEventType(event.event_type)} />
                            {event.user_name ? <Tag label={`by ${event.user_name}`} /> : null}
                          </View>
                          {Object.keys(event.metadata ?? {}).length ? (
                            <View className="rounded-2xl border border-border/60 bg-card px-3 py-3">
                              {Object.entries(event.metadata).slice(0, 4).map(([key, value]) => (
                                <View key={key} className="flex-row items-start justify-between gap-3 py-1">
                                  <Text className="flex-1 text-sm capitalize text-muted-foreground">
                                    {key.replaceAll('_', ' ')}
                                  </Text>
                                  <Text className="max-w-[55%] text-right text-sm font-medium text-foreground">
                                    {formatMetadataValue(value)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-5 py-8">
                  <View className="rounded-[22px] bg-primary/10 px-4 py-4">
                    <Icon as={Activity} className="text-primary" size={22} />
                  </View>
                  <View className="items-center gap-1">
                    <Text className="font-semibold text-foreground">No activity recorded yet</Text>
                    <Text className="text-center text-sm leading-6 text-muted-foreground">
                      Actions like invoices, payments, inventory changes, and member updates will show here.
                    </Text>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 ? (
            <Card className="rounded-[28px]">
              <CardContent className="gap-4 pt-6">
                <View className="flex-row gap-3">
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl"
                    disabled={page === 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}>
                    <Text>Previous</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl"
                    disabled={page >= totalPages}
                    onPress={() => setPage((current) => Math.min(totalPages, current + 1))}>
                    <Text>Next</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
              <CardContent className="px-5 py-5">
                <Text className="font-semibold text-foreground">Activity sync needs attention</Text>
                <Text className="mt-2 text-sm leading-6 text-muted-foreground">{error}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border/70 bg-card px-3 py-1">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">{label}</Text>
    </View>
  );
}

function formatEventType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function formatMetadataValue(value: unknown) {
  if (value == null) {
    return 'N/A';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
