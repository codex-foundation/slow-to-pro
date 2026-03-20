import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { SharedSpaceModal } from '../SharedSpaceModal';

// ---------- mocks ----------

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name?: string; testID?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name ?? 'icon'),
  };
});

const mockCreateSpace = jest.fn();
const mockDeleteSpace = jest.fn();
const mockInviteMember = jest.fn();
const mockLeaveSpace = jest.fn();
const mockLoadSpaces = jest.fn();
const mockPullSharedSpace = jest.fn();
const mockPushToSharedSpace = jest.fn();
const mockRespondToInvite = jest.fn();

jest.mock('@/services/spaceSync', () => ({
  createSpace: (...args: unknown[]) => mockCreateSpace(...args),
  deleteSpace: (...args: unknown[]) => mockDeleteSpace(...args),
  inviteMember: (...args: unknown[]) => mockInviteMember(...args),
  leaveSpace: (...args: unknown[]) => mockLeaveSpace(...args),
  loadSpaces: (...args: unknown[]) => mockLoadSpaces(...args),
  pullSharedSpace: (...args: unknown[]) => mockPullSharedSpace(...args),
  pushToSharedSpace: (...args: unknown[]) => mockPushToSharedSpace(...args),
  removeMember: jest.fn(),
  respondToInvite: (...args: unknown[]) => mockRespondToInvite(...args),
}));

const mockPullForCurrentUser = jest.fn();
jest.mock('@/services/cloudSync', () => ({
  pullForCurrentUser: (...args: unknown[]) => mockPullForCurrentUser(...args),
  syncFromCloudOrSeed: jest.fn(),
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
  isSupabaseConfigured: true,
}));

let mockSpaceStoreState = {
  spaces: [] as { id: string; name: string; ownerId: string; createdAt: string }[],
  members: [] as {
    id: string;
    spaceId: string;
    userId: string | null;
    invitedEmail: string;
    role: string;
    status: string;
    invitedAt: string;
    acceptedAt: string | null;
  }[],
  pendingInvites: [] as {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    memberId: string;
  }[],
  activeSpaceId: null as string | null,
  setActiveSpaceId: jest.fn(),
};

jest.mock('@/stores/spaceStore', () => ({
  useSpaceStore: Object.assign(
    (selector?: (s: typeof mockSpaceStoreState) => unknown) => {
      if (selector) return selector(mockSpaceStoreState);
      return mockSpaceStoreState;
    },
    {
      getState: () => mockSpaceStoreState,
    }
  ),
}));

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
    background: '#F2F2F7',
  }),
}));

// Mock Modal to render children directly so we can interact with contents
jest.mock('../Modal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, Text, TouchableOpacity } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');
  return {
    Modal: ({
      visible,
      onClose,
      title,
      children,
    }: {
      visible: boolean;
      onClose: () => void;
      title: string;
      children: React.ReactNode;
    }) => {
      if (!visible) return null;
      return React.createElement(
        View,
        { testID: 'modal-container' },
        React.createElement(Text, null, title),
        React.createElement(TouchableOpacity, { testID: 'modal-close', onPress: onClose }),
        children
      );
    },
  };
});

// ---------- helpers ----------

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
};

function resetStore(overrides: Partial<typeof mockSpaceStoreState> = {}) {
  mockSpaceStoreState = {
    spaces: [],
    members: [],
    pendingInvites: [],
    activeSpaceId: null,
    setActiveSpaceId: jest.fn(),
    ...overrides,
  };
}

// ---------- tests ----------

