# Pomodoro: Fix Double Session Log, Auto-Mark Task Complete, Show Running Task — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three fixes/features to the pomodoro timer:
1. Break sessions incorrectly carry the same `taskId` as the preceding work session → tasks appear twice in the log.
2. When a focus session ends for a linked task, auto-mark the task as completed.
3. Show the currently-running task name inside the `TimerDisplay` during a work phase.

**Root cause (Bug 1):** In `completeCycle`, `PomodoroSession` is built from `selectedTaskId` unconditionally for both phases. Only work sessions should carry a `taskId`.

**Side effect (positive):** Auto-completing tasks makes them disappear from the `TaskQueue` picker (which already filters `activeTasks = tasks.filter(t => !t.completed)`), so bulk queue runs clean themselves up naturally.

**Branch:** `feat/issue-11-pomodoro-auto-break-settings-queue` (amend the PR already open)
OR create a new branch from main if PR #12 has already been merged.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Modify** | `src/stores/pomodoroStore.ts` | Fix `completeCycle`: no taskId on breaks, mark task done after work |
| **Modify** | `src/stores/__tests__/pomodoroStore.test.ts` | Add/update tests |
| **Modify** | `src/components/pomodoro/TimerDisplay.tsx` | Show running task name during work phase |
| **Create** | `src/components/pomodoro/__tests__/TimerDisplay.test.tsx` | Unit tests for TimerDisplay |

---

## Task 1: Fix `completeCycle` — no taskId on breaks, auto-complete task

**Files:**
- Modify: `src/stores/pomodoroStore.ts`
- Modify: `src/stores/__tests__/pomodoroStore.test.ts`

---

### Step 1: Update the test file first (TDD)

Open `src/stores/__tests__/pomodoroStore.test.ts`.

**1a.** In `describe('completeCycle')`, find the existing test `'links the active task in the session'` (line ~194). After it, add two new tests:

```typescript
it('does not log taskId on break sessions', () => {
  usePomodoroStore.setState({
    ...INITIAL_STATE,
    phase: 'break',
    selectedTaskId: 'task-abc',
    cycleStartedAt: Date.now(),
  });
  usePomodoroStore.getState().completeCycle();
  const session = usePomodoroStore.getState().sessions[0];
  expect(session.phase).toBe('break');
  expect(session.taskId).toBeUndefined();
  expect(session.taskTitle).toBeUndefined();
});

it('marks the linked task as completed after a work session', () => {
  const taskId = 'task-focus';
  useTaskStore.setState({
    tasks: [
      {
        id: taskId,
        title: 'Focus Task',
        completed: false,
        priority: 'medium' as const,
        order: 0,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
    ],
    lastResetDate: new Date().toISOString().slice(0, 10),
  });
  usePomodoroStore.setState({ ...INITIAL_STATE, selectedTaskId: taskId, phase: 'work', cycleStartedAt: Date.now() });
  usePomodoroStore.getState().completeCycle();
  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
  expect(task?.completed).toBe(true);
  expect(task?.completedAt).toBeDefined();
});
```

**1b.** In `describe('auto-transition')`, add a test that queue advancement also marks the task completed:

```typescript
it('completeCycle: work phase marks selectedTaskId task as completed', () => {
  const taskId = 'task-queue-item';
  useTaskStore.setState({
    tasks: [
      {
        id: taskId,
        title: 'Queue Task',
        completed: false,
        priority: 'medium' as const,
        order: 0,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
    ],
    lastResetDate: new Date().toISOString().slice(0, 10),
  });
  usePomodoroStore.setState({
    phase: 'work',
    cycleStartedAt: Date.now(),
    selectedTaskId: taskId,
    taskQueue: ['next-task'],
  });
  usePomodoroStore.getState().completeCycle();
  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
  expect(task?.completed).toBe(true);
});
```

---

### Step 2: Run tests to confirm failures

```bash
pnpm jest --testPathPattern="pomodoroStore" 2>&1 | tail -15
```

Expected: 3 new failures — `taskId` on break still set, task not marked completed.

---

