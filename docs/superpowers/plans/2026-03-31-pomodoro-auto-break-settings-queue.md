# Pomodoro: Auto-Break, Timer Settings, and Bulk Task Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a focus session ends the break starts automatically; users can customize focus/break durations via a settings modal; users can queue multiple tasks and run them hands-free.

**Architecture:** All timer and queue logic lives in `pomodoroStore.ts` (the single source of truth). `completeCycle()` is extended to auto-start the break after work, and to advance the task queue after a break. Two new components (`TimerSettings`, `TaskQueue`) are wired into the existing `pomodoro.tsx` screen — `TimerSettings` opens from a gear icon in the header, `TaskQueue` is a new "Bulk tasks" section added below the existing "Link to task" picker.

**Tech Stack:** Zustand, React Native, NativeWind (Tailwind className), `react-native-reanimated`, `@expo/vector-icons/Ionicons`, Jest + `@testing-library/react-native`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Modify** | `src/stores/pomodoroStore.ts` | Auto-transition logic, `taskQueue`, `setTaskQueue`, `startQueue` |
| **Modify** | `src/stores/__tests__/pomodoroStore.test.ts` | Update existing test + add new ones |
| **Create** | `src/components/pomodoro/TimerSettings.tsx` | Modal for customising focus/break durations |
| **Create** | `src/components/pomodoro/__tests__/TimerSettings.test.tsx` | Unit tests for TimerSettings |
| **Create** | `src/components/pomodoro/TaskQueue.tsx` | Bulk task queue builder + Start button |
| **Create** | `src/components/pomodoro/__tests__/TaskQueue.test.tsx` | Unit tests for TaskQueue |
| **Modify** | `app/(tabs)/pomodoro.tsx` | Settings gear in header, TaskQueue section |
| **Modify** | `app/(tabs)/__tests__/pomodoro.test.tsx` | Test settings button + TaskQueue section |

---

## Task 1: pomodoroStore — auto-transition + task queue

**Files:**
- Modify: `src/stores/pomodoroStore.ts`
- Modify: `src/stores/__tests__/pomodoroStore.test.ts`

### Step 1 — Update failing test

- [ ] **Step 1: Update the existing completion test and add new ones**

Open `src/stores/__tests__/pomodoroStore.test.ts`.

**1a.** Add `taskQueue: []` to `INITIAL_STATE` (line 10–20):

```typescript
const INITIAL_STATE = {
  sessions: [],
  workDuration: 25,
  breakDuration: 5,
  status: 'idle' as const,
  phase: 'work' as const,
  secondsRemaining: 25 * 60,
  cycleCount: 0,
  selectedTaskId: null,
  cycleStartedAt: null,
  taskQueue: [],
};
```

**1b.** The existing test `'keeps ticking while running and completes at zero with notification'` (inside `describe('global timer runtime')`) currently asserts `status === 'idle'` after work ends. Change line 50 to assert `'running'` (break auto-starts) and `phase === 'break'`:

```typescript
it('keeps ticking while running and completes at zero with notification', () => {
  usePomodoroStore.getState().start();
  usePomodoroStore.setState({ secondsRemaining: 2 });

  jest.advanceTimersByTime(1000);
  expect(usePomodoroStore.getState().secondsRemaining).toBe(1);
  expect(usePomodoroStore.getState().status).toBe('running');

  jest.advanceTimersByTime(1000);
  const state = usePomodoroStore.getState();
  expect(state.status).toBe('running');     // break auto-starts
  expect(state.phase).toBe('break');
  expect(state.secondsRemaining).toBe(state.breakDuration * 60);
  expect(state.sessions).toHaveLength(1);
  expect(scheduleTimerEndNotification).toHaveBeenCalledWith('work');
});
```

**1c.** At the end of `describe('pomodoroStore')` (before the final `}`), add a new `describe` block:

