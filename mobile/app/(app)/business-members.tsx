import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ShieldCheck, UserPlus, Users } from 'lucide-react-native';

import { SubpageHeader } from '@/components/subpage-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { ToastBanner, useTimedToast } from '@/components/ui/toast-banner';
import { businessService } from '@/services/business.service';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessAssignableRole, BusinessMember } from '@/types/business';

const roleOptions: BusinessAssignableRole[] = ['admin', 'staff', 'viewer', 'accountant'];

export default function BusinessMembersScreen() {
  const { session } = useAuthStore();
  const { message, showToast } = useTimedToast();
  const [members, setMembers] = React.useState<BusinessMember[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<BusinessAssignableRole>('staff');
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInviting, setIsInviting] = React.useState(false);
  const [busyMemberId, setBusyMemberId] = React.useState<string | null>(null);
  const [pendingStatusMember, setPendingStatusMember] = React.useState<BusinessMember | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const loadMembers = React.useCallback(async () => {
    if (!session?.business_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await businessService.listBusinessMembers(session.business_id);
      setMembers(data);
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.error?.message ??
          loadError?.response?.data?.message ??
          'Unable to load business members right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.business_id]);

  React.useEffect(() => {
    setError(null);
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) =>
      `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(query)
    );
  }, [members, search]);

  async function onInvite() {
    if (!session?.business_id) {
      return;
    }

    if (!inviteEmail.trim()) {
      setError('Enter a member email address.');
      return;
    }

    setIsInviting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await businessService.inviteBusinessMember(session.business_id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setSuccessMessage('Member invited successfully.');
      showToast('Member invited successfully.');
      await loadMembers();
    } catch (inviteError: any) {
      setError(
        inviteError?.response?.data?.error?.message ??
          inviteError?.response?.data?.message ??
          'Unable to invite member right now.'
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function onChangeRole(memberId: string, role: BusinessAssignableRole) {
    if (!session?.business_id) {
      return;
    }

    setBusyMemberId(memberId);
    setError(null);
    setSuccessMessage(null);

    try {
      await businessService.updateBusinessMemberRole(session.business_id, memberId, role);
      setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, role } : member)));
      setSuccessMessage('Member role updated.');
      showToast('Member role updated.');
    } catch (updateError: any) {
      setError(
        updateError?.response?.data?.error?.message ??
          updateError?.response?.data?.message ??
          'Unable to update member role right now.'
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function onToggleStatus(memberId: string, isActive: boolean) {
    if (!session?.business_id) {
      return;
    }

    setBusyMemberId(memberId);
    setError(null);
    setSuccessMessage(null);

    try {
      await businessService.updateBusinessMemberStatus(session.business_id, memberId, !isActive);
      setMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, is_active: !isActive } : member))
      );
      setSuccessMessage(`Member ${isActive ? 'disabled' : 'enabled'} successfully.`);
      showToast(`Member ${isActive ? 'disabled' : 'enabled'} successfully.`);
    } catch (updateError: any) {
      setError(
        updateError?.response?.data?.error?.message ??
          updateError?.response?.data?.message ??
          'Unable to update member access right now.'
      );
    } finally {
      setBusyMemberId(null);
      setPendingStatusMember(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <SubpageHeader
            backHref="/(app)/business"
            eyebrow="Members and roles"
            subtitle="Invite teammates, change roles, and control workspace access."
            title="Manage team access"
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
              <CardTitle>Invite member</CardTitle>
              <CardDescription>Add an existing user to this business and assign a role.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <BusinessField label="Member email">
                <Input
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                />
              </BusinessField>

              <View className="gap-2">
                <Label>Role</Label>
                <View className="flex-row flex-wrap gap-2">
                  {roleOptions.map((role) => {
                    const selected = inviteRole === role;

                    return (
                      <Pressable
                        key={role}
                        className={`rounded-full border px-4 py-2 ${
                          selected ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                        }`}
                        onPress={() => setInviteRole(role)}>
                        <Text className={selected ? 'text-primary' : 'text-foreground'}>
                          {formatRole(role)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button className="h-14 gap-2 rounded-[22px]" disabled={isInviting} onPress={onInvite}>
                {isInviting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Icon as={UserPlus} className="text-primary-foreground" size={16} />
                    <Text>Invite member</Text>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Current members</CardTitle>
              <CardDescription>Owner stays fixed. Other members can have their role or access updated.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center gap-3 rounded-[22px] border border-border/70 bg-background px-4">
                <Icon as={Search} className="text-muted-foreground" size={16} />
                <Input
                  className="h-12 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none"
                  placeholder="Search members by name, email, or role"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                  {filteredMembers.length} of {members.length} members
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {members.filter((member) => member.is_active).length} active
                </Text>
              </View>

              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : members.length === 0 ? (
                <View className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <View className="flex-row items-center gap-3">
                    <View className="rounded-2xl bg-primary/10 px-3 py-3">
                      <Icon as={Users} className="text-primary" size={18} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-foreground">No members found</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        Invite teammates to collaborate in this business.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : filteredMembers.length === 0 ? (
                <View className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                  <Text className="font-semibold text-foreground">No matching members</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                    Try another search term or clear the filter.
                  </Text>
                </View>
              ) : (
                filteredMembers.map((member) => {
                  const isBusy = busyMemberId === member.id;
                  const canManage = member.role !== 'owner';

                  return (
                    <View
                      key={member.id}
                      className="rounded-[24px] border border-border/70 bg-background px-4 py-4">
                      <View className="flex-row items-start gap-4">
                        <View className="rounded-2xl bg-primary/10 px-3 py-3">
                          <Icon as={member.role === 'owner' ? ShieldCheck : Users} className="text-primary" size={18} />
                        </View>
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">{member.name}</Text>
                          <Text className="text-sm text-muted-foreground">{member.email}</Text>
                          <Text className="text-sm text-muted-foreground">
                            Joined: {new Date(member.joined_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View className={`rounded-full px-3 py-1 ${member.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Text className={`text-xs font-semibold uppercase tracking-[1px] ${member.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                            {member.is_active ? 'Active' : 'Disabled'}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 gap-3">
                        <View className="flex-row gap-2">
                          <View className={`rounded-full px-3 py-1 ${member.role === 'owner' ? 'bg-primary text-primary' : 'bg-secondary'}`}>
                            <Text className={`text-xs font-semibold uppercase tracking-[1px] ${member.role === 'owner' ? 'text-primary' : 'text-foreground'}`}>
                              {formatRole(member.role)}
                            </Text>
                          </View>
                          {!member.is_active ? (
                            <View className="rounded-full bg-destructive/10 px-3 py-1">
                              <Text className="text-xs font-semibold uppercase tracking-[1px] text-destructive">
                                Access off
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                          {(member.role === 'owner'
                            ? (['owner'] as const)
                            : roleOptions).map((role) => {
                            const selected = member.role === role;

                            return (
                              <Pressable
                                key={role}
                                className={`rounded-full border px-4 py-2 ${
                                  selected ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                                }`}
                                disabled={!canManage || isBusy}
                                onPress={() => {
                                  if (role !== 'owner') {
                                    void onChangeRole(member.id, role);
                                  }
                                }}>
                                <Text className={selected ? 'text-primary' : 'text-foreground'}>
                                  {formatRole(role)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        {canManage ? (
                          <Button
                            variant={member.is_active ? 'outline' : 'secondary'}
                            className="h-11 rounded-[18px]"
                            disabled={isBusy}
                            onPress={() => setPendingStatusMember(member)}>
                            {isBusy ? (
                              <ActivityIndicator color="#0f172a" />
                            ) : (
                              <Text>{member.is_active ? 'Disable access' : 'Enable access'}</Text>
                            )}
                          </Button>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <AlertDialog open={!!pendingStatusMember} onOpenChange={(open) => {
        if (!open) {
          setPendingStatusMember(null);
        }
      }}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusMember?.is_active ? 'Disable member access?' : 'Enable member access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusMember?.is_active
                ? 'This member will lose access to the business until you enable them again.'
                : 'This member will regain access to the business immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className={pendingStatusMember?.is_active ? 'bg-destructive' : undefined}
              onPress={() => {
                if (pendingStatusMember) {
                  void onToggleStatus(pendingStatusMember.id, pendingStatusMember.is_active);
                }
              }}>
              <Text>{pendingStatusMember?.is_active ? 'Disable access' : 'Enable access'}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToastBanner message={message} variant="success" />
    </SafeAreaView>
  );
}

function BusinessField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
}
