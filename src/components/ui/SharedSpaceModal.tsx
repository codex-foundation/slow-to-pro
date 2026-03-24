import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { pullForCurrentUser } from '@/services/cloudSync';
import {
  createSpace,
  deleteSpace,
  inviteMember,
  leaveSpace,
  loadSpaces,
  pullSharedSpace,
  pushToSharedSpace,
  removeMember,
  respondToInvite,
} from '@/services/spaceSync';
import { supabase } from '@/lib/supabase';
import { useSpaceStore } from '@/stores/spaceStore';
import { Modal } from './Modal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SharedSpaceModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { spaces, members, pendingInvites, activeSpaceId, setActiveSpaceId } = useSpaceStore();
  const [tab, setTab] = useState<'spaces' | 'invites' | 'create'>('spaces');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteSpaceId, setInviteSpaceId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (visible) {
      void loadSpaces();
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!newSpaceName.trim()) return;
    setBusy(true);
    try {
      const { space, error } = await createSpace(newSpaceName.trim());
      if (error || !space) {
        Alert.alert('Could not create space', error ?? 'Unknown error');
        return;
      }
      setNewSpaceName('');
      setTab('spaces');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteSpaceId || !inviteEmail.trim()) return;
    setBusy(true);
    const { error } = await inviteMember(inviteSpaceId, inviteEmail.trim());
    setBusy(false);
    if (error) {
      Alert.alert('Invite failed', error);
    } else {
      setInviteEmail('');
      setInviteSpaceId(null);
    }
  };

  const handleRespond = async (memberId: string, spaceId: string, accept: boolean) => {
    setBusy(true);
    await respondToInvite(memberId, accept ? 'accepted' : 'declined');
    if (accept) setActiveSpaceId(spaceId);
    setBusy(false);
  };

  const handleSwitch = async (spaceId: string | null) => {
    setBusy(true);
    if (spaceId) {
      // Entering a space: load the space's data into local stores
      setActiveSpaceId(spaceId);
      await pullSharedSpace(spaceId);
    } else {
      // Leaving a space: save space data, then restore personal data from cloud
      if (activeSpaceId) await pushToSharedSpace(activeSpaceId);
      setActiveSpaceId(null);
      await pullForCurrentUser();
    }
    setBusy(false);
    onClose();
  };

  const handleLeave = async (spaceId: string, spaceName: string) => {
    Alert.alert(`Leave "${spaceName}"`, 'You will lose access to this shared space.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const wasActive = useSpaceStore.getState().activeSpaceId === spaceId;
          await leaveSpace(spaceId);
          if (wasActive) await pullForCurrentUser();
          setBusy(false);
        },
      },
    ]);
  };

  const handleDelete = (spaceId: string, spaceName: string) => {
    Alert.alert(
      `Delete "${spaceName}"`,
      'This permanently deletes the space and all its shared data for every member.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const wasActive = useSpaceStore.getState().activeSpaceId === spaceId;
            await deleteSpace(spaceId);
            if (wasActive) await pullForCurrentUser();
            setBusy(false);
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setBusy(true);
    await loadSpaces();
    setBusy(false);
  };

  const spaceMembers = (spaceId: string) =>
    members.filter((m) => m.spaceId === spaceId && m.status === 'accepted');

  const spaceInvites = (spaceId: string) =>
    members.filter((m) => m.spaceId === spaceId && m.role !== 'owner');

  const handleRemoveMember = async (memberId: string) => {
    setBusy(true);
    await removeMember(memberId);
    setBusy(false);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Shared Spaces">
      {/* Tabs */}
      <View className="flex-row mb-4 gap-2">
        {(['spaces', 'invites', 'create'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className="flex-1 py-2 rounded-xl items-center"
            style={{
              backgroundColor: tab === t ? theme.primary : theme.surface,
              borderColor: theme.border,
              borderWidth: tab === t ? 0 : 1,
            }}>
            <Text
              className="text-xs font-semibold capitalize"
              style={{ color: tab === t ? '#fff' : theme.textMuted }}>
              {t === 'invites'
                ? `Invites${pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ''}`
                : t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ---- SPACES TAB ---- */}
        {tab === 'spaces' && (
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
                Your spaces
              </Text>
              <TouchableOpacity onPress={handleRefresh} disabled={busy}>
                <Ionicons name="refresh-outline" size={18} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            {/* Personal (no space) */}
            <TouchableOpacity
              onPress={() => handleSwitch(null)}
              className="flex-row items-center justify-between rounded-xl px-3 py-3 mb-2"
              style={{
                backgroundColor: activeSpaceId === null ? theme.primarySoft : theme.surface,
                borderColor: activeSpaceId === null ? theme.primary : theme.border,
                borderWidth: 1,
              }}>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={activeSpaceId === null ? theme.primary : theme.textMuted}
                />
                <Text
                  className="text-sm font-medium"
                  style={{ color: activeSpaceId === null ? theme.primary : theme.text }}>
                  Personal
                </Text>
              </View>
              {activeSpaceId === null && (
                <Ionicons name="checkmark" size={16} color={theme.primary} />
              )}
            </TouchableOpacity>

            {spaces.map((space) => (
              <View
                key={space.id}
                className="rounded-xl mb-2 overflow-hidden"
                style={{
                  borderColor: theme.border,
                  borderWidth: 1,
                  backgroundColor: theme.surface,
                }}>
                <TouchableOpacity
                  onPress={() => handleSwitch(space.id)}
                  className="flex-row items-center justify-between px-3 py-3">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={activeSpaceId === space.id ? theme.primary : theme.textMuted}
                    />
                    <View>
                      <Text className="text-sm font-medium" style={{ color: theme.text }}>
                        {space.name}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.textSubtle }}>
                        {spaceMembers(space.id).length} member
                        {spaceMembers(space.id).length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {activeSpaceId === space.id && (
                    <Ionicons name="checkmark" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Actions row */}
                <View className="flex-row border-t" style={{ borderColor: theme.border }}>
                  <TouchableOpacity
                    onPress={() => {
                      setInviteSpaceId(space.id);
                      setTab('spaces');
                    }}
                    className="flex-1 py-2 items-center">
                    <Text className="text-xs font-medium" style={{ color: theme.primary }}>
                      Invite
                    </Text>
                  </TouchableOpacity>
                  <View style={{ width: 1, backgroundColor: theme.border }} />
                  {currentUserId === space.ownerId ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(space.id, space.name)}
                      className="flex-1 py-2 items-center">
                      <Text className="text-xs font-medium" style={{ color: theme.danger }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleLeave(space.id, space.name)}
                      className="flex-1 py-2 items-center">
                      <Text className="text-xs font-medium" style={{ color: theme.danger }}>
                        Leave
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Inline invite form */}
                {inviteSpaceId === space.id && (
                  <View
                    className="px-3 pb-3 pt-2"
                    style={{ borderTopWidth: 1, borderColor: theme.border }}>
                    <Text className="text-xs mb-2" style={{ color: theme.textSubtle }}>
                      Invite by email
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        placeholder="friend@example.com"
                        placeholderTextColor={theme.textSubtle}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="flex-1 rounded-xl px-3 py-2 text-sm"
                        style={{
                          borderColor: theme.border,
                          borderWidth: 1,
                          backgroundColor: theme.surfaceMuted,
                          color: theme.text,
                        }}
                      />
                      <TouchableOpacity
                        onPress={handleInvite}
                        disabled={busy || !inviteEmail.trim()}
                        className="px-3 rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: inviteEmail.trim() ? theme.primary : theme.surface,
                        }}>
                        {busy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: inviteEmail.trim() ? '#fff' : theme.textSubtle }}>
                            Send
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Member / invite list */}
                {spaceInvites(space.id).length > 0 && (
                  <View
                    style={{ borderTopWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 }}>
                    {spaceInvites(space.id).map((m) => {
                      const statusColor =
                        m.status === 'accepted'
                          ? '#16a34a'
                          : m.status === 'pending'
                            ? '#d97706'
                            : theme.textSubtle;
                      return (
                        <View
                          key={m.id}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text className="text-xs flex-1 mr-2" style={{ color: theme.textMuted }} numberOfLines={1}>
                            {m.invitedEmail}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="text-xs font-medium capitalize" style={{ color: statusColor }}>
                              {m.status}
                            </Text>
                            {currentUserId === space.ownerId && (
                              <TouchableOpacity
                                onPress={() => handleRemoveMember(m.id)}
                                disabled={busy}
                                testID={`remove-member-${m.id}`}>
                                <Ionicons name="close-circle-outline" size={16} color={theme.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            {spaces.length === 0 && (
              <Text className="text-sm text-center mt-4" style={{ color: theme.textSubtle }}>
                No spaces yet. Create one to share tasks and finances.
              </Text>
            )}
          </View>
        )}

        {/* ---- INVITES TAB ---- */}
        {tab === 'invites' && (
          <View>
            <Text className="text-sm font-medium mb-3" style={{ color: theme.textMuted }}>
              Pending invitations
            </Text>
            {pendingInvites.length === 0 && (
              <Text className="text-sm text-center mt-4" style={{ color: theme.textSubtle }}>
                No pending invitations.
              </Text>
            )}
            {pendingInvites.map((invite) => (
              <View
                key={invite.memberId}
                className="rounded-xl px-3 py-3 mb-2"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: 1,
                }}>
                <Text className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
                  {invite.name}
                </Text>
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => handleRespond(invite.memberId, invite.id, true)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{ backgroundColor: theme.primary }}>
                    <Text className="text-xs font-semibold text-white">Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRespond(invite.memberId, invite.id, false)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderWidth: 1,
                    }}>
                    <Text className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---- CREATE TAB ---- */}
        {tab === 'create' && (
          <View>
            <Text className="text-sm font-medium mb-3" style={{ color: theme.textMuted }}>
              Create a new space
            </Text>
            <TextInput
              value={newSpaceName}
              onChangeText={setNewSpaceName}
              placeholder="e.g. Family, Work Team…"
              placeholderTextColor={theme.textSubtle}
              className="rounded-xl px-4 py-3 text-base mb-3"
              style={{
                borderColor: theme.border,
                borderWidth: 1,
                backgroundColor: theme.surface,
                color: theme.text,
              }}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={busy || !newSpaceName.trim()}
              className="py-3 rounded-xl items-center"
              style={{
                backgroundColor: newSpaceName.trim() ? theme.primary : theme.surface,
                borderWidth: newSpaceName.trim() ? 0 : 1,
                borderColor: theme.border,
              }}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className="font-semibold"
                  style={{ color: newSpaceName.trim() ? '#fff' : theme.textSubtle }}>
                  Create Space
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
