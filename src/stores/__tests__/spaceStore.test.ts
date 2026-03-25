import type { Space, SpaceMember } from '../spaceStore';
import { useSpaceStore } from '../spaceStore';

const space1: Space = {
  id: 's1',
  name: 'Family',
  ownerId: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
};
const space2: Space = { id: 's2', name: 'Work', ownerId: 'u2', createdAt: '2026-02-01T00:00:00Z' };

const member1: SpaceMember = {
  id: 'm1',
  spaceId: 's1',
  userId: 'u1',
  invitedEmail: 'a@a.com',
  role: 'owner',
  status: 'accepted',
  invitedAt: '2026-01-01T00:00:00Z',
  acceptedAt: '2026-01-01T00:00:00Z',
};
const member2: SpaceMember = {
  id: 'm2',
  spaceId: 's1',
  userId: 'u2',
  invitedEmail: 'b@b.com',
  role: 'member',
  status: 'pending',
  invitedAt: '2026-01-02T00:00:00Z',
  acceptedAt: null,
};

beforeEach(() => {
  useSpaceStore.setState({
    activeSpaceId: null,
    spaces: [],
    members: [],
    pendingInvites: [],
    isLoading: false,
  });
});

describe('spaceStore', () => {
  it('starts with default state', () => {
    const s = useSpaceStore.getState();
    expect(s.activeSpaceId).toBeNull();
    expect(s.spaces).toHaveLength(0);
    expect(s.members).toHaveLength(0);
    expect(s.pendingInvites).toHaveLength(0);
    expect(s.isLoading).toBe(false);
  });

  it('setActiveSpaceId updates activeSpaceId', () => {
    useSpaceStore.getState().setActiveSpaceId('s1');
    expect(useSpaceStore.getState().activeSpaceId).toBe('s1');
    useSpaceStore.getState().setActiveSpaceId(null);
    expect(useSpaceStore.getState().activeSpaceId).toBeNull();
  });

  it('setSpaces replaces spaces list', () => {
    useSpaceStore.getState().setSpaces([space1, space2]);
    expect(useSpaceStore.getState().spaces).toHaveLength(2);
    useSpaceStore.getState().setSpaces([space1]);
    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().spaces[0].name).toBe('Family');
  });

  it('setMembers replaces members list', () => {
    useSpaceStore.getState().setMembers([member1, member2]);
    expect(useSpaceStore.getState().members).toHaveLength(2);
  });

  it('setPendingInvites replaces pending invites', () => {
    const invite = { ...space1, memberId: 'mi1' };
    useSpaceStore.getState().setPendingInvites([invite]);
    expect(useSpaceStore.getState().pendingInvites).toHaveLength(1);
    expect(useSpaceStore.getState().pendingInvites[0].memberId).toBe('mi1');
  });

  it('setLoading updates isLoading', () => {
    useSpaceStore.getState().setLoading(true);
    expect(useSpaceStore.getState().isLoading).toBe(true);
    useSpaceStore.getState().setLoading(false);
    expect(useSpaceStore.getState().isLoading).toBe(false);
  });
});
