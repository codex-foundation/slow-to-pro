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