### Step 3: Fix `completeCycle` in `src/stores/pomodoroStore.ts`

**3a.** Find the session construction block (around line 117–130):

```typescript
const taskTitle = selectedTaskId
  ? useTaskStore.getState().tasks.find((t) => t.id === selectedTaskId)?.title
  : undefined;
const session: PomodoroSession = {
  id: generateId(),
  taskId: selectedTaskId ?? undefined,
  taskTitle,
  phase,
  durationMinutes: phase === 'work' ? workDuration : breakDuration,
  startedAt: ...,
  endedAt: Date.now(),
};
```

Replace with:

```typescript
// Only associate task metadata with work sessions; breaks are rests, not task execution
const taskTitle =
  phase === 'work' && selectedTaskId
    ? useTaskStore.getState().tasks.find((t) => t.id === selectedTaskId)?.title
    : undefined;
const session: PomodoroSession = {
  id: generateId(),
  taskId: phase === 'work' ? (selectedTaskId ?? undefined) : undefined,
  taskTitle,
  phase,
  durationMinutes: phase === 'work' ? workDuration : breakDuration,
  startedAt:
    cycleStartedAt ??
    Date.now() - (phase === 'work' ? workDuration : breakDuration) * 60 * 1000,
  endedAt: Date.now(),
};
```

**3b.** In the `if (phase === 'work')` branch (after `set(...)` and before `ensurePomodoroInterval()`), add the auto-complete call:

```typescript
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
  // Mark the focused task as completed
  if (selectedTaskId) {
    useTaskStore.getState().updateTask(selectedTaskId, {
      completed: true,
      completedAt: Date.now(),
    });
  }
  ensurePomodoroInterval();
}
```

---

### Step 4: Run tests to confirm they pass

```bash
pnpm jest --testPathPattern="pomodoroStore" 2>&1 | tail -15
```

Expected: all tests PASS (including the 3 new ones).

---

### Step 5: Run full suite

```bash
pnpm jest --coverage 2>&1 | tail -20
```

Expected: all tests PASS.

---

### Step 6: Commit

```bash
git add src/stores/pomodoroStore.ts src/stores/__tests__/pomodoroStore.test.ts
git commit -m "fix(pomodoro): no taskId on break sessions, auto-complete task after focus"
```

---

---

## Task 2: Show running task name in TimerDisplay

**Files:**

- Modify: `src/components/pomodoro/TimerDisplay.tsx`
- Create: `src/components/pomodoro/__tests__/TimerDisplay.test.tsx`

### Step 1: Write failing tests

Create `src/components/pomodoro/__tests__/TimerDisplay.test.tsx`:

```typescript
import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    success: '#34C759',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
  }),
}));

let mockPomodoroState = {
  secondsRemaining: 25 * 60,
  phase: 'work' as 'work' | 'break',
  cycleCount: 0,
  selectedTaskId: null as string | null,
};

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: typeof mockPomodoroState) => unknown) =>
    selector(mockPomodoroState),
}));

let mockTasks = [
  { id: 'task-1', title: 'Write tests', completed: false },
];

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: (selector: (s: { tasks: typeof mockTasks }) => unknown) =>
    selector({ tasks: mockTasks }),
}));

import { TimerDisplay } from '../TimerDisplay';

describe('TimerDisplay', () => {
  beforeEach(() => {
    mockPomodoroState = {
      secondsRemaining: 25 * 60,
      phase: 'work',
      cycleCount: 0,
      selectedTaskId: null,
    };
    mockTasks = [{ id: 'task-1', title: 'Write tests', completed: false }];
  });

  it('shows Focus label during work phase', () => {
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Focus')).toBeTruthy();
  });

  it('shows Break label during break phase', () => {
    mockPomodoroState = { ...mockPomodoroState, phase: 'break' };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Break')).toBeTruthy();
  });

  it('shows the running task name when selectedTaskId is set and phase is work', () => {
    mockPomodoroState = { ...mockPomodoroState, selectedTaskId: 'task-1' };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Write tests')).toBeTruthy();
  });

  it('does not show task name during break phase even if selectedTaskId is set', () => {
    mockPomodoroState = { ...mockPomodoroState, phase: 'break', selectedTaskId: 'task-1' };
    const { queryByText } = render(<TimerDisplay />);
    expect(queryByText('Write tests')).toBeNull();
  });

  it('does not show task name when no task is selected', () => {
    mockPomodoroState = { ...mockPomodoroState, selectedTaskId: null };
    const { queryByText } = render(<TimerDisplay />);
    expect(queryByText('Write tests')).toBeNull();
  });

  it('shows session count when cycleCount > 0', () => {
    mockPomodoroState = { ...mockPomodoroState, cycleCount: 3 };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('3 sessions completed today')).toBeTruthy();
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
pnpm jest --testPathPattern="TimerDisplay" 2>&1 | tail -10
```

