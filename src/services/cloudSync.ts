import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTaskStore } from '@/stores/taskStore';
import { CLOUD_SYNC_TABLE, supabase } from '@/lib/supabase';

export interface AppSnapshot {
  taskStore: {
    tasks: ReturnType<typeof useTaskStore.getState>['tasks'];
    lastResetDate: string;
  };
  financeStore: Pick<
    ReturnType<typeof useFinanceStore.getState>,
    | 'categories'
    | 'budgets'
    | 'expenses'
    | 'notifiedBudgetThresholdByKey'
    | 'overallBudgetAmount'
    | 'overallBudgetPeriod'
  >;
  pomodoroStore: Pick<
    ReturnType<typeof usePomodoroStore.getState>,
    | 'sessions'
    | 'workDuration'
    | 'breakDuration'
    | 'status'
    | 'phase'
    | 'secondsRemaining'
    | 'cycleCount'
    | 'selectedTaskId'
    | 'cycleStartedAt'
  >;
  settingsStore: {
    themePreference: ReturnType<typeof useSettingsStore.getState>['themePreference'];
  };
  updatedAt: string;
}

export function getLocalSnapshot(): AppSnapshot {
  const taskStore = useTaskStore.getState();
  const financeStore = useFinanceStore.getState();
  const pomodoroStore = usePomodoroStore.getState();
  const settingsStore = useSettingsStore.getState();

  return {
    taskStore: {
      tasks: taskStore.tasks,
      lastResetDate: taskStore.lastResetDate,
    },
    financeStore: {
      categories: financeStore.categories,
      budgets: financeStore.budgets,
      expenses: financeStore.expenses,
      notifiedBudgetThresholdByKey: financeStore.notifiedBudgetThresholdByKey,
      overallBudgetAmount: financeStore.overallBudgetAmount,
      overallBudgetPeriod: financeStore.overallBudgetPeriod,
    },
    pomodoroStore: {
      sessions: pomodoroStore.sessions,
      workDuration: pomodoroStore.workDuration,
      breakDuration: pomodoroStore.breakDuration,
      status: pomodoroStore.status,
      phase: pomodoroStore.phase,
      secondsRemaining: pomodoroStore.secondsRemaining,
      cycleCount: pomodoroStore.cycleCount,
      selectedTaskId: pomodoroStore.selectedTaskId,
      cycleStartedAt: pomodoroStore.cycleStartedAt,
    },
    settingsStore: {
      themePreference: settingsStore.themePreference,
    },
    updatedAt: new Date().toISOString(),
  };
}

// Set to true while applySnapshot is running so store subscriptions
// don't trigger a redundant push of data we just pulled.
export let isApplyingSnapshot = false;

export function applySnapshot(snapshot: AppSnapshot) {
  isApplyingSnapshot = true;
  try {
    useTaskStore.setState({
      tasks: snapshot.taskStore.tasks,
      lastResetDate: snapshot.taskStore.lastResetDate,
    });

    useFinanceStore.setState({
      categories: snapshot.financeStore.categories,
      budgets: snapshot.financeStore.budgets,
      expenses: snapshot.financeStore.expenses,
      notifiedBudgetThresholdByKey: snapshot.financeStore.notifiedBudgetThresholdByKey,
      overallBudgetAmount: snapshot.financeStore.overallBudgetAmount,
      overallBudgetPeriod: snapshot.financeStore.overallBudgetPeriod,
    });

    usePomodoroStore.setState({
      sessions: snapshot.pomodoroStore.sessions,
      workDuration: snapshot.pomodoroStore.workDuration,
      breakDuration: snapshot.pomodoroStore.breakDuration,
      status: snapshot.pomodoroStore.status,
      phase: snapshot.pomodoroStore.phase,
      secondsRemaining: snapshot.pomodoroStore.secondsRemaining,
      cycleCount: snapshot.pomodoroStore.cycleCount,
      selectedTaskId: snapshot.pomodoroStore.selectedTaskId,
      cycleStartedAt: snapshot.pomodoroStore.cycleStartedAt,
    });

    useSettingsStore.setState({
      themePreference: snapshot.settingsStore.themePreference,
    });

    useTaskStore.getState().resetRecurringTasksIfNewDay();
    usePomodoroStore.getState().reconcileRunningTimer();
  } finally {
    isApplyingSnapshot = false;
  }
}

export async function pullCloudSnapshot(userId: string): Promise<AppSnapshot | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_* env values.');
  }

  const { data, error } = await supabase
    .from(CLOUD_SYNC_TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.data) return null;
  return data.data as AppSnapshot;
}

export async function pushCloudSnapshot(userId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_* env values.');
  }

  const snapshot = getLocalSnapshot();

  const { error } = await supabase.from(CLOUD_SYNC_TABLE).upsert(
    {
      user_id: userId,
      data: snapshot,
      updated_at: snapshot.updatedAt,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
}

export async function syncFromCloudOrSeed(userId: string): Promise<'pulled' | 'seeded'> {
  const remote = await pullCloudSnapshot(userId);
  if (remote) {
    applySnapshot(remote);
    return 'pulled';
  }

  await pushCloudSnapshot(userId);
  return 'seeded';
}

export async function pullForCurrentUser(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;

  const snapshot = await pullCloudSnapshot(data.user.id);
  if (!snapshot) return false;

  applySnapshot(snapshot);
  return true;
}

export async function pushForCurrentUser(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;

  await pushCloudSnapshot(data.user.id);
  return true;
}
