import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AuthScaffold, OrDivider } from '@/features/auth/AuthScaffold';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { Button, Input, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { authClient } from '@/lib/auth-client';
import { collectErrors, validators } from '@/lib/validation';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, useTheme } from '@/theme';

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

export default function SignUp() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { features } = useMeta();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const level = strength(password);
  const levelColor = [colors.border, colors.danger, colors.warning, colors.primary, colors.success][level];

  const submit = async () => {
    const found = collectErrors({
      name: validators.name(name),
      email: validators.email(email),
      password: validators.password(password),
    });
    setErrors(found ?? {});
    if (found) return;

    setLoading(true);
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      const message =
        error.status === 429
          ? 'Too many sign-ups from this network. Please try again later.'
          : error.code === 'USER_ALREADY_EXISTS' || error.status === 422
            ? 'An account with this email already exists. Try signing in.'
            : (error.message ?? "Couldn't create your account.");
      dispatch(toast('error', 'Sign up failed', message));
      return;
    }
    dispatch(toast('success', 'Account created', "Let's set up your profile."));
  };

  return (
    <AuthScaffold
      title="Create account"
      subtitle="Join as a worker to find jobs, or as an employer to hire."
      footer={
        <Text color="textMuted">
          Already have an account?{' '}
          <Link href="/sign-in" replace>
            <Text variant="bodySemibold" color="primary">
              Sign in
            </Text>
          </Link>
        </Text>
      }
    >
      {features.googleSignIn ? (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      ) : null}
      <Input
        label="Full name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="e.g. Rahim Uddin"
      />
      <Input
        ref={emailRef}
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="you@example.com"
      />
      <View style={{ gap: 8 }}>
        <Input
          ref={passwordRef}
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="At least 8 characters"
        />
        {password ? (
          <View style={styles.meter}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.bar, { backgroundColor: i <= level ? levelColor : colors.border }]} />
            ))}
          </View>
        ) : null}
      </View>
      <Button title="Create account" onPress={submit} loading={loading} />
      <Text variant="caption" color="textSubtle" align="center">
        By continuing you agree to use Your Employee honestly and respectfully.
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: radii.pill },
});