Expected: 3 failures — task name tests fail because `TimerDisplay` doesn't read `selectedTaskId` yet.

### Step 3: Update TimerDisplay

Open `src/components/pomodoro/TimerDisplay.tsx`. Make these changes:

**3a.** Add `useTaskStore` import:

```typescript
import { useTaskStore } from '@/stores/taskStore';
```

**3b.** Replace the line that reads from `usePomodoroStore`:

```typescript
// Before:
const { secondsRemaining, phase, cycleCount } = usePomodoroStore();

// After — use individual selectors (avoids infinite re-render):
const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining);
const phase = usePomodoroStore((s) => s.phase);
const cycleCount = usePomodoroStore((s) => s.cycleCount);
const selectedTaskId = usePomodoroStore((s) => s.selectedTaskId);
const tasks = useTaskStore((s) => s.tasks);
```

**3c.** After `const isWork = phase === 'work';`, add:

```typescript
const runningTaskTitle =
  isWork && selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)?.title ?? null
    : null;
```

**3d.** In the JSX, add the task name between the phase label and the clock — show it only when `runningTaskTitle` is set:

```tsx
<Text
  className="text-sm font-semibold uppercase tracking-widest mb-2"
  style={{ color: isWork ? theme.primary : theme.success }}>
  {isWork ? 'Focus' : 'Break'}
</Text>
{runningTaskTitle && (
  <Text
    className="text-sm font-medium mb-1"
    numberOfLines={1}
    style={{ color: theme.textMuted }}>
    {runningTaskTitle}
  </Text>
)}
<Text
  className="text-8xl font-thin tabular-nums"
  style={{ color: isWork ? theme.text : theme.success }}>
  {pad(minutes)}:{pad(seconds)}
</Text>
```

### Step 4: Run tests to confirm they pass

```bash
pnpm jest --testPathPattern="TimerDisplay" 2>&1 | tail -10
```

Expected: 6 tests PASS.

### Step 5: Run full suite

```bash
pnpm jest --coverage 2>&1 | tail -20
```

Expected: all tests PASS.

### Step 6: Commit

```bash
git add src/components/pomodoro/TimerDisplay.tsx src/components/pomodoro/__tests__/TimerDisplay.test.tsx
git commit -m "feat(pomodoro): show running task name in timer display"
```

---

## Self-Review

### Spec coverage

| Issue | Fix |
|---|---|
| Break sessions carry taskId | Session construction: `taskId` only set when `phase === 'work'` |
| Tasks appear twice in session log | Same fix — break sessions have no task association |
| Mark task complete after focus | `updateTask({ completed: true })` in work branch of `completeCycle` |
| Bulk queue tasks auto-disappear from picker | Natural consequence: `activeTasks` filters `!t.completed` |
| Show running task name in timer | `TimerDisplay` reads `selectedTaskId`, looks up title, shows below phase label |

### Edge cases handled

- `selectedTaskId === null`: no task name shown — correct for unlinked sessions.
- Break phase: task name hidden even if `selectedTaskId` is still set — the break is a rest, not task execution.
- `selectedTaskId` points to a deleted task: `find()` returns `undefined`, falls back to `null` — no name shown.
- `usePomodoroStore` uses individual selectors throughout — no infinite re-render risk.
