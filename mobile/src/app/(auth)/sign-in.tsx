import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AuthScaffold, OrDivider } from '@/features/auth/AuthScaffold';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { Button, Input, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { authClient } from '@/lib/auth-client';
import { collectErrors, validators } from '@/lib/validation';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';

export default function SignIn() {
  const dispatch = useAppDispatch();
  const { features } = useMeta();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const found = collectErrors({
      email: validators.email(email),
      password: password ? undefined : 'Enter your password',
    });
    setErrors(found ?? {});
    if (found) return;

    setLoading(true);
    const { error } = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      const message =
        error.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD'
            ? 'Email or password is incorrect.'
            : (error.message ?? "Couldn't sign in. Please try again.");
      dispatch(toast('error', 'Sign in failed', message));
    }
    // On success the session listener routes to the right home screen.
  };

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Sign in to continue finding work or hiring workers."
      footer={
        <Text color="textMuted">
          New here?{' '}
          <Link href="/sign-up" replace>
            <Text variant="bodySemibold" color="primary">
              Create an account
            </Text>
          </Link>
        </Text>
      }
    >
      <Input
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
      <Input
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder="Your password"
      />
      <View style={{ height: 4 }} />
      <Button title="Sign in" onPress={submit} loading={loading} />
      {features.googleSignIn ? (
        <>
          <OrDivider />
          <GoogleButton />
        </>
      ) : null}
    </AuthScaffold>
  );
}
