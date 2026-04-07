# Spaces: Fix Stale Data After Switch + Timer Guard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two fixes to the shared spaces feature:

1. `pullSharedSpace` misses `notifiedBudgetThresholdByKey` in its reset block, causing this finance store field to bleed across spaces. Fix: align the reset with `applySnapshot` (which is the gold standard for full state replacement).

2. If the Pomodoro timer is running when the user switches spaces, the timer keeps running silently. Fix: show a confirmation `Alert` in `handleSwitch` and stop the timer if the user confirms.

**Branch:** create `fix/issue-14-spaces-stale-data-timer-guard` from `main`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Modify** | `src/services/spaceSync.ts` | Add `notifiedBudgetThresholdByKey: {}` to reset block |
| **Modify** | `src/services/__tests__/spaceSync.test.ts` | Add test for the missing field |
| **Modify** | `src/components/ui/SharedSpaceModal.tsx` | Timer-running guard in `handleSwitch` |
| **Modify** | `src/components/ui/__tests__/SharedSpaceModal.test.tsx` | Tests for the timer guard |

---

## Task 1: Fix `pullSharedSpace` — reset `notifiedBudgetThresholdByKey`

**Files:**
- Modify: `src/services/spaceSync.ts`
- Modify: `src/services/__tests__/spaceSync.test.ts`

### Context

`applySnapshot` (used by `pullForCurrentUser` for personal sync) sets ALL six finance store fields:

```typescript
useFinanceStore.setState({
  categories: ...,
  budgets: ...,
  expenses: ...,
  notifiedBudgetThresholdByKey: ...,   // ✅ included
  overallBudgetAmount: ...,
  overallBudgetPeriod: ...,
});
```

But the reset block in `pullSharedSpace` only resets five fields and leaves `notifiedBudgetThresholdByKey` from the previous space:

```typescript
useFinanceStore.setState((s) => ({
  ...s,
  categories: [],
  budgets: [],
  expenses: [],
  overallBudgetAmount: 0,
  overallBudgetPeriod: 'monthly',
  // ❌ notifiedBudgetThresholdByKey missing
}));
```

### Step 1: Write failing test

Open `src/services/__tests__/spaceSync.test.ts`.

In the `describe('pullSharedSpace')` block, find the test `'clears stores when space has no data'` (or similar). After it, add:

```typescript
it('resets notifiedBudgetThresholdByKey when switching spaces', async () => {
  // Arrange: finance store has stale notification data from a previous space
  useFinanceStore.setState({
    notifiedBudgetThresholdByKey: { 'cat-food-2026-04': 1 },
  });

  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null }),
      }),
    }),
  });

  await pullSharedSpace('space-1');

  expect(useFinanceStore.getState().notifiedBudgetThresholdByKey).toEqual({});
});
```

### Step 2: Run tests to confirm failure

```bash
pnpm jest --testPathPattern="spaceSync" 2>&1 | tail -15
```

Expected: 1 new failure — `notifiedBudgetThresholdByKey` is not `{}` after pull.

### Step 3: Fix `src/services/spaceSync.ts`

Find the reset block inside `pullSharedSpace` (around line 287-294):

```typescript
useFinanceStore.setState((s) => ({
  ...s,
  categories: [],
  budgets: [],
  expenses: [],
  overallBudgetAmount: 0,
  overallBudgetPeriod: 'monthly',
}));
```

Add `notifiedBudgetThresholdByKey: {}`:

```typescript
useFinanceStore.setState((s) => ({
  ...s,
  categories: [],
  budgets: [],
  expenses: [],
  notifiedBudgetThresholdByKey: {},
  overallBudgetAmount: 0,
  overallBudgetPeriod: 'monthly',
}));
```

### Step 4: Run tests to confirm they pass

```bash
pnpm jest --testPathPattern="spaceSync" 2>&1 | tail -15
```

Expected: all tests PASS.

### Step 5: Commit

```bash
git add src/services/spaceSync.ts src/services/__tests__/spaceSync.test.ts
git commit -m "fix(spaces): reset notifiedBudgetThresholdByKey when pulling shared space"
```

---

## Task 2: Guard space switch when Pomodoro timer is running

**Files:**
- Modify: `src/components/ui/SharedSpaceModal.tsx`
- Modify: `src/components/ui/__tests__/SharedSpaceModal.test.tsx`

### Context

`handleSwitch` in `SharedSpaceModal` currently switches spaces unconditionally:

```typescript
const handleSwitch = async (spaceId: string | null) => {
  setBusy(true);
  if (activeSpaceId) await pushToSharedSpace(activeSpaceId);
  ...
```

If the Pomodoro timer is running, the switch should be gated by a confirmation alert. On confirm, the timer should be stopped (`reset()`) before the switch proceeds.

### Step 1: Write failing tests

Open `src/components/ui/__tests__/SharedSpaceModal.test.tsx`.

**1a.** Add a mock for `usePomodoroStore` near the other store mocks. Look at how `useSpaceStore` is mocked and follow the same pattern:

```typescript
let mockPomodoroStatus: 'idle' | 'running' | 'paused' = 'idle';
const mockPomodoroReset = jest.fn();

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: {
    getState: () => ({
      status: mockPomodoroStatus,
      reset: mockPomodoroReset,
    }),
  },
}));
```

**1b.** At the end of the test file, add a new `describe` block:

