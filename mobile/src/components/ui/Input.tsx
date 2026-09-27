import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radii, spacing, useTheme } from '@/theme';
import { Text } from './Text';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  prefix?: string;
  right?: ReactNode;
  optional?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, prefix, right, optional, secureTextEntry, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="smallBold" color="text">
            {label}
          </Text>
          {optional ? (
            <Text variant="caption" color="textSubtle">
              Optional
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: colors.surface,
            minHeight: multiline ? 108 : 52,
            alignItems: multiline ? 'flex-start' : 'center',
            boxShadow: focused && !error ? `0px 0px 0px 3px ${colors.primarySoft}` : undefined,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.textSubtle}
            style={multiline ? { marginTop: 14 } : undefined}
          />
        ) : null}
        {prefix ? (
          <Text variant="bodySemibold" color="textMuted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxFontSizeMultiplier={1.4}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.text, textAlignVertical: multiline ? 'top' : 'center', paddingTop: multiline ? 13 : 0 },
            style,
          ]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSubtle} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <View style={styles.msgRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text variant="caption" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textSubtle" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, minHeight: 48, paddingVertical: 0 },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hint: { marginLeft: 2 },
});
