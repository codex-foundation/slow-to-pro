import { useEntitlementStore } from '../../stores/entitlementStore';

beforeEach(() => {
  useEntitlementStore.setState({ isPro: false, isRcPro: false, isLoading: true });
});

describe('entitlementStore', () => {
  it('has correct initial state', () => {
    const state = useEntitlementStore.getState();
    expect(state.isPro).toBe(false);
    expect(state.isRcPro).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('setIsPro updates isPro', () => {
    useEntitlementStore.getState().setIsPro(true);
    expect(useEntitlementStore.getState().isPro).toBe(true);
    useEntitlementStore.getState().setIsPro(false);
    expect(useEntitlementStore.getState().isPro).toBe(false);
  });

  it('setIsRcPro updates isRcPro', () => {
    useEntitlementStore.getState().setIsRcPro(true);
    expect(useEntitlementStore.getState().isRcPro).toBe(true);
    useEntitlementStore.getState().setIsRcPro(false);
    expect(useEntitlementStore.getState().isRcPro).toBe(false);
  });

  it('setLoading updates isLoading', () => {
    useEntitlementStore.getState().setLoading(false);
    expect(useEntitlementStore.getState().isLoading).toBe(false);
    useEntitlementStore.getState().setLoading(true);
    expect(useEntitlementStore.getState().isLoading).toBe(true);
  });
});
