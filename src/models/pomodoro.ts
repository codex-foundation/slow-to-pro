export type TimerPhase = 'work' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  phase: TimerPhase;
  durationMinutes: number;
  startedAt: number;
  endedAt: number;
}
