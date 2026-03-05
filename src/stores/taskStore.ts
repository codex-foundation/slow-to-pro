import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Priority, Task } from '@/models/task';
import { todayString, todayWeekday } from '@/utils/date';
import { mmkvStorage } from '@/utils/mmkv';
import { scheduleTaskReminderNotification } from '@/utils/notifications';

interface TaskStore {
  tasks: Task[];
  lastResetDate: string;
  addTask: (data: {
    title: string;
    priority: Priority;
    recurring: Task['recurring'];
    dueDate?: number;
    reminderAt?: number;
  }) => string;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  reorderTasks: (tasks: Task[]) => void;
  resetRecurringTasksIfNewDay: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      lastResetDate: todayString(),

      addTask: ({ title, priority, recurring, dueDate, reminderAt }) => {
        const tasks = get().tasks;
        const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) : -1;
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          priority,
          order: maxOrder + 1,
          dueDate,
          reminderAt,
          recurring,
          createdAt: Date.now(),
        };
        set({ tasks: [...tasks, task] });

        if (reminderAt && reminderAt > Date.now()) {
          void scheduleTaskReminderNotification(title, reminderAt);
        }

        return task.id;
      },

      toggleTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? Date.now() : undefined,
                }
              : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      updateTask: (id, updates) => {
        const current = get().tasks.find((t) => t.id === id);

        if (updates.reminderAt && updates.reminderAt > Date.now()) {
          const reminderTitle = updates.title ?? current?.title;
          if (reminderTitle) {
            void scheduleTaskReminderNotification(reminderTitle, updates.reminderAt);
          }
        }

        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      reorderTasks: (reordered) => {
        set({
          tasks: reordered.map((t, i) => ({ ...t, order: i })),
        });
      },

      resetRecurringTasksIfNewDay: () => {
        const today = todayString();
        if (get().lastResetDate === today) return;
        const weekday = todayWeekday();
        set((s) => ({
          lastResetDate: today,
          tasks: s.tasks.map((t) => {
            if (t.recurring.enabled && t.recurring.days.includes(weekday)) {
              return { ...t, completed: false, completedAt: undefined };
            }
            return t;
          }),
        }));
      },
    }),
    {
      name: 'task-store',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
