export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  order: number;
  dueDate?: number;
  reminderAt?: number;
  recurring: {
    enabled: boolean;
    days: number[]; // 0 = Sunday, 6 = Saturday
  };
  createdAt: number;
  completedAt?: number;
}
