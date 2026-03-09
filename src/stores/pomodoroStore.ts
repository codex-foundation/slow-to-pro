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

  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  completeCycle: () => void;
  setSelectedTask: (id: string | null) => void;
  startWorkForTask: (id: string | null) => void;
  updateDurations: (work: number, breakMins: number) => void;
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

      start: () => {
        const { status, phase, workDuration, breakDuration } = get();
        const duration = phase === 'work' ? workDuration : breakDuration;
        if (status === 'idle') {
          set({ status: 'running', secondsRemaining: duration * 60, cycleStartedAt: Date.now() });
        } else {
          set({ status: 'running' });
        }
        ensurePomodoroInterval();
      },

      pause: () => {
        set({ status: 'paused' });
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
        const { phase, workDuration, breakDuration, cycleCount, selectedTaskId, cycleStartedAt } =
          get();

        // Log the completed session
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

        const nextPhase: TimerPhase = phase === 'work' ? 'break' : 'work';
        const nextDuration = nextPhase === 'work' ? workDuration : breakDuration;

        scheduleTimerEndNotification(phase);

        set((s) => ({
          sessions: [session, ...s.sessions].slice(0, 50),
          phase: nextPhase,
          status: 'idle',
          secondsRemaining: nextDuration * 60,
          cycleCount: phase === 'work' ? cycleCount + 1 : cycleCount,
          cycleStartedAt: null,
        }));
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
    }),
    {
      name: 'pomodoro-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        workDuration: s.workDuration,
        breakDuration: s.breakDuration,
      }),
    }
  )
);