```typescript
describe('auto-transition', () => {
  it('completeCycle: work phase → status running, phase break', () => {
    usePomodoroStore.setState({ phase: 'work', cycleStartedAt: Date.now() });
    usePomodoroStore.getState().completeCycle();
    const s = usePomodoroStore.getState();
    expect(s.phase).toBe('break');
    expect(s.status).toBe('running');
    expect(s.secondsRemaining).toBe(5 * 60);
    expect(s.cycleCount).toBe(1);
  });

  it('completeCycle: break phase with empty queue → status idle, phase work', () => {
    usePomodoroStore.setState({ phase: 'break', cycleStartedAt: Date.now(), taskQueue: [] });
    usePomodoroStore.getState().completeCycle();
    const s = usePomodoroStore.getState();
    expect(s.phase).toBe('work');
    expect(s.status).toBe('idle');
    expect(s.secondsRemaining).toBe(25 * 60);
  });

  it('completeCycle: break phase with queue → advances to next task, status running', () => {
    usePomodoroStore.setState({
      phase: 'break',
      cycleStartedAt: Date.now(),
      taskQueue: ['task-b', 'task-c'],
      selectedTaskId: 'task-a',
    });
    usePomodoroStore.getState().completeCycle();
    const s = usePomodoroStore.getState();
    expect(s.phase).toBe('work');
    expect(s.status).toBe('running');
    expect(s.selectedTaskId).toBe('task-b');
    expect(s.taskQueue).toEqual(['task-c']);
    expect(s.secondsRemaining).toBe(25 * 60);
  });

  it('completeCycle: break phase with single-item queue → queue empty after advance', () => {
    usePomodoroStore.setState({
      phase: 'break',
      cycleStartedAt: Date.now(),
      taskQueue: ['task-b'],
      selectedTaskId: 'task-a',
    });
    usePomodoroStore.getState().completeCycle();
    const s = usePomodoroStore.getState();
    expect(s.selectedTaskId).toBe('task-b');
    expect(s.taskQueue).toEqual([]);
    expect(s.status).toBe('running');
  });
});

describe('task queue', () => {
  it('setTaskQueue replaces the queue', () => {
    usePomodoroStore.getState().setTaskQueue(['t1', 't2']);
    expect(usePomodoroStore.getState().taskQueue).toEqual(['t1', 't2']);
  });

  it('startQueue sets selectedTaskId to first, taskQueue to rest, and starts timer', () => {
    usePomodoroStore.getState().startQueue(['t1', 't2', 't3']);
    const s = usePomodoroStore.getState();
    expect(s.selectedTaskId).toBe('t1');
    expect(s.taskQueue).toEqual(['t2', 't3']);
    expect(s.status).toBe('running');
    expect(s.phase).toBe('work');
    expect(s.secondsRemaining).toBe(25 * 60);
  });

  it('startQueue does nothing when given empty array', () => {
    usePomodoroStore.getState().startQueue([]);
    expect(usePomodoroStore.getState().status).toBe('idle');
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
pnpm jest --testPathPattern="pomodoroStore" 2>&1 | tail -20
```

Expected: several failures — `taskQueue` not in state, `completeCycle` still sets `status: 'idle'` for work, `setTaskQueue` and `startQueue` not found.

### Step 3 — Implement the store changes

- [ ] **Step 3: Replace pomodoroStore.ts with the updated version**

Open `src/stores/pomodoroStore.ts`. Make the following changes:

**3a.** Extend the `PomodoroStore` interface (replace the existing interface block):

```typescript
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
```

**3b.** Add `taskQueue: []` to the initial state (after `cycleStartedAt: null`):

```typescript
taskQueue: [],
```

**3c.** Replace the `completeCycle` method with:

```typescript
completeCycle: () => {
  stopPomodoroInterval();
  const { phase, workDuration, breakDuration, cycleCount, selectedTaskId, cycleStartedAt, taskQueue } =
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
```

**3d.** Add the two new actions after `updateDurations` (before `reconcileRunningTimer`):

```typescript
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
```

**3e.** Add `taskQueue` to `partialize` (after `cycleStartedAt`):

```typescript
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
  taskQueue: s.taskQueue,
}),
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest --testPathPattern="pomodoroStore" 2>&1 | tail -15
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/pomodoroStore.ts src/stores/__tests__/pomodoroStore.test.ts
git commit -m "feat(pomodoro): auto-start break after focus, add task queue to store"
```

---

## Task 2: TimerSettings component

