import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PomodoroSession, TimerPhase, TimerStatus } from '@/models/pomodoro';
import { generateId } from '@/utils/id';
import { mmkvStorage } from '@/utils/mmkv';
import { scheduleTimerEndNotification } from '@/utils/notifications';
import { useTaskStore } from './taskStore';

let pomodoroInterval: ReturnType<typeof setInterval> | null = null;

const stopPomodoroInterval = () => {
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
};

const ensurePomodoroInterval = () => {
  if (pomodoroInterval) return;

  pomodoroInterval = setInterval(() => {
    const state = usePomodoroStore.getState();
    if (state.status !== 'running') {
      stopPomodoroInterval();
      return;
    }

    if (state.secondsRemaining <= 1) {
      stopPomodoroInterval();
      state.completeCycle();
      return;
    }

    state.tick();
  }, 1000);
};

interface PomodoroStore {
  // Persisted
  sessions: PomodoroSession[];
  workDuration: number; // minutes
  breakDuration: number; // minutes

  // Runtime (not persisted)
  status: TimerStatus;
  phase: TimerPhase;
  secondsRemaining: number;
  cycleCount: number;
  selectedTaskId: string | null;
  cycleStartedAt: number | null;
  taskQueue: string[]; // task IDs queued after current selectedTaskId

  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  completeCycle: () => void;
  setSelectedTask: (id: string | null) => void;
  startWorkForTask: (id: string | null) => void;
  updateDurations: (work: number, breakMins: number) => void;
  reconcileRunningTimer: () => void;
  setTaskQueue: (ids: string[]) => void;
  startQueue: (taskIds: string[]) => void;
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      workDuration: 25,
      breakDuration: 5,

      status: 'idle',
      phase: 'work',
      secondsRemaining: 25 * 60,
      cycleCount: 0,
      selectedTaskId: null,
      cycleStartedAt: null,
      taskQueue: [],

      start: () => {
        const { status, phase, workDuration, breakDuration, secondsRemaining } = get();
        const duration = phase === 'work' ? workDuration : breakDuration;
        if (status === 'idle') {
          set({ status: 'running', secondsRemaining: duration * 60, cycleStartedAt: Date.now() });
        } else {
          const durationSeconds = duration * 60;
          const elapsedSeconds = Math.max(0, durationSeconds - secondsRemaining);
          set({
            status: 'running',
            cycleStartedAt: Date.now() - elapsedSeconds * 1000,
          });
        }
        ensurePomodoroInterval();
      },

      pause: () => {
        set({ status: 'paused', cycleStartedAt: null });
        stopPomodoroInterval();
      },

      reset: () => {
        const { phase, workDuration, breakDuration } = get();
        const duration = phase === 'work' ? workDuration : breakDuration;
        set({ status: 'idle', secondsRemaining: duration * 60, cycleStartedAt: null });
        stopPomodoroInterval();
      },

      tick: () => set((s) => ({ secondsRemaining: s.secondsRemaining - 1 })),

      completeCycle: () => {
        stopPomodoroInterval();
        const { phase, workDuration, breakDuration, cycleCount, selectedTaskId, cycleStartedAt, taskQueue } =
          get();

        const taskTitle = selectedTaskId
          ? useTaskStore.getState().tasks.find((t) => t.id === selectedTaskId)?.title
          : undefined;
        const session: PomodoroSession = {
          id: generateId(),
          taskId: selectedTaskId ?? undefined,
          taskTitle,
          phase,
          durationMinutes: phase === 'work' ? workDuration : breakDuration,
          startedAt:
            cycleStartedAt ??
            Date.now() - (phase === 'work' ? workDuration : breakDuration) * 60 * 1000,
          endedAt: Date.now(),
        };

        scheduleTimerEndNotification(phase);

        if (phase === 'work') {
          // After focus: auto-start the break
          set((s) => ({
            sessions: [session, ...s.sessions].slice(0, 50),
            phase: 'break',
            status: 'running',
            secondsRemaining: breakDuration * 60,
            cycleCount: cycleCount + 1,
            cycleStartedAt: Date.now(),
          }));
          ensurePomodoroInterval();
        } else {
          // After break: advance queue or go idle
          if (taskQueue.length > 0) {
            const [nextTaskId, ...remainingQueue] = taskQueue;
            set((s) => ({
              sessions: [session, ...s.sessions].slice(0, 50),
              phase: 'work',
              status: 'running',
              secondsRemaining: workDuration * 60,
              cycleCount,
              cycleStartedAt: Date.now(),
              selectedTaskId: nextTaskId,
              taskQueue: remainingQueue,
            }));
            ensurePomodoroInterval();
          } else {
            set((s) => ({
              sessions: [session, ...s.sessions].slice(0, 50),
              phase: 'work',
              status: 'idle',
              secondsRemaining: workDuration * 60,
              cycleCount,
              cycleStartedAt: null,
            }));
          }
        }
      },

      setSelectedTask: (id) => set({ selectedTaskId: id }),

      startWorkForTask: (id) => {
        const { workDuration } = get();
        set({
          selectedTaskId: id,
          phase: 'work',
          status: 'running',
          secondsRemaining: workDuration * 60,
          cycleStartedAt: Date.now(),
        });
        ensurePomodoroInterval();
      },

      updateDurations: (work, breakMins) => {
        set((s) => ({
          workDuration: work,
          breakDuration: breakMins,
          secondsRemaining: s.phase === 'work' ? work * 60 : breakMins * 60,
          status: 'idle',
        }));
        stopPomodoroInterval();
      },

      setTaskQueue: (ids) => set({ taskQueue: ids }),

      startQueue: (taskIds) => {
        if (taskIds.length === 0) return;
        const [first, ...rest] = taskIds;
        const { workDuration } = get();
        set({
          selectedTaskId: first,
          taskQueue: rest,
          phase: 'work',
          status: 'running',
          secondsRemaining: workDuration * 60,
          cycleStartedAt: Date.now(),
        });
        ensurePomodoroInterval();
      },

      reconcileRunningTimer: () => {
        const { status, phase, workDuration, breakDuration, secondsRemaining, cycleStartedAt } =
          get();

        if (status !== 'running') {
          stopPomodoroInterval();
          return;
        }

        const durationSeconds = (phase === 'work' ? workDuration : breakDuration) * 60;
        const startedAt =
          cycleStartedAt ?? Date.now() - Math.max(0, durationSeconds - secondsRemaining) * 1000;
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        const nextRemaining = durationSeconds - elapsedSeconds;

        if (nextRemaining <= 0) {
          set({ cycleStartedAt: startedAt, secondsRemaining: 0 });
          get().completeCycle();
          return;
        }

        set({
          cycleStartedAt: startedAt,
          secondsRemaining: nextRemaining,
          status: 'running',
        });
        ensurePomodoroInterval();
      },
    }),
    {
      name: 'pomodoro-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        workDuration: s.workDuration,
        breakDuration: s.breakDuration,
        status: s.status,
        phase: s.phase,
        secondsRemaining: s.secondsRemaining,
        cycleCount: s.cycleCount,
        selectedTaskId: s.selectedTaskId,
        cycleStartedAt: s.cycleStartedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.reconcileRunningTimer();
      },
    }
  )
);
