export const setNotificationHandler = jest.fn();
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('mock-notification-id');