**Files:**
- Create: `src/components/pomodoro/TimerSettings.tsx`
- Create: `src/components/pomodoro/__tests__/TimerSettings.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/pomodoro/__tests__/TimerSettings.test.tsx`:

```typescript
import { fireEvent, render } from '@testing-library/react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { TimerSettings } from '../TimerSettings';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
  }),
}));

jest.mock('@/stores/pomodoroStore', () => {
  const mockUpdateDurations = jest.fn();
  return {
    usePomodoroStore: jest.fn((selector) =>
      selector({
        workDuration: 25,
        breakDuration: 5,
        updateDurations: mockUpdateDurations,
      })
    ),
    _mockUpdateDurations: mockUpdateDurations,
  };
});

jest.mock('@/components/ui/Modal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Modal: ({
      visible,
      children,
    }: {
      visible: boolean;
      onClose: () => void;
      title: string;
      children: React.ReactNode;
    }) => (visible ? React.createElement(View, { testID: 'modal' }, children) : null),
  };
});

function getUpdateDurationsMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jest.requireMock('@/stores/pomodoroStore') as any)._mockUpdateDurations as jest.Mock;
}

describe('TimerSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders focus and break inputs with current durations', () => {
    const { getByDisplayValue } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    expect(getByDisplayValue('25')).toBeTruthy();
    expect(getByDisplayValue('5')).toBeTruthy();
  });

  it('calls updateDurations with parsed values when Save is pressed', () => {
    const onClose = jest.fn();
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={onClose} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '30');
    fireEvent.changeText(getByDisplayValue('5'), '10');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(30, 10);
    expect(onClose).toHaveBeenCalled();
  });

  it('clamps focus input below 1 to 1', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '0');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(1, 5);
  });

  it('clamps focus input above 60 to 60', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '99');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(60, 5);
  });

  it('falls back to default focus value for non-numeric input', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), 'abc');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(25, 5);
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(
      <TimerSettings visible={false} onClose={jest.fn()} />
    );
    expect(queryByTestId('modal')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="TimerSettings" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../TimerSettings'`

- [ ] **Step 3: Implement TimerSettings**

Create `src/components/pomodoro/TimerSettings.tsx`:

```tsx
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TimerSettings({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { workDuration, breakDuration, updateDurations } = usePomodoroStore((s) => ({
    workDuration: s.workDuration,
    breakDuration: s.breakDuration,
    updateDurations: s.updateDurations,
  }));

  const [focusInput, setFocusInput] = useState(String(workDuration));
  const [breakInput, setBreakInput] = useState(String(breakDuration));

  const handleSave = () => {
    const parsedFocus = parseInt(focusInput, 10);
    const parsedBreak = parseInt(breakInput, 10);
    const work = Number.isNaN(parsedFocus)
      ? workDuration
      : Math.min(60, Math.max(1, parsedFocus));
    const breakMins = Number.isNaN(parsedBreak)
      ? breakDuration
      : Math.min(60, Math.max(1, parsedBreak));
    updateDurations(work, breakMins);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Timer settings">
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium mb-1" style={{ color: theme.textMuted }}>
            Focus duration (minutes)
          </Text>
          <TextInput
            value={focusInput}
            onChangeText={setFocusInput}
            keyboardType="number-pad"
            className="rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.surface,
              color: theme.text,
            }}
          />
        </View>

        <View>
          <Text className="text-sm font-medium mb-1" style={{ color: theme.textMuted }}>
            Break duration (minutes)
          </Text>
          <TextInput
            value={breakInput}
            onChangeText={setBreakInput}
            keyboardType="number-pad"
            className="rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.surface,
              color: theme.text,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: theme.primary }}>
          <Text className="font-semibold text-white">Save</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest --testPathPattern="TimerSettings" 2>&1 | tail -10
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/pomodoro/TimerSettings.tsx src/components/pomodoro/__tests__/TimerSettings.test.tsx
git commit -m "feat(pomodoro): add TimerSettings component"
```

---

## Task 3: TaskQueue component

**Files:**
- Create: `src/components/pomodoro/TaskQueue.tsx`
- Create: `src/components/pomodoro/__tests__/TaskQueue.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/pomodoro/__tests__/TaskQueue.test.tsx`:

