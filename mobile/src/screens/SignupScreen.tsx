import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Text } from '../components/ui/text';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { AddressInput } from '../components/AddressInput';
import { phonePlaceholder, useShop } from '../shop/useShop';
import { theme } from '../theme';

export function SignupScreen({ onBack }: { onBack: () => void }) {
  const t = theme;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { shop } = useShop();
  const [userName, setUserName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userName.trim() || !password) {
      setError('Enter a username and password.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password needs upper + lower case, a digit, and a symbol.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register(
        userName.trim(),
        password,
        email.trim() || undefined,
        phone.trim() || undefined,
        address.trim() || undefined,
        name.trim() || undefined,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 24, paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Pressable onPress={onBack} style={{ alignSelf: 'flex-start', paddingVertical: 16 }}>
          <Text style={{ color: t.primary, fontSize: 14, fontWeight: '600' }}>‹ Sign in instead</Text>
        </Pressable>

        <View style={{ marginBottom: 24 }}>
          <Text variant="h4" style={{ fontSize: 22, fontWeight: '800' }}>
            Create account
          </Text>
          <Text variant="muted" style={{ marginTop: 4 }}>
            Sign up as a user to start ordering
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Name</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            autoCorrect={false}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Username</Text>
          <Input
            value={userName}
            onChangeText={setUserName}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Email (optional)</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Phone (optional)</Text>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder={phonePlaceholder(shop)}
            keyboardType="phone-pad"
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Address (optional)</Text>
          <AddressInput
            value={address}
            onChangeText={setAddress}
            placeholder="Start typing an address…"
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Password</Text>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />

          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8 }}>Confirm password</Text>
          <Input
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            secureTextEntry
            onSubmitEditing={() => void handleSubmit()}
          />

          {error && (
            <Text style={{ color: t.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text>
          )}

          <Button
            variant="default"
            size="lg"
            style={{ marginTop: 20 }}
            disabled={submitting}
            onPress={() => void handleSubmit()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Create account</Text>
            )}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}