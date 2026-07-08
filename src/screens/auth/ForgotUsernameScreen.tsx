import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';

function GrowMark({ size, isDark }: { size: number; isDark: boolean }) {
  const bg = isDark ? '#ECECEC' : '#111111';
  const fg = isDark ? '#0A0A0A' : '#FFFFFF';
  const bar = Math.round(size * 0.13);
  const gap = Math.round(size * 0.08);
  const padB = Math.round(size * 0.17);
  const heights = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), backgroundColor: bg, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: padB }}>
      <View style={{ position: 'absolute', bottom: padB + heights[2] + Math.round(bar * 0.55), right: padB - bar * 0.1, width: Math.round(bar * 0.7), height: Math.round(bar * 0.7), borderRadius: bar, backgroundColor: fg, opacity: 0.55 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {heights.map((h, i) => <View key={i} style={{ width: bar, height: h, backgroundColor: fg, borderRadius: bar }} />)}
      </View>
    </View>
  );
}

interface Props {
  onBack: () => void;
}

export default function ForgotUsernameScreen({ onBack }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ username: string; uniqueId: string } | null>(null);

  async function handleRecover() {
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { data, error: supaErr } = await supabase
      .from('profiles')
      .select('username, employee_code')
      .eq('email', email.toLowerCase().trim())
      .single();
    setLoading(false);
    // PGRST116 = no rows found; anything else is a server/network error
    if (supaErr && supaErr.code !== 'PGRST116') {
      setError('Something went wrong. Please try again.');
      return;
    }
    if (data?.username) {
      setResult({ username: data.username, uniqueId: data.employee_code });
    } else {
      setError('No account found with that email address.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>

        <GrowMark size={52} isDark={isDark} />
        <Text style={styles.heading}>Recover Username</Text>
        <Text style={styles.sub}>
          Enter your registered email address and we'll retrieve your username and unique ID.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✓ Account Found</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Username</Text>
              <Text style={styles.resultValue}>{result.username}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Unique ID</Text>
              <Text style={styles.resultValue}>{result.uniqueId}</Text>
            </View>
            <Text style={styles.resultHint}>Use either of these to sign in.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRecover}
            />
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRecover}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Recover Username</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { flex: 1, padding: Spacing.xl },

    backBtn: { marginBottom: Spacing.xl },
    backBtnText: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },

    heading: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
    sub: { fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: Spacing.xl },

    errorBox: { backgroundColor: C.rejectedBg, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
    errorText: { fontSize: 13, color: C.rejected, fontWeight: '600' },

    label: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: C.card, borderRadius: Radius.md, borderWidth: 1.5,
      borderColor: C.border, paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 11,
      fontSize: 15, color: C.textPrimary, marginBottom: 20, ...Shadow.sm,
    },
    submitBtn: {
      backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', ...Shadow.md,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    resultCard: {
      backgroundColor: C.approvedBg, borderRadius: Radius.xl,
      padding: Spacing.lg, borderWidth: 1, borderColor: C.approved + '50',
    },
    resultTitle: { fontSize: 15, fontWeight: '800', color: C.approved, marginBottom: 14 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    resultLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    resultValue: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
    resultHint: { fontSize: 12, color: C.textMuted, marginTop: 10 },
  });
}