```typescript
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    primarySoft: '#E5F1FF',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
    danger: '#FF3B30',
  }),
}));

const mockSetTaskQueue = jest.fn();
const mockStartQueue = jest.fn();

let mockPomodoroState = {
  taskQueue: [] as string[],
  status: 'idle' as 'idle' | 'running' | 'paused',
  setTaskQueue: mockSetTaskQueue,
  startQueue: mockStartQueue,
};

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: typeof mockPomodoroState) => unknown) =>
    selector(mockPomodoroState),
}));

let mockTasks = [
  { id: 't1', title: 'Task One', completed: false },
  { id: 't2', title: 'Task Two', completed: false },
  { id: 't3', title: 'Task Three', completed: true }, // completed, should not appear
];

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: (selector: (s: { tasks: typeof mockTasks }) => unknown) =>
    selector({ tasks: mockTasks }),
}));

import { TaskQueue } from '../TaskQueue';

describe('TaskQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPomodoroState = {
      taskQueue: [],
      status: 'idle',
      setTaskQueue: mockSetTaskQueue,
      startQueue: mockStartQueue,
    };
    mockTasks = [
      { id: 't1', title: 'Task One', completed: false },
      { id: 't2', title: 'Task Two', completed: false },
      { id: 't3', title: 'Task Three', completed: true },
    ];
  });

  it('renders only active (non-completed) tasks', () => {
    const { getByText, queryByText } = render(<TaskQueue />);
    expect(getByText('Task One')).toBeTruthy();
    expect(getByText('Task Two')).toBeTruthy();
    expect(queryByText('Task Three')).toBeNull();
  });

  it('tapping a task adds it to the queue', () => {
    const { getByText } = render(<TaskQueue />);
    fireEvent.press(getByText('Task One'));
    expect(mockSetTaskQueue).toHaveBeenCalledWith(['t1']);
  });

  it('tapping a queued task removes it from the queue', () => {
    mockPomodoroState = { ...mockPomodoroState, taskQueue: ['t1', 't2'] };
    const { getByText } = render(<TaskQueue />);
    fireEvent.press(getByText('Task One'));
    expect(mockSetTaskQueue).toHaveBeenCalledWith(['t2']);
  });

  it('shows queued tasks with numbered labels', () => {
    mockPomodoroState = { ...mockPomodoroState, taskQueue: ['t1', 't2'] };
    const { getByText } = render(<TaskQueue />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('Start button calls startQueue with the current queue', () => {
    mockPomodoroState = { ...mockPomodoroState, taskQueue: ['t1', 't2'] };
    const { getByText } = render(<TaskQueue />);
    fireEvent.press(getByText('Start queue'));
    expect(mockStartQueue).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('Start button is disabled when queue is empty', () => {
    const { getByText } = render(<TaskQueue />);
    fireEvent.press(getByText('Start queue'));
    expect(mockStartQueue).not.toHaveBeenCalled();
  });

  it('Start button is disabled when timer is running', () => {
    mockPomodoroState = { ...mockPomodoroState, taskQueue: ['t1'], status: 'running' };
    const { getByText } = render(<TaskQueue />);
    fireEvent.press(getByText('Start queue'));
    expect(mockStartQueue).not.toHaveBeenCalled();
  });

  it('shows "No active tasks" when all tasks are completed', () => {
    mockTasks = [{ id: 't3', title: 'Task Three', completed: true }];
    const { getByText } = render(<TaskQueue />);
    expect(getByText('No active tasks')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="TaskQueue" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../TaskQueue'`

- [ ] **Step 3: Implement TaskQueue**

Create `src/components/pomodoro/TaskQueue.tsx`:

