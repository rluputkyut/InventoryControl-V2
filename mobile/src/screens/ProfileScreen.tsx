import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Text } from '../components/ui/text';
import { AddressInput } from '../components/AddressInput';
import { phonePlaceholder, useShop } from '../shop/useShop';
import { theme } from '../theme';
import { alert } from '../lib/alert';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const t = theme;
  const { user, logout, updateUser } = useAuth();
  const { shop } = useShop();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(user?.email ?? '');
    setPhone(user?.phoneNumber ?? '');
    setAddress(user?.address ?? '');
    setName(user?.name ?? '');
  }, [user]);

  const handleSave = async () => {
    const trimmedEmail = email.trim();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (trimmedEmail && !trimmedEmail.includes('@')) {
      setError('Enter a valid email address (or leave it empty).');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await authApi.updateProfile({
        email: trimmedEmail || null,
        phoneNumber: phone.trim() || null,
        address: address.trim() || null,
        name: name.trim() || null,
      });
      updateUser(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const roles = user?.roles ?? [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}
    >
      <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, fontSize: 24, fontWeight: '700' }}>Profile</Text>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Avatar alt={`${user?.userName ?? 'User'} avatar`} style={{ height: 64, width: 64 }}>
            <AvatarFallback style={{ backgroundColor: t.primary }}>
              <Ionicons name="person" size={34} color="#fff" />
            </AvatarFallback>
          </Avatar>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800' }}>{user?.userName}</Text>
            <Text style={{ marginTop: 2, fontSize: 14, color: t.textSecondary }}>
              {roles.length > 0
                ? roles.map((r) => (r === 'Customer' ? 'User' : r)).join(', ')
                : 'User'}
            </Text>
          </View>
        </View>

        <Text style={{ marginBottom: 8, marginTop: 12, fontSize: 18, fontWeight: '700' }}>Contact details</Text>
        <Card style={{ paddingVertical: 6 }}>
          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600' }}>Full name</Text>
          <Input
            style={{ marginTop: 6 }}
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            autoFocus
          />

          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600' }}>Username (login)</Text>
          <View style={{ marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, color: t.textSecondary }}>{user?.userName}</Text>
          </View>

          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600' }}>Email</Text>
          <Input
            style={{ marginTop: 6 }}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600' }}>Phone</Text>
          <Input
            style={{ marginTop: 6 }}
            value={phone}
            onChangeText={setPhone}
            placeholder={phonePlaceholder(shop)}
            keyboardType="phone-pad"
          />

          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600' }}>Address</Text>
          <AddressInput
            style={{ marginTop: 6 }}
            value={address}
            onChangeText={setAddress}
            placeholder="Your address (optional)"
          />

          {error && <Text style={{ marginTop: 10, fontSize: 14, color: t.danger }}>{error}</Text>}

          <Button style={{ marginTop: 20 }} disabled={saving} onPress={() => void handleSave()}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text>Save changes</Text>
            )}
          </Button>
          {saved && (
            <Text style={{ marginTop: 10, textAlign: 'center', fontSize: 14, color: '#16a34a' }}>Profile updated.</Text>
          )}
        </Card>

        <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: t.textSecondary }}>
          Your login username cannot be changed.
        </Text>

        <Button variant="destructive" style={{ marginTop: 24 }} onPress={handleLogout}>
          <Text>Sign out</Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}