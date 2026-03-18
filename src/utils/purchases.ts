import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesOffering } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { useEntitlementStore } from '@/stores/entitlementStore';

export const PRO_ENTITLEMENT = 'pro';

async function syncProStatusToDb(isPro: boolean): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_profiles')
    .upsert(
      { user_id: user.id, is_pro: isPro, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
}

export async function readProStatusFromDb(): Promise<boolean> {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('user_profiles')
    .select('is_pro')
    .eq('user_id', user.id)
    .single();
  return data?.is_pro === true;
}

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '';
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

export function isRevenueCatConfigured(): boolean {
  return Platform.OS === 'ios' ? API_KEY_IOS.length > 0 : API_KEY_ANDROID.length > 0;
}

export async function initializePurchases(): Promise<void> {
  if (!isRevenueCatConfigured()) {
    // Still read DB flag so manually-granted Pro is respected
    const dbIsPro = await readProStatusFromDb();
    useEntitlementStore.getState().setIsPro(dbIsPro);
    useEntitlementStore.getState().setLoading(false);
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
    Purchases.configure({ apiKey });

    await refreshEntitlements();
  } catch {
    useEntitlementStore.getState().setLoading(false);
  }
}

export async function refreshEntitlements(): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  const { setIsPro, setIsRcPro, setLoading } = useEntitlementStore.getState();
  try {
    const [info, dbIsPro] = await Promise.all([Purchases.getCustomerInfo(), readProStatusFromDb()]);
    const rcIsPro = info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
    const isPro = rcIsPro || dbIsPro;
    setIsRcPro(rcIsPro);
    setIsPro(isPro);
    void syncProStatusToDb(isPro);
  } finally {
    setLoading(false);
  }
}

/**
 * Refresh Pro status from both RevenueCat and DB.
 * Safe to call after login — handles both RC and non-RC environments.
 */
export async function refreshProStatus(): Promise<void> {
  if (isRevenueCatConfigured()) {
    await refreshEntitlements();
  } else {
    const dbIsPro = await readProStatusFromDb();
    useEntitlementStore.getState().setIsPro(dbIsPro);
    useEntitlementStore.getState().setLoading(false);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isRevenueCatConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(
  pkg: Awaited<ReturnType<typeof getOfferings>> extends infer O
    ? O extends object
      ? NonNullable<O>['availablePackages'][number]
      : never
    : never
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
    useEntitlementStore.getState().setIsRcPro(isPro);
    useEntitlementStore.getState().setIsPro(isPro);
    void syncProStatusToDb(isPro);
    return { success: isPro };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // User cancelled — don't treat as an error
    if (msg.includes('userCancelled') || msg.includes('1')) return { success: false };
    return { success: false, error: msg };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  if (!isRevenueCatConfigured()) return { success: false };
  try {
    const info = await Purchases.restorePurchases();
    const isPro = info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
    useEntitlementStore.getState().setIsRcPro(isPro);
    useEntitlementStore.getState().setIsPro(isPro);
    void syncProStatusToDb(isPro);
    return { success: isPro };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