describe('SharedSpaceModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(<SharedSpaceModal visible={false} onClose={jest.fn()} />);
    expect(queryByTestId('modal-container')).toBeNull();
  });

  it('renders the spaces tab by default', () => {
    const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
    expect(getByText('spaces')).toBeTruthy();
    expect(getByText('Invites')).toBeTruthy();
    expect(getByText('create')).toBeTruthy();
    expect(getByText('Personal')).toBeTruthy();
  });

  it('shows pending invite count in tab label', () => {
    resetStore({
      pendingInvites: [
        { id: 'sp1', name: 'Space 1', ownerId: 'u1', createdAt: '', memberId: 'mb1' },
      ],
    });
    const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
    expect(getByText('Invites (1)')).toBeTruthy();
  });

  it('switches to invites tab', () => {
    resetStore({
      pendingInvites: [
        { id: 'sp1', name: 'Team Alpha', ownerId: 'u2', createdAt: '', memberId: 'mb1' },
      ],
    });
    const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
    fireEvent.press(getByText('Invites (1)'));
    expect(getByText('Team Alpha')).toBeTruthy();
  });

  it('shows no invitations message when empty', () => {
    const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
    fireEvent.press(getByText('Invites'));
    expect(getByText('No pending invitations.')).toBeTruthy();
  });

  it('switches to create tab', () => {
    const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
    fireEvent.press(getByText('create'));
    expect(getByPlaceholderText('e.g. Family, Work Team…')).toBeTruthy();
    expect(getByText('Create Space')).toBeTruthy();
  });

  it('calls loadSpaces on refresh button press', async () => {
    mockLoadSpaces.mockResolvedValue(undefined);
    const { getByTestId } = render(<SharedSpaceModal {...defaultProps} />);
    // The refresh icon is rendered as "icon-refresh-outline"
    fireEvent.press(getByTestId('icon-refresh-outline'));
    await waitFor(() => {
      expect(mockLoadSpaces).toHaveBeenCalledTimes(1);
    });
  });

  describe('create space', () => {
    it('calls createSpace when submitting a name', async () => {
      mockCreateSpace.mockResolvedValue({ space: { id: 'sp1', name: 'My Space' }, error: null });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('create'));
      fireEvent.changeText(getByPlaceholderText('e.g. Family, Work Team…'), 'My Space');
      fireEvent.press(getByText('Create Space'));
      await waitFor(() => {
        expect(mockCreateSpace).toHaveBeenCalledWith('My Space');
      });
    });

    it('shows alert when createSpace returns an error', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockCreateSpace.mockResolvedValue({ space: null, error: 'DB error' });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('create'));
      fireEvent.changeText(getByPlaceholderText('e.g. Family, Work Team…'), 'Bad Space');
      fireEvent.press(getByText('Create Space'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Could not create space', 'DB error');
      });
      alertSpy.mockRestore();
    });

    it('does not call createSpace when name is empty', () => {
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('create'));
      fireEvent.press(getByText('Create Space'));
      expect(mockCreateSpace).not.toHaveBeenCalled();
    });
  });

  describe('spaces tab with a space', () => {
    const space = { id: 'sp1', name: 'Family', ownerId: 'user-1', createdAt: '' };

    beforeEach(() => {
      resetStore({
        spaces: [space],
        members: [
          {
            id: 'm1',
            spaceId: 'sp1',
            userId: 'user-1',
            invitedEmail: 'me@example.com',
            role: 'owner',
            status: 'accepted',
            invitedAt: '',
            acceptedAt: null,
          },
        ],
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    });

    it('renders space name and member count', () => {
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      expect(getByText('Family')).toBeTruthy();
      expect(getByText('1 member')).toBeTruthy();
    });

    it('shows Delete button when user is the owner', async () => {
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Delete')).toBeTruthy();
      });
    });

    it('shows Leave button when user is not the owner', async () => {
      resetStore({
        spaces: [{ ...space, ownerId: 'other-user' }],
        members: [],
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Leave')).toBeTruthy();
      });
    });

    it('shows inline invite form when Invite is pressed', () => {
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('Invite'));
      expect(getByPlaceholderText('friend@example.com')).toBeTruthy();
    });

    it('calls inviteMember with space id and email', async () => {
      mockInviteMember.mockResolvedValue({ error: null });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('Invite'));
      fireEvent.changeText(getByPlaceholderText('friend@example.com'), 'friend@test.com');
      fireEvent.press(getByText('Send'));
      await waitFor(() => {
        expect(mockInviteMember).toHaveBeenCalledWith('sp1', 'friend@test.com');
      });
    });

    it('shows alert when inviteMember fails', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockInviteMember.mockResolvedValue({ error: 'Not found' });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('Invite'));
      fireEvent.changeText(getByPlaceholderText('friend@example.com'), 'x@test.com');
      fireEvent.press(getByText('Send'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Invite failed', 'Not found');
      });
      alertSpy.mockRestore();
    });

    it('calls deleteSpace via Alert confirmation (owner)', async () => {
      mockDeleteSpace.mockResolvedValue(undefined);
      let alertCallback: (() => void) | undefined;
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        alertCallback = destructiveBtn?.onPress as (() => void) | undefined;
      });

      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => {
        getByText('Delete');
      });
      fireEvent.press(getByText('Delete'));
      expect(alertSpy).toHaveBeenCalled();
      alertCallback?.();
      await waitFor(() => {
        expect(mockDeleteSpace).toHaveBeenCalledWith('sp1');
      });
      alertSpy.mockRestore();
    });

    it('calls leaveSpace via Alert confirmation (non-owner)', async () => {
      resetStore({
        spaces: [{ ...space, ownerId: 'other-user' }],
        members: [],
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockLeaveSpace.mockResolvedValue(undefined);
      let alertCallback: (() => void) | undefined;
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        alertCallback = destructiveBtn?.onPress as (() => void) | undefined;
      });

      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => {
        getByText('Leave');
      });
      fireEvent.press(getByText('Leave'));
      expect(alertSpy).toHaveBeenCalled();
      alertCallback?.();
      await waitFor(() => {
        expect(mockLeaveSpace).toHaveBeenCalledWith('sp1');
      });
      alertSpy.mockRestore();
    });

    it('switches to a shared space (handleSwitch with spaceId)', async () => {
      mockPullSharedSpace.mockResolvedValue(undefined);
      const onClose = jest.fn();
      const { getByText } = render(<SharedSpaceModal visible={true} onClose={onClose} />);
      fireEvent.press(getByText('Family'));
      await waitFor(() => {
        expect(mockSpaceStoreState.setActiveSpaceId).toHaveBeenCalledWith('sp1');
        expect(mockPullSharedSpace).toHaveBeenCalledWith('sp1');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('switches back to personal (handleSwitch null) when in a space', async () => {
      resetStore({
        spaces: [space],
        members: [],
        activeSpaceId: 'sp1',
      });
      mockPushToSharedSpace.mockResolvedValue(undefined);
      mockPullForCurrentUser.mockResolvedValue(undefined);
      const onClose = jest.fn();
      const { getByText } = render(<SharedSpaceModal visible={true} onClose={onClose} />);
      fireEvent.press(getByText('Personal'));
      await waitFor(() => {
        expect(mockPushToSharedSpace).toHaveBeenCalledWith('sp1');
        expect(mockSpaceStoreState.setActiveSpaceId).toHaveBeenCalledWith(null);
        expect(mockPullForCurrentUser).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  it('sets currentUserId to null when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    // Space owned by 'other-user'. Leave button shows when currentUserId !== ownerId.
    resetStore({
      spaces: [{ id: 'sp1', name: 'Family', ownerId: 'other-user', createdAt: '' }],
      members: [],
    });
    const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('Leave')).toBeTruthy();
    });
    expect(mockGetUser).toHaveBeenCalled();
  });

  describe('handleCreate finally block', () => {
    it('resets busy after successful create', async () => {
      mockCreateSpace.mockResolvedValue({ space: { id: 'sp1', name: 'New' }, error: null });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('create'));
      fireEvent.changeText(getByPlaceholderText('e.g. Family, Work Team\u2026'), 'New');
      fireEvent.press(getByText('Create Space'));
      await waitFor(() => {
        // After success, tab switches back to 'spaces'
        expect(getByText('Personal')).toBeTruthy();
      });
    });

    it('resets busy after failed create', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockCreateSpace.mockResolvedValue({ space: null, error: null });
      const { getByText, getByPlaceholderText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('create'));
      fireEvent.changeText(getByPlaceholderText('e.g. Family, Work Team\u2026'), 'Bad');
      fireEvent.press(getByText('Create Space'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Could not create space', 'Unknown error');
      });
      alertSpy.mockRestore();
    });
  });

  describe('spaces tab with active space actions', () => {
    const space = { id: 'sp1', name: 'Squad', ownerId: 'user-1', createdAt: '' };

    beforeEach(() => {
      resetStore({
        spaces: [space],
        members: [
          {
            id: 'm1',
            spaceId: 'sp1',
            userId: 'user-1',
            invitedEmail: 'me@example.com',
            role: 'owner',
            status: 'accepted',
            invitedAt: '',
            acceptedAt: null,
          },
        ],
        activeSpaceId: 'sp1',
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    });

    it('calls pullForCurrentUser after leave when space was active', async () => {
      resetStore({
        spaces: [{ ...space, ownerId: 'other-user' }],
        members: [],
        activeSpaceId: 'sp1',
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockLeaveSpace.mockResolvedValue(undefined);
      mockPullForCurrentUser.mockResolvedValue(undefined);

      let alertCallback: (() => void) | undefined;
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        alertCallback = destructiveBtn?.onPress as (() => void) | undefined;
      });

      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => getByText('Leave'));
      fireEvent.press(getByText('Leave'));
      expect(alertSpy).toHaveBeenCalled();
      alertCallback?.();
      await waitFor(() => {
        expect(mockLeaveSpace).toHaveBeenCalledWith('sp1');
        expect(mockPullForCurrentUser).toHaveBeenCalled();
      });
      alertSpy.mockRestore();
    });

    it('calls pullForCurrentUser after delete when space was active', async () => {
      mockDeleteSpace.mockResolvedValue(undefined);
      mockPullForCurrentUser.mockResolvedValue(undefined);

      let alertCallback: (() => void) | undefined;
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        alertCallback = destructiveBtn?.onPress as (() => void) | undefined;
      });

      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      await waitFor(() => getByText('Delete'));
      fireEvent.press(getByText('Delete'));
      expect(alertSpy).toHaveBeenCalled();
      alertCallback?.();
      await waitFor(() => {
        expect(mockDeleteSpace).toHaveBeenCalledWith('sp1');
        expect(mockPullForCurrentUser).toHaveBeenCalled();
      });
      alertSpy.mockRestore();
    });
  });

  describe('invites tab – respond to invite', () => {
    const invite = { id: 'sp2', name: 'Work Team', ownerId: 'u2', createdAt: '', memberId: 'mb1' };

    beforeEach(() => {
      resetStore({ pendingInvites: [invite] });
      mockRespondToInvite.mockResolvedValue(undefined);
    });

    it('accepts an invite', async () => {
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('Invites (1)'));
      fireEvent.press(getByText('Accept'));
      await waitFor(() => {
        expect(mockRespondToInvite).toHaveBeenCalledWith('mb1', 'accepted');
        expect(mockSpaceStoreState.setActiveSpaceId).toHaveBeenCalledWith('sp2');
      });
    });

    it('declines an invite', async () => {
      const { getByText } = render(<SharedSpaceModal {...defaultProps} />);
      fireEvent.press(getByText('Invites (1)'));
      fireEvent.press(getByText('Decline'));
      await waitFor(() => {
        expect(mockRespondToInvite).toHaveBeenCalledWith('mb1', 'declined');
      });
    });
  });
});