```tsx
import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

export function TaskQueue() {
  const theme = useAppTheme();
  const { taskQueue, status, setTaskQueue, startQueue } = usePomodoroStore((s) => ({
    taskQueue: s.taskQueue,
    status: s.status,
    setTaskQueue: s.setTaskQueue,
    startQueue: s.startQueue,
  }));
  const tasks = useTaskStore((s) => s.tasks);
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const toggleTask = (id: string) => {
    if (taskQueue.includes(id)) {
      setTaskQueue(taskQueue.filter((qId) => qId !== id));
    } else {
      setTaskQueue([...taskQueue, id]);
    }
  };

  const canStart = taskQueue.length > 0 && status !== 'running';

  return (
    <View className="gap-3">
      {/* Task list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}>
        {activeTasks.map((task) => {
          const queueIndex = taskQueue.indexOf(task.id);
          const isQueued = queueIndex !== -1;
          return (
            <TouchableOpacity
              key={task.id}
              onPress={() => toggleTask(task.id)}
              className="px-3 py-2 rounded-full border flex-row items-center gap-1.5 max-w-44"
              style={{
                backgroundColor: isQueued ? theme.primary : theme.surface,
                borderColor: isQueued ? theme.primary : theme.border,
              }}>
              {isQueued && (
                <View
                  className="w-4 h-4 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  <Text className="text-xs font-bold text-white">{queueIndex + 1}</Text>
                </View>
              )}
              <Text
                className="text-sm font-medium"
                numberOfLines={1}
                style={{ color: isQueued ? '#fff' : theme.textMuted }}>
                {task.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        {activeTasks.length === 0 && (
          <View className="px-3 py-2">
            <Text className="text-sm" style={{ color: theme.textSubtle }}>
              No active tasks
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      <TouchableOpacity
        onPress={() => canStart && startQueue(taskQueue)}
        className="py-2.5 rounded-xl items-center"
        style={{
          backgroundColor: canStart ? theme.primary : theme.surfaceMuted,
          borderColor: theme.border,
          borderWidth: canStart ? 0 : 1,
        }}>
        <Text
          className="text-sm font-semibold"
          style={{ color: canStart ? '#fff' : theme.textSubtle }}>
          Start queue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest --testPathPattern="TaskQueue" 2>&1 | tail -10
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/pomodoro/TaskQueue.tsx src/components/pomodoro/__tests__/TaskQueue.test.tsx
git commit -m "feat(pomodoro): add TaskQueue component for bulk task runs"
```

---

## Task 4: Wire into pomodoro.tsx

**Files:**
- Modify: `app/(tabs)/pomodoro.tsx`
- Modify: `app/(tabs)/__tests__/pomodoro.test.tsx`

- [ ] **Step 1: Write failing screen tests**

Open `app/(tabs)/__tests__/pomodoro.test.tsx`.

Add the following two mocks near the other component mocks:

```typescript
jest.mock('@/components/pomodoro/TimerSettings', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    TimerSettings: ({ visible }: { visible: boolean; onClose: () => void }) =>
      visible ? React.createElement(View, { testID: 'mock-timer-settings' }) : null,
  };
});

jest.mock('@/components/pomodoro/TaskQueue', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    TaskQueue: () => React.createElement(View, { testID: 'mock-task-queue' }),
  };
});
```

At the end of the existing test file (before the final `}`), add:

```typescript
describe('timer settings', () => {
  it('renders a settings button in the header', () => {
    const { getByTestId } = render(<PomodoroScreen />);
    expect(getByTestId('timer-settings-btn')).toBeTruthy();
  });

  it('opens TimerSettings modal when settings button is pressed', () => {
    const { getByTestId } = render(<PomodoroScreen />);
    expect(getByTestId('mock-timer-settings')).toBeFalsy
      ? undefined
      : undefined; // not visible yet
    fireEvent.press(getByTestId('timer-settings-btn'));
    expect(getByTestId('mock-timer-settings')).toBeTruthy();
  });
});

describe('bulk tasks section', () => {
  it('renders the Bulk tasks section heading', () => {
    const { getByText } = render(<PomodoroScreen />);
    expect(getByText('Bulk tasks')).toBeTruthy();
  });

  it('renders the TaskQueue component', () => {
    const { getByTestId } = render(<PomodoroScreen />);
    expect(getByTestId('mock-task-queue')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="pomodoro.test" 2>&1 | tail -15
```

Expected: the new tests FAIL (no `timer-settings-btn` testID, no "Bulk tasks" heading, no TaskQueue in screen)

- [ ] **Step 3: Update pomodoro.tsx**

