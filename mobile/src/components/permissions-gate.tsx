import * as React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderOpen, ShieldCheck, BellRing } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { isRunningInExpoGo } from 'expo';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { hasHandledPermissionsPrompt, markPermissionsPromptHandled } from '@/lib/permission-storage';
import type { NotificationPermissionsStatus } from 'expo-notifications';

type PermissionState = 'granted' | 'denied' | 'undetermined';

type PermissionSnapshot = {
  media: PermissionState;
  notifications: PermissionState;
};

type NotificationPermissionResponse = NotificationPermissionsStatus | { status: PermissionState };

export function PermissionsGate({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<PermissionSnapshot | null>(null);
  const [hasHandledPrompt, setHasHandledPrompt] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRequesting, setIsRequesting] = React.useState(false);
  const notificationsSupported = Platform.OS !== 'web' && !isRunningInExpoGo();

  React.useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const notificationPromise: Promise<NotificationPermissionResponse> = notificationsSupported
        ? (await import('expo-notifications')).getPermissionsAsync()
        : Promise.resolve({ status: 'granted' } as NotificationPermissionResponse);

      const [notificationPermission, mediaPermission, handled] = await Promise.all([
        notificationPromise,
        MediaLibrary.getPermissionsAsync(),
        hasHandledPermissionsPrompt(),
      ]);

      if (!isMounted) {
        return;
      }

      setSnapshot({
        media: normalizeStatus(mediaPermission.status),
        notifications: normalizeStatus(notificationPermission.status),
      });
      setHasHandledPrompt(handled || !notificationsSupported);
      setIsLoading(false);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [notificationsSupported]);

  const notificationsGranted = !notificationsSupported || snapshot?.notifications === 'granted';
  const allGranted = snapshot?.media === 'granted' && notificationsGranted;

  if (isLoading) {
    return null;
  }

  if (allGranted || hasHandledPrompt) {
    return <>{children}</>;
  }

  async function onAllowAll() {
    setIsRequesting(true);

    try {
      let notificationPermissionPromise: Promise<NotificationPermissionResponse> = Promise.resolve({
        status: 'granted',
      } as NotificationPermissionResponse);

      if (notificationsSupported) {
        const Notifications = await import('expo-notifications');
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        notificationPermissionPromise = Notifications.requestPermissionsAsync();
      }

      const [notificationPermission, mediaPermission] = await Promise.all([
        notificationPermissionPromise,
        MediaLibrary.requestPermissionsAsync(),
      ]);

      const nextSnapshot = {
        media: normalizeStatus(mediaPermission.status),
        notifications: normalizeStatus(notificationPermission.status),
      };

      setSnapshot(nextSnapshot);
      await markPermissionsPromptHandled();
      setHasHandledPrompt(true);
    } finally {
      setIsRequesting(false);
    }
  }

  async function onMaybeLater() {
    await markPermissionsPromptHandled();
    setHasHandledPrompt(true);
  }

  const anyDenied =
    snapshot?.media === 'denied' ||
    (notificationsSupported && snapshot?.notifications === 'denied');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -left-12 top-16 h-36 w-36 rounded-full bg-primary/8" />
      <View className="absolute right-0 top-40 h-28 w-28 rounded-full bg-secondary/70" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="flex-grow justify-center px-6 py-8">
        <Card className="overflow-hidden rounded-[32px] border-border/80 bg-card shadow-sm shadow-black/5">
          <View className="absolute -right-14 top-0 h-32 w-32 rounded-full bg-primary/10" />
          <View className="absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-secondary/80" />
          <CardHeader className="gap-3">
            <View className="mx-auto rounded-[22px] bg-primary px-4 py-4">
              <Icon as={ShieldCheck} className="text-primary-foreground" size={24} />
            </View>
            <CardTitle className="text-center text-3xl">Enable essentials</CardTitle>
            <CardDescription className="text-center leading-6">
              Storage access and notifications help with exports, attachments, and business alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {notificationsSupported ? (
              <PermissionRow
                description="Receive reminders, due alerts, and business updates."
                icon={BellRing}
                status={snapshot?.notifications ?? 'undetermined'}
                title="Notifications"
              />
            ) : null}
            <PermissionRow
              description="Save and access media, files, and generated assets."
              icon={FolderOpen}
              status={snapshot?.media ?? 'undetermined'}
              title="Storage / Photos"
            />

            <View className="gap-3 pt-2">
              <Button className="h-14 rounded-[22px]" disabled={isRequesting} onPress={onAllowAll}>
                {isRequesting ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base">Allow permissions</Text>}
              </Button>

              {anyDenied ? (
                <Button variant="outline" className="h-14 rounded-[22px]" onPress={() => Linking.openSettings()}>
                  <Text className="text-base">Open system settings</Text>
                </Button>
              ) : null}

              <Pressable accessibilityRole="button" className="py-2" onPress={onMaybeLater}>
                <Text className="text-center text-sm text-muted-foreground">Maybe later</Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  description,
  icon,
  status,
  title,
}: {
  description: string;
  icon: typeof BellRing;
  status: PermissionState;
  title: string;
}) {
  const statusColor =
    status === 'granted' ? 'bg-primary' : status === 'denied' ? 'bg-destructive' : 'bg-muted-foreground';

  const statusLabel =
    status === 'granted' ? 'Allowed' : status === 'denied' ? 'Blocked' : 'Ask';

  return (
    <View className="flex-row items-center gap-4 rounded-[24px] border border-border/70 bg-background px-4 py-4">
      <View className="rounded-2xl bg-primary/10 px-3 py-3">
        <Icon as={icon} className="text-primary" size={18} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
      </View>
      <View className="items-center gap-1">
        <View className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        <Text className="text-xs text-muted-foreground">{statusLabel}</Text>
      </View>
    </View>
  );
}

function normalizeStatus(status: string): PermissionState {
  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}
