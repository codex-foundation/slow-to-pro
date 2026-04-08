# Task Modal Contrast & Default Due Date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix failing WCAG contrast on section labels, fix dark-mode visual inconsistency on inactive priority buttons, and default the due date field to today when the modal opens.

**Architecture:** All changes are confined to `AddTaskModal.tsx`. Labels switch from hardcoded `text-gray-600` to `style={{ color: theme.textMuted }}`. Inactive priority buttons gain a `PRIORITY_BG_DARK` map applied when `theme.isDark` is true. Due date state initialises with `todayAtEod()` instead of `null`, with matching `resetForm()` update.

**Tech Stack:** React Native, NativeWind (Tailwind), `@testing-library/react-native`, Jest

**Spec:** `docs/superpowers/specs/2026-04-08-task-modal-contrast-default-date-design.md`

---

## Task 1: Update "Clear button" test for new default-today behaviour

The existing test expects no Clear button on open. After Task 3, `dueDate` starts non-null, so Clear appears immediately. Update the test now so it fails (red) before we implement.

**Files:**

- Modify: `src/components/tasks/__tests__/AddTaskModal.test.tsx`

- [ ] **Step 1: Replace the "shows Clear button" test body**

In `AddTaskModal.test.tsx`, find the test `'shows Clear button when due date is set and clears it'` (currently around line 253) and replace its body:

```ts
it('shows Clear button when due date is set and clears it', () => {
  const { getByTestId, getByText, queryByText } = render(
    <AddTaskModal visible onClose={jest.fn()} />
  );

  // Clear is visible immediately because due date defaults to today
  expect(getByText('Clear')).toBeTruthy();

  // Press Clear — due date becomes null, Clear disappears
  fireEvent.press(getByText('Clear'));
  expect(queryByText('Clear')).toBeNull();

  // Open picker and set a date via the mock — Clear reappears
  fireEvent.press(getByTestId('due-date-open'));
  fireEvent.press(getByTestId('mock-datetime-picker'));
  fireEvent.press(getByTestId('due-date-picker-modal-done'));
  expect(getByText('Clear')).toBeTruthy();
});
```

- [ ] **Step 2: Update the web test comment**

Find `'calls parseDateToEndOfDay via handleAdd with a due date input on web'` and replace it:

```ts
it('calls parseDateToEndOfDay via handleAdd with a due date input on web', () => {
  const onClose = jest.fn();
  const { getByTestId } = render(<AddTaskModal visible onClose={onClose} />);

  fireEvent.changeText(getByTestId('task-title-input'), 'Web task');

  // dueDateInput defaults to today's ISO date, so parseDateToEndOfDay
  // returns today at 23:59 and addTask receives a valid dueDate timestamp.
  fireEvent.press(getByTestId('add-task-submit'));

  expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Web task' }));
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the suite to confirm the updated test fails (red)**

```bash
pnpm jest AddTaskModal.test --no-coverage
```

Expected: `'shows Clear button when due date is set and clears it'` FAILS with `Unable to find an element with text: 'Clear'`. All other tests pass.

---

## Task 2: Add label colour assertions to theme test

Write failing assertions for section labels using `theme.textMuted`.

**Files:**

- Modify: `src/components/tasks/__tests__/AddTaskModal.theme.test.tsx`

- [ ] **Step 1: Add a new test for label colours**

Append inside the `'AddTaskModal dark theme input'` describe block, after the existing test:

```ts
it('uses theme.textMuted colour for all section labels', () => {
  const { getByText } = render(<AddTaskModal visible onClose={jest.fn()} />);

  for (const label of [
    'Priority',
    'Recurring task',
    'Start focus immediately',
    'Due date',
    'Reminder',
  ]) {
    const el = getByText(label);
    expect(el.props.style).toEqual(expect.objectContaining({ color: '#cbd5e1' }));
  }
});
```

- [ ] **Step 2: Add a new test for inactive priority button text colour**

Append after the label colour test:

```ts
it('uses theme.textMuted colour for inactive priority button text in dark mode', () => {
  const { getAllByText } = render(<AddTaskModal visible onClose={jest.fn()} />);

  // Default priority is 'medium' → High and Low are inactive
  const highText = getAllByText('High')[0];
  expect(highText.props.style).toEqual(expect.objectContaining({ color: '#cbd5e1' }));

  const lowText = getAllByText('Low')[0];
  expect(lowText.props.style).toEqual(expect.objectContaining({ color: '#cbd5e1' }));

  // Medium is active → no textMuted colour applied
  const medText = getAllByText('Medium')[0];
  expect(medText.props.style).not.toEqual(expect.objectContaining({ color: '#cbd5e1' }));
});
```

- [ ] **Step 3: Run the theme test to confirm both new tests fail (red)**

```bash
pnpm jest AddTaskModal.theme --no-coverage
```

Expected: two new tests FAIL. Existing test passes.

---

## Task 3: Default due date to today

Implement the due date initialisation change — this makes Task 1's updated test go green.

**Files:**

- Modify: `src/components/tasks/AddTaskModal.tsx`

- [ ] **Step 1: Add helper functions just above the `AddTaskModal` function**

Insert these two lines immediately before `export function AddTaskModal`:

```ts
const todayAtEod = () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d; };
const todayISO   = () => new Date().toISOString().slice(0, 10);
```

- [ ] **Step 2: Update `dueDate` initial state**

Find:

```ts
const [dueDate, setDueDate] = useState<Date | null>(null);
```

Replace with:

```ts
const [dueDate, setDueDate] = useState<Date | null>(todayAtEod);
```

- [ ] **Step 3: Update `dueDateInput` initial state**

Find:

```ts
const [dueDateInput, setDueDateInput] = useState(''); // web fallback
```

Replace with:

```ts
const [dueDateInput, setDueDateInput] = useState(todayISO); // web fallback
```

- [ ] **Step 4: Update `resetForm` to reset to today**

Find in `resetForm()`:

```ts
setDueDate(null);
setShowDueDatePicker(false);
setDueDateInput('');
```

Replace with:

```ts
setDueDate(todayAtEod());
setShowDueDatePicker(false);
setDueDateInput(todayISO());
```

- [ ] **Step 5: Run both test files — Task 1 should now be green**

```bash
pnpm jest AddTaskModal --no-coverage
```

Expected: `AddTaskModal.test` fully passes. `AddTaskModal.theme` still has 2 failing tests (fixed in Tasks 4–5).

---

## Task 4: Fix section label colours

Replace hardcoded `text-gray-600` with `style={{ color: theme.textMuted }}` on all 6 section labels.

**Files:**

- Modify: `src/components/tasks/AddTaskModal.tsx`

- [ ] **Step 1: Fix "Priority" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600 mb-2">Priority</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>Priority</Text>
```

