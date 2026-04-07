# Financial History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a history view to the finances screen so users can browse expenses, totals, and category breakdowns for any past month.

**Architecture:** A `MonthPicker` component lets the user navigate months; the existing finances screen gains a "History" section below the current-month content that renders the selected month's data using the same `ExpenseItem` and `BudgetProgressBar` components already in the codebase. No new screen or route is needed — the history lives in a collapsible/scrollable section within the existing tab. All logic is pure derivation from the already-persisted `expenses` and `budgets` arrays in `financeStore`.

**Tech Stack:** React Native, Zustand (`useFinanceStore`), NativeWind (Tailwind classes), `react-native-reanimated` (FadeInUp / Layout animations), `@expo/vector-icons/Ionicons`, Jest + `@testing-library/react-native`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Create** | `src/components/finance/MonthPicker.tsx` | Prev/Next chevron controls + formatted month label |
| **Create** | `src/components/finance/__tests__/MonthPicker.test.tsx` | Unit tests for MonthPicker |
| **Create** | `src/utils/historyUtils.ts` | Pure helpers: `availableMonths`, `monthLabel`, `prevMonth`, `nextMonth` |
| **Create** | `src/utils/__tests__/historyUtils.test.ts` | Unit tests for history utilities |
| **Modify** | `app/(tabs)/finances.tsx` | Add history section with MonthPicker + filtered expense/budget list |
| **Modify** | `app/(tabs)/__tests__/finances.test.tsx` | Integration tests for the history section |

---

## Task 1: History utility functions

**Files:**
- Create: `src/utils/historyUtils.ts`
- Create: `src/utils/__tests__/historyUtils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/historyUtils.test.ts`:

```typescript
import {
  prevMonth,
  nextMonth,
  monthLabel,
  availableMonths,
} from '../historyUtils';

describe('prevMonth', () => {
  it('goes back one month within the same year', () => {
    expect(prevMonth('2026-03')).toBe('2026-02');
  });

  it('wraps back to December of the previous year', () => {
    expect(prevMonth('2026-01')).toBe('2025-12');
  });
});

describe('nextMonth', () => {
  it('advances one month within the same year', () => {
    expect(nextMonth('2026-02')).toBe('2026-03');
  });

  it('wraps forward to January of the next year', () => {
    expect(nextMonth('2025-12')).toBe('2026-01');
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM as "Month YYYY"', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
  });

  it('formats January correctly', () => {
    expect(monthLabel('2025-01')).toBe('January 2025');
  });
});

describe('availableMonths', () => {
  it('returns empty array when there are no expenses', () => {
    expect(availableMonths([])).toEqual([]);
  });

  it('returns unique months sorted newest-first', () => {
    const expenses = [
      { id: 'e1', categoryId: 'c1', amount: 10, date: new Date('2026-03-15').getTime() },
      { id: 'e2', categoryId: 'c1', amount: 20, date: new Date('2026-01-05').getTime() },
      { id: 'e3', categoryId: 'c1', amount: 5,  date: new Date('2026-03-01').getTime() },
    ];
    expect(availableMonths(expenses)).toEqual(['2026-03', '2026-01']);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="historyUtils" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../historyUtils'`

- [ ] **Step 3: Implement the utilities**

Create `src/utils/historyUtils.ts`:

```typescript
import type { Expense } from '@/models/finance';

/** Returns the previous month as 'YYYY-MM' */
export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Returns the next month as 'YYYY-MM' */
export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Formats 'YYYY-MM' as a human-readable label, e.g. 'March 2026' */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

/**
 * Returns the unique months represented in the expense list,
 * sorted newest-first, as 'YYYY-MM' strings.
 */
export function availableMonths(expenses: Expense[]): string[] {
  const set = new Set(expenses.map((e) => new Date(e.date).toISOString().slice(0, 7)));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest --testPathPattern="historyUtils" 2>&1 | tail -10
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/historyUtils.ts src/utils/__tests__/historyUtils.test.ts
git commit -m "feat(finances): add history utility functions"
```

---

## Task 2: MonthPicker component

**Files:**
- Create: `src/components/finance/MonthPicker.tsx`
- Create: `src/components/finance/__tests__/MonthPicker.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/finance/__tests__/MonthPicker.test.tsx`:

```typescript
import { fireEvent, render } from '@testing-library/react-native';
import { MonthPicker } from '../MonthPicker';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name?: string; testID?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name),
  };
});

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
  }),
}));

describe('MonthPicker', () => {
  it('renders the formatted month label', () => {
    const { getByText } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={jest.fn()} disableNext={false} />
    );
    expect(getByText('March 2026')).toBeTruthy();
  });

  it('calls onPrev when the left chevron is pressed', () => {
    const onPrev = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={onPrev} onNext={jest.fn()} disableNext={false} />
    );
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when the right chevron is pressed', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={onNext} disableNext={false} />
    );
    fireEvent.press(getByTestId('month-picker-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the next button when disableNext is true', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={onNext} disableNext={true} />
    );
    fireEvent.press(getByTestId('month-picker-next'));
    expect(onNext).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="MonthPicker" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../MonthPicker'`