```typescript
describe('timer running guard', () => {
  beforeEach(() => {
    mockPomodoroStatus = 'idle';
    mockPomodoroReset.mockReset();
    mockPushToSharedSpace.mockResolvedValue(undefined);
    mockPullSharedSpace.mockResolvedValue(undefined);
    mockSpaceStoreState = {
      ...mockSpaceStoreState,
      spaces: [{ id: 'space-1', name: 'Team', ownerId: 'user-1', createdAt: '' }],
      activeSpaceId: null,
    };
  });

  it('switches space immediately when timer is idle', async () => {
    mockPomodoroStatus = 'idle';
    const { getByText } = render(<SharedSpaceModal visible onClose={jest.fn()} />);
    fireEvent.press(getByText('Team'));
    await waitFor(() => expect(mockPullSharedSpace).toHaveBeenCalledWith('space-1'));
    expect(mockPomodoroReset).not.toHaveBeenCalled();
  });

  it('shows alert when timer is running and user taps a space', async () => {
    mockPomodoroStatus = 'running';
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<SharedSpaceModal visible onClose={jest.fn()} />);
    fireEvent.press(getByText('Team'));
    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringMatching(/cancel/i) }),
        expect.objectContaining({ text: expect.stringMatching(/switch|stop|yes/i) }),
      ])
    );
    expect(mockPullSharedSpace).not.toHaveBeenCalled();
  });

  it('stops timer and switches space when user confirms alert', async () => {
    mockPomodoroStatus = 'running';
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirmBtn = buttons?.find(
        (b) => b.text && /switch|stop|yes/i.test(b.text)
      );
      confirmBtn?.onPress?.();
    });
    const { getByText } = render(<SharedSpaceModal visible onClose={jest.fn()} />);
    fireEvent.press(getByText('Team'));
    await waitFor(() => expect(mockPomodoroReset).toHaveBeenCalled());
    await waitFor(() => expect(mockPullSharedSpace).toHaveBeenCalledWith('space-1'));
  });

  it('does not switch when user cancels alert', async () => {
    mockPomodoroStatus = 'running';
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const cancelBtn = buttons?.find((b) => b.text && /cancel/i.test(b.text));
      cancelBtn?.onPress?.();
    });
    const { getByText } = render(<SharedSpaceModal visible onClose={jest.fn()} />);
    fireEvent.press(getByText('Team'));
    await waitFor(() => expect(mockPullSharedSpace).not.toHaveBeenCalled());
    expect(mockPomodoroReset).not.toHaveBeenCalled();
  });
});
```

### Step 2: Run tests to confirm failures

```bash
pnpm jest --testPathPattern="SharedSpaceModal" 2>&1 | tail -15
```

Expected: the new tests about the timer guard fail.

### Step 3: Update `SharedSpaceModal.tsx`

**3a.** Add `usePomodoroStore` import at the top:

```typescript
import { usePomodoroStore } from '@/stores/pomodoroStore';
```

**3b.** Replace the `handleSwitch` function with:

```typescript
const handleSwitch = async (spaceId: string | null) => {
  const pomodoroStatus = usePomodoroStore.getState().status;

  if (pomodoroStatus === 'running') {
    Alert.alert(
      'Timer is running',
      'Switching spaces will stop the current focus session. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch anyway',
          style: 'destructive',
          onPress: () => {
            usePomodoroStore.getState().reset();
            void doSwitch(spaceId);
          },
        },
      ]
    );
    return;
  }

  await doSwitch(spaceId);
};

const doSwitch = async (spaceId: string | null) => {
  setBusy(true);
  // Save current space data before switching so no pending changes are lost
  if (activeSpaceId) await pushToSharedSpace(activeSpaceId);
  if (spaceId) {
    // Entering a space: load the space's data into local stores
    setActiveSpaceId(spaceId);
    await pullSharedSpace(spaceId);
  } else {
    // Leaving a space: restore personal data from cloud
    setActiveSpaceId(null);
    await pullForCurrentUser();
  }
  setBusy(false);
  onClose();
};
```

**Important:** `doSwitch` uses `setBusy`, `activeSpaceId`, `setActiveSpaceId`, `pushToSharedSpace`, `pullSharedSpace`, `pullForCurrentUser`, and `onClose` — all of which are already in scope inside the component. Define `doSwitch` as a `const` inside the component body, just above `handleSwitch`.

### Step 4: Run tests to confirm they pass

```bash
pnpm jest --testPathPattern="SharedSpaceModal" 2>&1 | tail -15
```

Expected: all tests PASS.

### Step 5: Run full suite

```bash
pnpm jest --coverage 2>&1 | tail -20
```

Expected: all tests PASS.

### Step 6: Commit and push

```bash
git add src/components/ui/SharedSpaceModal.tsx src/components/ui/__tests__/SharedSpaceModal.test.tsx
git commit -m "feat(spaces): show timer-running alert before switching space"
git push -u origin fix/issue-14-spaces-stale-data-timer-guard
```

---

## Self-Review

### Spec coverage

| Issue | Fix |
|---|---|
| `notifiedBudgetThresholdByKey` bleeds across spaces | Added to reset block in `pullSharedSpace` |
| Timer runs silently after space switch | `handleSwitch` checks `status === 'running'`, shows alert |
| Confirm → stop timer + switch | `usePomodoroStore.getState().reset()` called before `doSwitch` |
| Cancel → no-op | `Alert.alert` cancel button returns without switching |

### Edge cases

- Timer is `paused` (not `running`): switch proceeds without alert — a paused timer isn't actively counting, so no session is lost.
- `doSwitch` uses `void` when called from the `onPress` callback (Alert callbacks are synchronous void functions).
- `setBusy(true/false)` is not called in the early-return path (timer running guard) — correct since the modal stays open for the user to decide.
