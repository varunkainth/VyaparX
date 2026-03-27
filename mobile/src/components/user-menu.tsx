import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import type { TriggerRef } from '@rn-primitives/popover';
import { useRouter } from 'expo-router';
import { LogOutIcon, PlusIcon, SettingsIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

export function UserMenu() {
  const router = useRouter();
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const { clearAuth, user } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const fullName = user?.name?.trim() || 'Account';
  const username = user?.email || user?.phone || 'Signed in user';

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    setIsSigningOut(true);

    try {
      await authService.logout();
    } catch {}

    await clearAuth();
    router.replace('/(auth)/login');
    setIsSigningOut(false);
  }

  function onManageAccount() {
    popoverTriggerRef.current?.close();
    router.push('/(app)/profile');
  }

  function onAddAccount() {
    popoverTriggerRef.current?.close();
    router.push('/(auth)/signup');
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar fullName={fullName} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" side="bottom" className="w-80 p-0">
        <View className="border-border gap-3 border-b p-3">
          <View className="flex-row items-center gap-3">
            <UserAvatar className="size-10" fullName={fullName} />
            <View className="flex-1">
              <Text className="font-medium leading-5">{fullName}</Text>
              {username.length ? (
                <Text className="text-muted-foreground text-sm font-normal leading-4">
                  {username}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-3 py-0.5">
            <Button
              variant="outline"
              size="sm"
              onPress={onManageAccount}>
              <Icon as={SettingsIcon} className="size-4" />
              <Text>Manage Account</Text>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" disabled={isSigningOut} onPress={onSignOut}>
              <Icon as={LogOutIcon} className="size-4" />
              <Text>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</Text>
            </Button>
          </View>
        </View>
        <Button
          variant="ghost"
          size="lg"
          className="h-16 justify-start gap-3 rounded-none rounded-b-md px-3 sm:h-14"
          onPress={onAddAccount}>
          <View className="size-10 items-center justify-center">
            <View className="border-border bg-muted/50 size-7 items-center justify-center rounded-full border border-dashed">
              <Icon as={PlusIcon} className="size-5" />
            </View>
          </View>
          <Text>Add account</Text>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar({
  className,
  fullName,
  ...props
}: Omit<React.ComponentProps<typeof Avatar>, 'alt'> & {
  fullName: string;
}) {
  const initials = getInitials(fullName);

  return (
    <Avatar alt={`${fullName}'s avatar`} className={cn('size-8', className)} {...props}>
      <AvatarFallback>
        <Text>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}

function getInitials(fullName: string) {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'AC';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
