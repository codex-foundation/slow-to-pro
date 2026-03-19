import { supabase } from '@/lib/supabase';
import { useFinanceStore } from '@/stores/financeStore';
import type { Space, SpaceMember } from '@/stores/spaceStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useTaskStore } from '@/stores/taskStore';

// Set to true while pullSharedSpace is running so store subscriptions
// don't trigger a push of the intermediate cleared/loading state.
export let isApplyingSpaceSnapshot = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSpace(row: Record<string, unknown>): Space {
  return {
    id: row.id as string,
    name: row.name as string,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
  };
}

function toMember(row: Record<string, unknown>): SpaceMember {
  return {
    id: row.id as string,
    spaceId: row.space_id as string,
    userId: row.user_id as string | null,
    invitedEmail: row.invited_email as string,
    role: row.role as 'owner' | 'member',
    status: row.status as 'pending' | 'accepted' | 'declined',
    invitedAt: row.invited_at as string,
    acceptedAt: row.accepted_at as string | null,
  };
}

// ---------------------------------------------------------------------------
// Load spaces + pending invites for current user
// ---------------------------------------------------------------------------

export async function loadSpaces(): Promise<void> {
  if (!supabase) return;
  const store = useSpaceStore.getState();
  store.setLoading(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: ownedSpaces }, { data: memberRows }, { data: pendingRows }] = await Promise.all([
      // Spaces the user owns
      supabase.from('spaces').select('*').eq('owner_id', user.id),
      // Spaces the user is an accepted member of
      supabase.from('space_members').select('space_id, spaces(*)').eq('user_id', user.id).eq('status', 'accepted'),
      // Pending invites (by email)
      supabase.from('space_members').select('id, space_id, spaces(*)').eq('invited_email', user.email ?? '').eq('status', 'pending'),
    ]);

    const owned: Space[] = (ownedSpaces ?? []).map(toSpace);
    const joined: Space[] = ((memberRows ?? []) as unknown[])
      .map((r) => {
        const row = r as { spaces: unknown };
        return row.spaces ? toSpace(row.spaces as Record<string, unknown>) : null;
      })
      .filter(Boolean) as Space[];

    const pending = ((pendingRows ?? []) as unknown[])
      .map((r) => {
        const row = r as { id: string; spaces: unknown };
        if (!row.spaces) return null;
        return { ...toSpace(row.spaces as Record<string, unknown>), memberId: row.id };
      })
      .filter(Boolean) as (Space & { memberId: string })[];

    const allSpaces = [...owned, ...joined.filter((j) => !owned.find((o) => o.id === j.id))];

    store.setSpaces(allSpaces);
    store.setPendingInvites(pending);

    // Load members for all spaces
    if (allSpaces.length > 0) {
      const { data: membersData } = await supabase
        .from('space_members')
        .select('*')
        .in(
          'space_id',
          allSpaces.map((s) => s.id)
        );
      store.setMembers((membersData ?? []).map(toMember));
    }
  } finally {
    store.setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Create a new space
// ---------------------------------------------------------------------------

export async function createSpace(name: string): Promise<{ space: Space | null; error?: string }> {
  if (!supabase) return { space: null, error: 'Supabase not configured' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { space: null, error: 'You must be logged in to create a space' };

  const { data, error } = await supabase
    .from('spaces')
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (error || !data) return { space: null, error: error?.message ?? 'Failed to create space' };

  const space = toSpace(data as Record<string, unknown>);

  // Add owner as member row too (makes queries uniform)
  await supabase.from('space_members').insert({
    space_id: space.id,
    user_id: user.id,
    invited_email: user.email ?? '',
    role: 'owner',
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });

  const store = useSpaceStore.getState();
  store.setSpaces([...store.spaces, space]);
  return { space };
}

// ---------------------------------------------------------------------------
// Invite a member by email
// ---------------------------------------------------------------------------

export async function inviteMember(spaceId: string, email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Not configured' };

  const { error } = await supabase.from('space_members').insert({
    space_id: spaceId,
    invited_email: email.toLowerCase().trim(),
    role: 'member',
    status: 'pending',
  });

  if (error) return { error: error.message };
  await loadSpaces();
  return {};
}

// ---------------------------------------------------------------------------
// Accept / decline an invite
// ---------------------------------------------------------------------------

export async function respondToInvite(
  memberId: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('space_members')
    .update({
      status: response,
      user_id: user.id,
      accepted_at: response === 'accepted' ? new Date().toISOString() : null,
    })
    .eq('id', memberId);

  await loadSpaces();

  if (response === 'accepted') {
    // Pull the space's shared data into local stores
    const store = useSpaceStore.getState();
    const invite = store.pendingInvites.find((i) => i.memberId === memberId);
    if (invite) await pullSharedSpace(invite.id);
  }
}

// ---------------------------------------------------------------------------
// Push local data to the active shared space
// ---------------------------------------------------------------------------

export async function pushToSharedSpace(spaceId: string): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const financeState = useFinanceStore.getState();
  const taskState = useTaskStore.getState();

  await Promise.all([
    supabase.from('space_finance_snapshots').upsert(
      {
        space_id: spaceId,
        data: {
          categories: financeState.categories,
          budgets: financeState.budgets,
          expenses: financeState.expenses,
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'space_id' }
    ),
    supabase.from('space_task_snapshots').upsert(
      {
        space_id: spaceId,
        data: { tasks: taskState.tasks, categories: taskState.categories },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'space_id' }
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Pull shared space data into local stores
// ---------------------------------------------------------------------------

export async function pullSharedSpace(spaceId: string): Promise<void> {
  if (!supabase) return;

  isApplyingSpaceSnapshot = true;
  try {
    const [{ data: finData }, { data: taskData }] = await Promise.all([
      supabase.from('space_finance_snapshots').select('data').eq('space_id', spaceId).single(),
      supabase.from('space_task_snapshots').select('data').eq('space_id', spaceId).single(),
    ]);

    // Always reset store slices so personal data never bleeds into a space view.
    // If the space has existing data, it will be applied below.
    useFinanceStore.setState((s) => ({
      ...s,
      categories: [],
      budgets: [],
      expenses: [],
    }));
    useTaskStore.setState((s) => ({ ...s, tasks: [], categories: [] }));

    if (finData?.data) {
      const d = finData.data as {
        categories?: unknown[];
        budgets?: unknown[];
        expenses?: unknown[];
      };
      useFinanceStore.setState((s) => ({
        ...s,
        categories: (d.categories as typeof s.categories) ?? s.categories,
        budgets: (d.budgets as typeof s.budgets) ?? s.budgets,
        expenses: (d.expenses as typeof s.expenses) ?? s.expenses,
      }));
    }

    if (taskData?.data) {
      const d = taskData.data as { tasks?: unknown[]; categories?: unknown[] };
      useTaskStore.setState((s) => ({
        ...s,
        tasks: (d.tasks as typeof s.tasks) ?? s.tasks,
        categories: (d.categories as typeof s.categories) ?? [],
      }));
    } else {
      useTaskStore.setState((s) => ({ ...s, categories: [] }));
    }
  } finally {
    isApplyingSpaceSnapshot = false;
  }
}

// ---------------------------------------------------------------------------
// Leave a space (member removes themselves)
// ---------------------------------------------------------------------------

export async function leaveSpace(spaceId: string): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('space_members').delete().eq('space_id', spaceId).eq('user_id', user.id);

  const store = useSpaceStore.getState();
  store.setSpaces(store.spaces.filter((s) => s.id !== spaceId));
  store.setMembers(store.members.filter((m) => m.spaceId !== spaceId));
  if (store.activeSpaceId === spaceId) store.setActiveSpaceId(null);
}

// ---------------------------------------------------------------------------
// Delete a space (owner only — cascade removes members + snapshots)
// ---------------------------------------------------------------------------

export async function deleteSpace(spaceId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('spaces').delete().eq('id', spaceId);

  const store = useSpaceStore.getState();
  store.setSpaces(store.spaces.filter((s) => s.id !== spaceId));
  store.setMembers(store.members.filter((m) => m.spaceId !== spaceId));
  if (store.activeSpaceId === spaceId) store.setActiveSpaceId(null);
}

// ---------------------------------------------------------------------------
// Remove a member (owner only)
// ---------------------------------------------------------------------------

export async function removeMember(memberId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('space_members').delete().eq('id', memberId);
  await loadSpaces();
}
