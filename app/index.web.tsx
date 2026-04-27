import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthScreen } from '@/hooks/useAuthScreen';

export default function AuthScreenWeb() {
  const theme = useAppTheme();
  const {
    email,
    setEmail,
    password,
    setPassword,
    tcAccepted,
    setTcAccepted,
    privacyAccepted,
    setPrivacyAccepted,
    showRegister,
    statusMessage,
    busyAction,
    canSubmit,
    isBusy,
    authEnabled,
    passwordRef,
    handleLogin,
    handleSignUp,
    handleSocialLogin,
    handleContinueWithoutAccount,
    toggleAuthMode,
  } = useAuthScreen();

  if (busyAction === 'checking') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator testID="auth-loading" color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
      {/* Centered card */}
      <View
        style={{
          width: '100%',
          maxWidth: 960,
          flexDirection: 'row',
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 24 },
          shadowOpacity: 0.45,
          shadowRadius: 60,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
        }}>
        {/* Left column — branding */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.primary,
            padding: 48,
            justifyContent: 'center',
          }}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.14)',
              marginBottom: 28,
            }}>
            <Ionicons name="sparkles-outline" size={14} color="#fff" />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: '#fff',
              }}>
              Focus, not noise
            </Text>
          </View>
          <View style={{ marginBottom: 20 }}>
            <Ionicons name="timer-outline" size={44} color="#fff" />
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              letterSpacing: -0.8,
              color: '#fff',
              marginBottom: 14,
              lineHeight: 40,
            }}>
            Slow to Pro
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 23 }}>
            Tasks, Pomodoro, and finances in a single calm app. Private by default.
          </Text>
        </View>

        {/* Right column — form */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.bg,
            padding: 48,
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
            {showRegister ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 32 }}>
            {showRegister ? 'Start your productivity journey' : 'Sign in to continue'}
          </Text>

          {/* Email / Password fields */}
          {authEnabled && (
            <>
              <TextInput
                testID="auth-email-input"
                placeholder="Email"
                placeholderTextColor={theme.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 15,
                    color: theme.text,
                    marginBottom: 12,
                    outlineStyle: 'none',
                  } as object
                }
              />
              <TextInput
                testID="auth-password-input"
                ref={passwordRef}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={theme.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={showRegister ? handleSignUp : handleLogin}
                style={
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 15,
                    color: theme.text,
                    marginBottom: 20,
                    outlineStyle: 'none',
                  } as object
                }
              />
            </>
          )}

          {/* T&C / Privacy checkboxes */}
          {(showRegister || !authEnabled) && (
            <>
              <CheckboxRow
                testID="privacy-checkbox"
                checked={privacyAccepted}
                onToggle={() => setPrivacyAccepted((v) => !v)}
                label="I have read and accept the Privacy Policy"
                theme={theme}
              />
              <CheckboxRow
                testID="tc-checkbox"
                checked={tcAccepted}
                onToggle={() => setTcAccepted((v) => !v)}
                label="I agree to the Terms & Conditions"
                theme={theme}
              />
            </>
          )}

          {/* Status / error message */}
          {statusMessage != null && (
            <Text
              testID="auth-status-message"
              style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
              {statusMessage}
            </Text>
          )}

          {authEnabled ? (
            <>
              {/* Primary login / signup button */}
              <TouchableOpacity
                testID={showRegister ? 'signup-button' : 'login-button'}
                onPress={showRegister ? handleSignUp : handleLogin}
                disabled={showRegister ? !canSubmit || isBusy : isBusy}
                style={{
                  backgroundColor:
                    (showRegister ? canSubmit : true) && !isBusy ? theme.primary : theme.border,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                {busyAction === 'login' || busyAction === 'signup' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                    {showRegister ? 'Create Account' : 'Log In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                <Text style={{ color: theme.textSubtle, paddingHorizontal: 12, fontSize: 13 }}>
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              </View>

              {/* Google */}
              <TouchableOpacity
                testID="google-login-button"
                onPress={() => handleSocialLogin('google')}
                disabled={isBusy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                  opacity: isBusy ? 0.65 : 1,
                }}>
                {busyAction === 'google' ? (
                  <ActivityIndicator color={theme.textMuted} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#DB4437" />
                    <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: 15 }}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Toggle login <-> register */}
              <TouchableOpacity
                testID="toggle-auth-mode"
                onPress={toggleAuthMode}
                style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: theme.primary, fontSize: 14 }}>
                  {showRegister
                    ? 'Already have an account? Log In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>

              {/* Continue without account */}
              <TouchableOpacity
                testID="continue-without-account"
                onPress={handleContinueWithoutAccount}
                disabled={!privacyAccepted || !tcAccepted}
                style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  Continue without account
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* No Supabase -- gated "Get Started" */
            <TouchableOpacity
              testID="get-started-button"
              onPress={handleContinueWithoutAccount}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? theme.primary : theme.border,
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
                marginTop: 8,
              }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