Open `app/(tabs)/pomodoro.tsx`. Make the following changes:

**3a.** Add imports at the top (alongside existing imports):

```typescript
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TaskQueue } from '@/components/pomodoro/TaskQueue';
import { TimerSettings } from '@/components/pomodoro/TimerSettings';
```

> Note: `useEffect` and `useRef` are already imported — add only the missing ones.

**3b.** Inside `PomodoroScreen`, after the existing state declarations, add:

```typescript
const [showSettings, setShowSettings] = useState(false);
```

**3c.** Replace the header `<View>` block (the one with `text-2xl font-bold` "Focus" title) with:

```tsx
<View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
  <Text className="text-2xl font-bold" style={{ color: theme.text }}>
    Focus
  </Text>
  <TouchableOpacity
    testID="timer-settings-btn"
    onPress={() => setShowSettings(true)}
    className="p-1">
    <Ionicons name="settings-outline" size={22} color={theme.textMuted} />
  </TouchableOpacity>
</View>
```

**3d.** Add a "Bulk tasks" section after the existing "Link to task" section (after `</View>` that closes the TaskPicker section, before the Session log section):

```tsx
<View className="px-4 mt-6">
  <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
    Bulk tasks
  </Text>
  <TaskQueue />
</View>
```

**3e.** Add the `TimerSettings` modal just before the closing `</SafeAreaView>` tag (alongside the confetti overlay):

```tsx
<TimerSettings visible={showSettings} onClose={() => setShowSettings(false)} />
```

**3f.** Add `TouchableOpacity` to the React Native import if not already present (it's used for the settings button). Check `import { ... } from 'react-native'` and add `TouchableOpacity` if missing.

- [ ] **Step 4: Run the full test suite**

```bash
pnpm jest --coverage 2>&1 | tail -15
```

Expected: all tests PASS (690+ tests)

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/pomodoro.tsx app/(tabs)/__tests__/pomodoro.test.tsx
git commit -m "feat(pomodoro): wire TimerSettings and TaskQueue into Focus screen"
```

---

## Task 5: Branch, push, and open PR

- [ ] **Step 1: Create the feature branch from main (or check current branch)**

```bash
git checkout -b feat/issue-11-pomodoro-auto-break-settings-queue
```

> If commits were already made on a different branch, cherry-pick or rebase them onto this new branch before pushing.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/issue-11-pomodoro-auto-break-settings-queue
gh pr create \
  --title "✨ feat(pomodoro): auto-break, timer settings, and bulk task queue" \
  --body "Closes #11

## Summary

- ⏱️ Focus session ending **automatically starts the break** — no tap required
- ⚙️ **Timer settings** modal (gear icon in header) to customise focus/break duration (1–60 min)
- 📋 **Bulk task queue** — tap tasks to queue them in order, press Start queue to run hands-free; timer advances through all tasks automatically
- Break ending with an active queue **auto-starts the next task's focus session**" \
  --base main
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Focus session → break auto-starts | Task 1: `completeCycle` work branch |
| Break → idle when no queue | Task 1: `completeCycle` break branch (empty queue) |
| Settings modal for duration customisation | Tasks 2 + 4 |
| Duration clamped 1–60 | Task 2: `handleSave` |
| Bulk task queue — add/remove tasks | Task 3: `toggleTask` |
| Numbered queue order | Task 3: `queueIndex + 1` badge |
| Start queue begins first task, advances on break end | Task 1: `startQueue` + `completeCycle` break branch |
| Start queue disabled when timer running | Task 3: `canStart` guard |
| All behaviour covered by tests | Tasks 1–4 |

### Placeholder scan

None found — every step contains complete code.

### Type consistency

- `taskQueue: string[]` defined in Task 1 interface, initialised in Task 1 state, used identically in Tasks 3 and 4.
- `setTaskQueue(ids: string[])` and `startQueue(taskIds: string[])` defined in Task 1 and called identically in Task 3.
- `TimerSettings` props `{ visible: boolean; onClose: () => void }` defined in Task 2 and used identically in Task 4.
- `TaskQueue` is a zero-prop component in Task 3, used as `<TaskQueue />` in Task 4.