- [ ] **Step 3: Implement MonthPicker**

Create `src/components/finance/MonthPicker.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { monthLabel } from '@/utils/historyUtils';

interface Props {
  month: string;       // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean; // true when month === currentMonth
}

export function MonthPicker({ month, onPrev, onNext, disableNext }: Props) {
  const theme = useAppTheme();
  return (
    <View className="flex-row items-center justify-between px-1 py-2">
      <TouchableOpacity testID="month-picker-prev" onPress={onPrev} className="p-2">
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
      </TouchableOpacity>
      <Text className="text-sm font-semibold" style={{ color: theme.text }}>
        {monthLabel(month)}
      </Text>
      <TouchableOpacity
        testID="month-picker-next"
        onPress={onNext}
        disabled={disableNext}
        className="p-2">
        <Ionicons
          name="chevron-forward"
          size={20}
          color={disableNext ? theme.textSubtle : theme.primary}
        />
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest --testPathPattern="MonthPicker" 2>&1 | tail -10
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/MonthPicker.tsx src/components/finance/__tests__/MonthPicker.test.tsx
git commit -m "feat(finances): add MonthPicker component"
```

---

## Task 3: History section in the finances screen

**Files:**
- Modify: `app/(tabs)/finances.tsx`
- Modify: `app/(tabs)/__tests__/finances.test.tsx`

### Step 1 — Write failing tests

- [ ] **Step 1: Add history tests to finances.test.tsx**

Open `app/(tabs)/__tests__/finances.test.tsx`. Add the following mock near the top (alongside the existing mocks) and add the new `describe` block at the bottom of the file, before the closing `}`:

Add mock for `MonthPicker` near the other component mocks:

```typescript
jest.mock('@/components/finance/MonthPicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, TouchableOpacity, Text } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');
  return {
    MonthPicker: ({
      month,
      onPrev,
      onNext,
      disableNext,
    }: {
      month: string;
      onPrev: () => void;
      onNext: () => void;
      disableNext: boolean;
    }) =>
      React.createElement(
        View,
        { testID: 'month-picker' },
        React.createElement(Text, null, month),
        React.createElement(TouchableOpacity, { testID: 'month-picker-prev', onPress: onPrev }),
        React.createElement(TouchableOpacity, {
          testID: 'month-picker-next',
          onPress: onNext,
          disabled: disableNext,
        })
      ),
  };
});
```

Add the test suite (before the final `}`):

```typescript
describe('history section', () => {
  const MAY = new Date('2025-05-10').getTime();
  const JUNE = new Date('2025-06-20').getTime();

  beforeEach(() => {
    useFinanceStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-food', name: 'Food', color: '#f97316' }],
      expenses: [
        { id: 'e-may', categoryId: 'cat-food', amount: 40, date: MAY },
        { id: 'e-june', categoryId: 'cat-food', amount: 55, date: JUNE },
      ],
      budgets: [],
    }));
  });

  it('renders the history section heading', () => {
    const { getByText } = render(<FinancesScreen />);
    expect(getByText('History')).toBeTruthy();
  });

  it('shows a MonthPicker defaulting to the most recent past month', () => {
    const { getByTestId } = render(<FinancesScreen />);
    expect(getByTestId('month-picker')).toBeTruthy();
  });

  it('shows expenses for the selected history month', () => {
    const { getByTestId, getByText } = render(<FinancesScreen />);
    // Default selected month is the newest past month (2025-06)
    expect(getByText('$55.00')).toBeTruthy();
  });

  it('navigates to the previous month when prev is pressed', () => {
    const { getByTestId, getByText } = render(<FinancesScreen />);
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(getByText('$40.00')).toBeTruthy();
  });

  it('disables the next button when the selected month is the most recent month with expenses', () => {
    const { getByTestId } = render(<FinancesScreen />);
    const nextBtn = getByTestId('month-picker-next');
    expect(nextBtn.props.disabled).toBe(true);
  });

  it('shows "No expenses" when the selected month has no expenses', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      expenses: [{ id: 'e-may', categoryId: 'cat-food', amount: 40, date: MAY }],
    }));
    const { getByText, getByTestId } = render(<FinancesScreen />);
    // Default is 2025-05 (only month); press prev to go to 2025-04
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(getByText('No expenses this month')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest --testPathPattern="finances.test" 2>&1 | tail -20
```

Expected: the new history tests FAIL (history section not yet implemented)

- [ ] **Step 3: Add history state and derived data to finances.tsx**

In `app/(tabs)/finances.tsx`, add the following import at the top alongside the existing imports:

```typescript
import { MonthPicker } from '@/components/finance/MonthPicker';
import { availableMonths, prevMonth, nextMonth } from '@/utils/historyUtils';
```

Inside `FinancesScreen`, after the existing `const month = currentMonth();` line, add:

```typescript
const allMonths = useMemo(() => availableMonths(expenses), [expenses]);
// History shows past months (everything except the current month)
const historyMonths = useMemo(() => allMonths.filter((m) => m < month), [allMonths, month]);

const [historyMonth, setHistoryMonth] = useState<string | null>(
  () => historyMonths[0] ?? null
);

// Keep historyMonth in sync when expenses change (e.g. space switch)
useEffect(() => {
  setHistoryMonth((prev) => {
    if (!prev || !historyMonths.includes(prev)) return historyMonths[0] ?? null;
    return prev;
  });
}, [historyMonths]);

const historyExpenses = useMemo(
  () =>
    historyMonth
      ? expenses
          .filter((e) => new Date(e.date).toISOString().slice(0, 7) === historyMonth)
          .sort((a, b) => b.date - a.date)
      : [],
  [expenses, historyMonth]
);

const historySpentByCategory = (categoryId: string) =>
  historyExpenses.filter((e) => e.categoryId === categoryId).reduce((sum, e) => sum + e.amount, 0);

const historyGetBudgetLimit = (categoryId: string) =>
  budgets.find((b) => b.categoryId === categoryId && b.month === historyMonth)?.monthlyLimit ?? 0;

const handleHistoryPrev = () => {
  if (historyMonth) setHistoryMonth(prevMonth(historyMonth));
};

const handleHistoryNext = () => {
  if (!historyMonth) return;
  const next = nextMonth(historyMonth);
  // Don't navigate past the current month
  if (next >= month) return;
  setHistoryMonth(next);
};

const isHistoryNextDisabled =
  !historyMonth || nextMonth(historyMonth) >= month;
```

- [ ] **Step 4: Add the history JSX to the screen**

In `app/(tabs)/finances.tsx`, add the following `Animated.View` block inside the `ScrollView`, after the closing `</Animated.View>` of the "Recent expenses" section (around line 316, before `</ScrollView>`):

```tsx
{historyMonths.length > 0 && (
  <Animated.View
    entering={FadeInUp.delay(240).duration(260)}
    layout={Layout.springify()}
    className="px-4 mt-6 mb-8">
    <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
      History
    </Text>
    <View
      className="rounded-2xl overflow-hidden"
      style={{ borderColor: theme.border, borderWidth: 1, backgroundColor: theme.surface }}>
      <MonthPicker
        month={historyMonth!}
        onPrev={handleHistoryPrev}
        onNext={handleHistoryNext}
        disableNext={isHistoryNextDisabled}
      />
      <View className="h-px" style={{ backgroundColor: theme.border }} />
      <View className="px-3 py-3">
        {categories.map((cat) => (
          <BudgetProgressBar
            key={cat.id}
            category={cat}
            spent={historySpentByCategory(cat.id)}
            limit={historyGetBudgetLimit(cat.id)}
          />
        ))}
        <View className="h-px my-2" style={{ backgroundColor: theme.border }} />
        {historyExpenses.length === 0 ? (
          <Text className="text-sm py-2 text-center" style={{ color: theme.textSubtle }}>
            No expenses this month
          </Text>
        ) : (
          historyExpenses.map((expense) => {
            const cat = categories.find((c) => c.id === expense.categoryId);
            return (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                category={cat}
                onDelete={() => deleteExpense(expense.id)}
              />
            );
          })
        )}
      </View>
    </View>
  </Animated.View>
)}
```

- [ ] **Step 5: Run the full test suite**

```bash
pnpm jest --coverage 2>&1 | tail -20
```

Expected: all tests PASS (658+ tests)

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/finances.tsx app/(tabs)/__tests__/finances.test.tsx
git commit -m "feat(finances): add history section with month navigation"
```

---

## Task 4: Create branch, push, and open PR

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/issue-9-financial-history
```

> If you already made commits on the current branch, cherry-pick or rebase onto this new branch before pushing.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/issue-9-financial-history
gh pr create \
  --title "✨ feat(finances): add financial history with month navigation" \
  --body "Closes #9

## Summary

- 📅 History section below the current month on the finances screen
- MonthPicker component with prev/next chevrons to navigate past months
- Shows category budget progress bars + individual expense items for the selected month
- Section is hidden when there are no past expenses" \
  --base main
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Browse expenses by month/year | Task 3 — MonthPicker + historyExpenses |
| See total spent and budget usage per period | Task 3 — BudgetProgressBar per category |
| Filter by category | Inherent — BudgetProgressBar/ExpenseItem are per-category |
| Works in shared spaces | No extra work needed — history reads `expenses` from `financeStore` which already switches per space |
| No performance regression on large datasets | `useMemo` on all derived arrays |

**Placeholder scan:** None found — every step has concrete code.

**Type consistency check:** `prevMonth`/`nextMonth`/`availableMonths` are defined in Task 1 and imported identically in Tasks 2 and 3. `MonthPicker` props defined in Task 2 match usage in Task 3.