- [ ] **Step 2: Fix "Recurring task" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600">Recurring task</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium" style={{ color: theme.textMuted }}>Recurring task</Text>
```

- [ ] **Step 3: Fix "Start focus immediately" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600">Start focus immediately</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium" style={{ color: theme.textMuted }}>Start focus immediately</Text>
```

- [ ] **Step 4: Fix "Due date" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600">Due date</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium" style={{ color: theme.textMuted }}>Due date</Text>
```

- [ ] **Step 5: Fix "Reminder" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600">Reminder</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium" style={{ color: theme.textMuted }}>Reminder</Text>
```

- [ ] **Step 6: Fix "Category" label**

Find:

```tsx
<Text className="text-sm font-medium text-gray-600 mb-2">Category</Text>
```

Replace with:

```tsx
<Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>Category</Text>
```

- [ ] **Step 7: Run theme test — label colour test should now pass**

```bash
pnpm jest AddTaskModal.theme --no-coverage
```

Expected: `'uses theme.textMuted colour for all section labels'` passes. `'uses theme.textMuted colour for inactive priority button text'` still fails.

---

## Task 5: Fix inactive priority button backgrounds and text

Add `PRIORITY_BG_DARK` and apply it conditionally on inactive buttons.

**Files:**

- Modify: `src/components/tasks/AddTaskModal.tsx`

- [ ] **Step 1: Add `PRIORITY_BG_DARK` constant after `PRIORITY_ACTIVE`**

After the existing `PRIORITY_ACTIVE` constant (around line 36), insert:

```ts
const PRIORITY_BG_DARK: Record<Priority, { backgroundColor: string; borderColor: string }> = {
  high:   { backgroundColor: 'rgba(239,68,68,0.15)',   borderColor: 'rgba(239,68,68,0.5)'  },
  medium: { backgroundColor: 'rgba(251,191,36,0.15)',  borderColor: 'rgba(251,191,36,0.5)' },
  low:    { backgroundColor: 'rgba(52,211,153,0.15)',  borderColor: 'rgba(52,211,153,0.5)' },
};
```

- [ ] **Step 2: Update the priority button render**

Find:

```tsx
<TouchableOpacity
  key={p}
  onPress={() => setPriority(p)}
  className={`flex-1 py-2 rounded-lg border ${priority === p ? PRIORITY_ACTIVE[p] : PRIORITY_COLORS[p]}`}>
  <Text
    className={`text-center text-sm font-medium ${priority === p ? 'text-white' : 'text-gray-700'}`}>
    {PRIORITY_LABELS[p]}
  </Text>
</TouchableOpacity>
```

Replace with:

```tsx
<TouchableOpacity
  key={p}
  onPress={() => setPriority(p)}
  className={`flex-1 py-2 rounded-lg border ${
    priority === p ? PRIORITY_ACTIVE[p] : theme.isDark ? '' : PRIORITY_COLORS[p]
  }`}
  style={priority !== p && theme.isDark ? PRIORITY_BG_DARK[p] : undefined}>
  <Text
    className={`text-center text-sm font-medium ${priority === p ? 'text-white' : ''}`}
    style={priority !== p ? { color: theme.textMuted } : undefined}>
    {PRIORITY_LABELS[p]}
  </Text>
</TouchableOpacity>
```

- [ ] **Step 3: Run the full suite — all tests should pass**

```bash
pnpm jest --coverage
```

Expected: all tests pass, coverage unchanged or improved.

---

## Task 6: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add src/components/tasks/AddTaskModal.tsx \
        src/components/tasks/__tests__/AddTaskModal.test.tsx \
        src/components/tasks/__tests__/AddTaskModal.theme.test.tsx
git commit -m "fix(task-modal): improve contrast and default due date to today"
```
