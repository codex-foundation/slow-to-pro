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
  useTaskStore.setState({ tasks: [], categories: [], lastResetDate: todayString() });
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

    it('stores categoryId when provided', () => {
      const { addCategory, addTask } = useTaskStore.getState();
      addCategory('Work', '#6366f1');
      const catId = useTaskStore.getState().categories[0].id;

      addTask({
        title: 'Tagged',
        priority: 'medium',
        recurring: { enabled: false, days: [] },
        categoryId: catId,
      });

      expect(useTaskStore.getState().tasks[0].categoryId).toBe(catId);
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

    it('only toggles the matched task and leaves others unchanged', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const idA = useTaskStore.getState().tasks[0].id;

      useTaskStore.getState().toggleTask(idA);

      expect(useTaskStore.getState().tasks[0].completed).toBe(true);
      expect(useTaskStore.getState().tasks[1].completed).toBe(false);
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

    it('schedules reminder using current task title when updates.title is not provided', () => {
      const id = useTaskStore.getState().addTask({
        title: 'Existing title',
        priority: 'low',
        recurring: { enabled: false, days: [] },
      });
      const reminderAt = Date.now() + 10 * 60 * 1000;

      // No title in updates — should fall back to current task's title
      useTaskStore.getState().updateTask(id, { reminderAt });

      expect(scheduleTaskReminderNotification).toHaveBeenCalledWith('Existing title', reminderAt);
    });

    it('does not schedule reminder when reminderAt is in the past', () => {
      const id = useTaskStore.getState().addTask({
        title: 'Past task',
        priority: 'low',
        recurring: { enabled: false, days: [] },
      });
      const reminderAt = Date.now() - 5 * 60 * 1000;

      useTaskStore.getState().updateTask(id, { reminderAt });

      expect(scheduleTaskReminderNotification).not.toHaveBeenCalled();
    });

    it('does not schedule reminder when task id does not exist and no title in updates', () => {
      useTaskStore.getState().updateTask('non-existent-id', { reminderAt: Date.now() + 5000 });

      expect(scheduleTaskReminderNotification).not.toHaveBeenCalled();
    });

    it('leaves other tasks unchanged when updating one task', () => {
      useTaskStore
        .getState()
        .addTask({ title: 'A', priority: 'low', recurring: { enabled: false, days: [] } });
      useTaskStore
        .getState()
        .addTask({ title: 'B', priority: 'low', recurring: { enabled: false, days: [] } });
      const idA = useTaskStore.getState().tasks[0].id;

      useTaskStore.getState().updateTask(idA, { title: 'A updated' });

      expect(useTaskStore.getState().tasks[0].title).toBe('A updated');
      expect(useTaskStore.getState().tasks[1].title).toBe('B');
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
    it('does not reset non-recurring completed tasks', () => {
      useTaskStore.setState({ lastResetDate: yesterday() });
      useTaskStore.getState().addTask({
        title: 'One-off task',
        priority: 'high',
        recurring: { enabled: false, days: [] },
      });
      const id = useTaskStore.getState().tasks[0].id;
      useTaskStore.getState().toggleTask(id);

      useTaskStore.getState().resetRecurringTasksIfNewDay();

      expect(useTaskStore.getState().tasks[0].completed).toBe(true);
    });
  });

  describe('categories', () => {
    it('addCategory creates a category with a unique id, name, and color', () => {
      useTaskStore.getState().addCategory('Work', '#6366f1');

      const { categories } = useTaskStore.getState();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Work');
      expect(categories[0].color).toBe('#6366f1');
      expect(typeof categories[0].id).toBe('string');
    });

    it('addCategory generates unique ids for each category', () => {
      useTaskStore.getState().addCategory('Work', '#6366f1');
      useTaskStore.getState().addCategory('Personal', '#22c55e');

      const ids = useTaskStore.getState().categories.map((c) => c.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('updateCategory renames a category', () => {
      useTaskStore.getState().addCategory('Old Name', '#ef4444');
      const id = useTaskStore.getState().categories[0].id;

      useTaskStore.getState().updateCategory(id, { name: 'New Name' });

      expect(useTaskStore.getState().categories[0].name).toBe('New Name');
    });

    it('updateCategory changes a category color', () => {
      useTaskStore.getState().addCategory('Work', '#ef4444');
      const id = useTaskStore.getState().categories[0].id;

      useTaskStore.getState().updateCategory(id, { color: '#6366f1' });

      expect(useTaskStore.getState().categories[0].color).toBe('#6366f1');
    });

    it('updateCategory leaves other categories unchanged', () => {
      useTaskStore.getState().addCategory('A', '#ef4444');
      useTaskStore.getState().addCategory('B', '#22c55e');
      const idA = useTaskStore.getState().categories[0].id;

      useTaskStore.getState().updateCategory(idA, { name: 'A updated' });

      expect(useTaskStore.getState().categories[1].name).toBe('B');
    });

    it('deleteCategory removes the category', () => {
      useTaskStore.getState().addCategory('Work', '#6366f1');
      const id = useTaskStore.getState().categories[0].id;

      useTaskStore.getState().deleteCategory(id);

      expect(useTaskStore.getState().categories).toHaveLength(0);
    });

    it('deleteCategory clears categoryId from tasks that used it', () => {
      useTaskStore.getState().addCategory('Work', '#6366f1');
      const catId = useTaskStore.getState().categories[0].id;
      useTaskStore.getState().addTask({
        title: 'Tagged task',
        priority: 'medium',
        recurring: { enabled: false, days: [] },
        categoryId: catId,
      });

      useTaskStore.getState().deleteCategory(catId);

      expect(useTaskStore.getState().tasks[0].categoryId).toBeUndefined();
    });

    it('deleteCategory does not affect tasks with a different category', () => {
      useTaskStore.getState().addCategory('Work', '#6366f1');
      useTaskStore.getState().addCategory('Personal', '#22c55e');
      const [catWork, catPersonal] = useTaskStore.getState().categories;
      useTaskStore.getState().addTask({
        title: 'Personal task',
        priority: 'low',
        recurring: { enabled: false, days: [] },
        categoryId: catPersonal.id,
      });

      useTaskStore.getState().deleteCategory(catWork.id);

      expect(useTaskStore.getState().tasks[0].categoryId).toBe(catPersonal.id);
    });
  });
});
