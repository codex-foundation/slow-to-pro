import { useTaskStore } from '../../stores/taskStore';
import { todayString } from '../../utils/date';
import { scheduleTaskReminderNotification } from '../../utils/notifications';

jest.mock('../../utils/notifications', () => ({
  scheduleTaskReminderNotification: jest.fn(),
  scheduleTimerEndNotification: jest.fn(),
  scheduleOverBudgetNotification: jest.fn(),
}));

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  useTaskStore.setState({ tasks: [], lastResetDate: todayString() });
  jest.clearAllMocks();
});

describe('taskStore', () => {
  describe('addTask', () => {
    it('adds a task with the given title and priority', () => {
      useTaskStore.getState().addTask({
        title: 'Buy groceries',
        priority: 'high',
        recurring: { enabled: false, days: [] },
      });

      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Buy groceries');
      expect(tasks[0].priority).toBe('high');
    });

    it('creates the task as not completed', () => {
      useTaskStore.getState().addTask({
        title: 'test',
        priority: 'low',
        recurring: { enabled: false, days: [] },
      });
      expect(useTaskStore.getState().tasks[0].completed).toBe(false);
    });

    it('assigns incrementing order values', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const { tasks } = useTaskStore.getState();
      expect(tasks[1].order).toBeGreaterThan(tasks[0].order);
    });

    it('generates a unique id for each task', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const ids = useTaskStore.getState().tasks.map((t) => t.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('returns created task id', () => {
      const id = useTaskStore
        .getState()
        .addTask({ title: 'Link me', priority: 'medium', recurring: { enabled: false, days: [] } });

      expect(typeof id).toBe('string');
      expect(useTaskStore.getState().tasks.some((t) => t.id === id)).toBe(true);
    });

    it('persists due date and reminder when provided', () => {
      const dueDate = Date.parse('2026-03-20T23:59:00.000Z');
      const reminderAt = Date.now() + 60 * 60 * 1000;

      useTaskStore.getState().addTask({
        title: 'Prepare report',
        priority: 'high',
        recurring: { enabled: false, days: [] },
        dueDate,
        reminderAt,
      });

      const task = useTaskStore.getState().tasks[0];
      expect(task.dueDate).toBe(dueDate);
      expect(task.reminderAt).toBe(reminderAt);
    });

    it('schedules a reminder for future reminderAt values', () => {
      const reminderAt = Date.now() + 30 * 60 * 1000;

      useTaskStore.getState().addTask({
        title: 'Future reminder',
        priority: 'medium',
        recurring: { enabled: false, days: [] },
        reminderAt,
      });

      expect(scheduleTaskReminderNotification).toHaveBeenCalledWith('Future reminder', reminderAt);
    });

    it('does not schedule reminder for past reminderAt values', () => {
      const reminderAt = Date.now() - 30 * 60 * 1000;

      useTaskStore.getState().addTask({
        title: 'Past reminder',
        priority: 'low',
        recurring: { enabled: false, days: [] },
        reminderAt,
      });

      expect(scheduleTaskReminderNotification).not.toHaveBeenCalled();
    });
  });

  describe('toggleTask', () => {
    it('marks an incomplete task as completed and sets completedAt', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'test', priority: 'medium', recurring: { enabled: false, days: [] } });
      const id = useTaskStore.getState().tasks[0].id;

      useTaskStore.getState().toggleTask(id);

      const task = useTaskStore.getState().tasks[0];
      expect(task.completed).toBe(true);
      expect(task.completedAt).toBeDefined();
    });

    it('marks a completed task as incomplete and clears completedAt', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'test', priority: 'medium', recurring: { enabled: false, days: [] } });
      const id = useTaskStore.getState().tasks[0].id;

      useTaskStore.getState().toggleTask(id); // complete
      useTaskStore.getState().toggleTask(id); // uncomplete

      const task = useTaskStore.getState().tasks[0];
      expect(task.completed).toBe(false);
      expect(task.completedAt).toBeUndefined();
    });
  });

  describe('updateTask', () => {
    it('updates editable fields including priority, dueDate and reminderAt', () => {
      const id = useTaskStore.getState().addTask({
        title: 'Original',
        priority: 'low',
        recurring: { enabled: false, days: [] },
      });

      const dueDate = Date.parse('2026-03-30T23:59:00.000Z');
      const reminderAt = Date.now() + 60 * 60 * 1000;

      useTaskStore.getState().updateTask(id, {
        title: 'Updated',
        priority: 'high',
        dueDate,
        reminderAt,
      });

      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.title).toBe('Updated');
      expect(task?.priority).toBe('high');
      expect(task?.dueDate).toBe(dueDate);
      expect(task?.reminderAt).toBe(reminderAt);
    });

    it('schedules reminder when updateTask sets a future reminderAt', () => {
      const id = useTaskStore.getState().addTask({
        title: 'Edit me',
        priority: 'medium',
        recurring: { enabled: false, days: [] },
      });
      const reminderAt = Date.now() + 15 * 60 * 1000;

      useTaskStore.getState().updateTask(id, { reminderAt });

      expect(scheduleTaskReminderNotification).toHaveBeenCalledWith('Edit me', reminderAt);
    });
  });

  describe('deleteTask', () => {
    it('removes the task by id', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const id = useTaskStore.getState().tasks[0].id;

      useTaskStore.getState().deleteTask(id);

      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('B');
    });
  });

  describe('reorderTasks', () => {
    it('updates order to match array position', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const [a, b] = useTaskStore.getState().tasks;

      // Reverse the order
      useTaskStore.getState().reorderTasks([b, a]);

      const reordered = useTaskStore.getState().tasks;
      expect(reordered[0].title).toBe('B');
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].title).toBe('A');
      expect(reordered[1].order).toBe(1);
    });
  });

  describe('resetRecurringTasksIfNewDay', () => {
    it('does nothing if lastResetDate is today', () => {
      useTaskStore.getState().addTask({
        title: 'Feed cats',
        priority: 'high',
        recurring: { enabled: true, days: [0, 1, 2, 3, 4, 5, 6] },
      });
      const id = useTaskStore.getState().tasks[0].id;
      useTaskStore.getState().toggleTask(id); // mark complete

      useTaskStore.getState().resetRecurringTasksIfNewDay();

      // Should remain completed since lastResetDate is still today
      expect(useTaskStore.getState().tasks[0].completed).toBe(true);
    });

    it('resets recurring tasks when lastResetDate is in the past', () => {
      const weekday = new Date().getDay();
      useTaskStore.setState({ lastResetDate: yesterday() });
      useTaskStore.getState().addTask({
        title: 'Feed cats',
        priority: 'high',
        recurring: { enabled: true, days: [weekday] },
      });
      const id = useTaskStore.getState().tasks[0].id;
      useTaskStore.getState().toggleTask(id);

      useTaskStore.getState().resetRecurringTasksIfNewDay();

      expect(useTaskStore.getState().tasks[0].completed).toBe(false);
      expect(useTaskStore.getState().lastResetDate).toBe(todayString());
    });

    it('does not reset recurring tasks not scheduled for today', () => {
      const today = new Date().getDay();
      // Pick a day that is NOT today
      const otherDay = (today + 1) % 7;
      useTaskStore.setState({ lastResetDate: yesterday() });
      useTaskStore.getState().addTask({
        title: 'Weekly task',
        priority: 'low',
        recurring: { enabled: true, days: [otherDay] },
      });
      const id = useTaskStore.getState().tasks[0].id;
      useTaskStore.getState().toggleTask(id);

      useTaskStore.getState().resetRecurringTasksIfNewDay();

      expect(useTaskStore.getState().tasks[0].completed).toBe(true);
    });
  });
});
