import { create } from 'zustand';

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string | null;
  invitedEmail: string;
  role: 'owner' | 'member';
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
  acceptedAt: string | null;
}

export interface Space {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

interface SpaceStore {
  // The active space ID — null means "personal" (no shared space)
  activeSpaceId: string | null;
  spaces: Space[];
  members: SpaceMember[];
  // Pending invites for the current user (spaces they've been invited to)
  pendingInvites: (Space & { memberId: string })[];
  isLoading: boolean;
  isSwitching: boolean;
  setActiveSpaceId: (id: string | null) => void;
  setSpaces: (spaces: Space[]) => void;
  setMembers: (members: SpaceMember[]) => void;
  setPendingInvites: (invites: (Space & { memberId: string })[]) => void;
  setLoading: (v: boolean) => void;
  setSwitching: (v: boolean) => void;
}

export const useSpaceStore = create<SpaceStore>()((set) => ({
  activeSpaceId: null,
  spaces: [],
  members: [],
  pendingInvites: [],
  isLoading: false,
  isSwitching: false,
  setActiveSpaceId: (id) => set({ activeSpaceId: id }),
  setSpaces: (spaces) => set({ spaces }),
  setMembers: (members) => set({ members }),
  setPendingInvites: (pendingInvites) => set({ pendingInvites }),
  setLoading: (isLoading) => set({ isLoading }),
  setSwitching: (isSwitching) => set({ isSwitching }),
}));
