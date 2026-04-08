# Task Modal — Contrast & Default Due Date

**Issue:** codex-foundation/slow-to-pro#16  
**Date:** 2026-04-08  
**Status:** Approved

## Problem

Two independent issues in `AddTaskModal.tsx`:

1. **Contrast failure:** Six section labels (Priority, Recurring task, Start focus immediately, Due date, Reminder, Category) use hardcoded `text-gray-600` (`#4b5563`), which yields a 2.9:1 contrast ratio on the dark modal background (`#111827`). WCAG AA requires 4.5:1 for normal text.

2. **Visual inconsistency:** Inactive priority buttons use light Tailwind backgrounds (`bg-red-50`, `bg-amber-50`, `bg-green-50`) that appear as bright islands on the dark surface. This is not a contrast failure (text-on-button passes), but it breaks visual coherence in dark mode.

3. **Due date UX:** The due date field opens empty (`null` / `''`), requiring an extra tap for the common case of scheduling to today.

## Scope

All changes are confined to `AddTaskModal.tsx` and its test files. No other components or the theme system are modified.

## Design

### 1. Section Labels

Replace hardcoded `text-gray-600` with `style={{ color: theme.textMuted }}` on all six label `<Text>` elements. Remove the Tailwind color class from `className`.

- Dark mode: `#cbd5e1` on `#111827` → **12:1** (passes WCAG AAA)
- Light mode: `#334155` on `#ffffff` → **10.3:1** (passes WCAG AAA)

### 2. Inactive Priority Button Backgrounds

Add a `PRIORITY_BG_DARK` constant mapping each priority to an inline style object with semi-transparent `rgba` background and border colors:

```ts
const PRIORITY_BG_DARK: Record<Priority, object> = {
  high:   { backgroundColor: 'rgba(239,68,68,0.15)',   borderColor: 'rgba(239,68,68,0.5)'  },
  medium: { backgroundColor: 'rgba(251,191,36,0.15)',  borderColor: 'rgba(251,191,36,0.5)' },
  low:    { backgroundColor: 'rgba(52,211,153,0.15)',  borderColor: 'rgba(52,211,153,0.5)' },
};
```

Apply conditionally on inactive buttons:

- `className`: keep `PRIORITY_COLORS[p]` in light mode, drop in dark (empty string)
- `style`: apply `PRIORITY_BG_DARK[p]` in dark mode, `undefined` in light
- Inactive text: use `style={{ color: theme.textMuted }}` instead of hardcoded `text-gray-700`

Active state (`PRIORITY_ACTIVE`) is unchanged.

### 3. Due Date Defaults to Today

Add two lazy-initializer helpers at the top of the component:

```ts
const todayAtEod = () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d; };
const todayISO   = () => new Date().toISOString().slice(0, 10);
```

Change initial state:

```ts
// Before
const [dueDate, setDueDate]       = useState<Date | null>(null);
const [dueDateInput, setDueDateInput] = useState('');

// After
const [dueDate, setDueDate]       = useState<Date>(todayAtEod);
const [dueDateInput, setDueDateInput] = useState(todayISO);
```

Update `resetForm()` to reset back to today (not null):

```ts
setDueDate(todayAtEod());
setDueDateInput(todayISO());
```

The "Clear" button remains and resets to `null` / `''` (no due date), which is still useful. Because `dueDate` is non-null on open, the "Clear" button will be visible immediately when the modal opens. Tapping it sets due date to null (no due date). `hasDueDateValue` remains accurate — it evaluates to `true` on open (today is set), and `false` after clearing.

### Error Handling

No new error paths. The `todayAtEod()` helper always returns a valid `Date`. Existing `parseDateToEndOfDay` and `buildTaskPayload` logic is unchanged.

## Testing

- `AddTaskModal.test.tsx`: Update any assertions that expect the due date field to be empty on open — it now shows today's date.
- `AddTaskModal.theme.test.tsx`: Update label color assertions from `text-gray-600` / `#4b5563` to `theme.textMuted`.
- Run `pnpm jest --coverage` to confirm full suite passes.

## Files Changed

| File | Change |
| --- | --- |
| `src/components/tasks/AddTaskModal.tsx` | Labels, priority buttons, due date default |
| `src/components/tasks/__tests__/AddTaskModal.test.tsx` | Update due date open-state assertions |
| `src/components/tasks/__tests__/AddTaskModal.theme.test.tsx` | Update label color assertions |
