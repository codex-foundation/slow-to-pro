import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Returns whether Face ID / Touch ID is available on this device.
 * Always returns false in Expo Go (biometrics APIs are unavailable there).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHw && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Authenticates the user with Face ID / Touch ID.
 * Returns `true` on success, `false` on failure or cancellation.
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Authenticate to continue'
): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
