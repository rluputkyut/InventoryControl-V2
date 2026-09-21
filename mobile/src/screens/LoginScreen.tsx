import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { SignupScreen } from './SignupScreen';
import { theme } from '../theme';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Text } from '../components/ui/text';

export function LoginScreen() {
  const { booting, login } = useAuth();
  const t = theme;
  const insets = useSafeAreaInsets();
  const [showSignup, setShowSignup] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userName.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(userName.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (showSignup) {
    return <SignupScreen onBack={() => setShowSignup(false)} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg, paddingHorizontal: 24, paddingTop: insets.top }}
    >
      <View style={{ alignItems: 'center', paddingBottom: 36 }}>
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: '#eff6ff',
            borderRadius: 20,
            paddingVertical: 30,
            alignItems: 'center',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 16 }}>
            <Ionicons name="storefront" size={30} color={t.primary} style={{ opacity: 0.8 }} />
            <View style={{ height: 58, width: 58, borderRadius: 29, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bag-handle" size={32} color="#fff" />
            </View>
            <Ionicons name="cart" size={30} color={t.primary} style={{ opacity: 0.8 }} />
          </View>
          <Text variant="h1" style={{ fontSize: 28 }}>
            Child Lay Shopping
          </Text>
          <Text variant="muted" style={{ marginTop: 4, fontSize: 15 }}>
            Shop today, delivered fast
          </Text>
        </View>
        <Text variant="muted" style={{ fontSize: 13, color: t.textSecondary }}>
          Sign in to continue
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600' }}>Username</Text>
        <Input
          value={userName}
          onChangeText={setUserName}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoFocus
        />
        <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '600' }}>Password</Text>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          onSubmitEditing={() => void handleSubmit()}
        />

        {error && (
          <Text style={{ marginTop: 10, textAlign: 'center', color: t.danger }}>{error}</Text>
        )}

        <Button style={{ marginTop: 20 }} onPress={() => void handleSubmit()} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text>Sign in</Text>
          )}
        </Button>

        <Button variant="link" style={{ marginTop: 10, alignSelf: 'center' }} onPress={() => setShowSignup(true)}>
          <Text style={{ color: theme.primary }}>New here? Create a user account</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}