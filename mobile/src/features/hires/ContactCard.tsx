import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, InfoRow, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { Hire } from '@/types/api';

/** Phone & address once a hire is confirmed, or a note explaining when they unlock. */
export function ContactCard({ hire, isEmployer }: { hire: Hire; isEmployer: boolean }) {
  const { colors } = useTheme();
  const contact = hire.contact;

  if (contact) {
    return (
      <Card style={[styles.contact, { borderColor: colors.primary }]}>
        <View style={styles.head}>
          <Ionicons name="lock-open" size={16} color={colors.primary} />
          <Text variant="overline" color="primary">
            Contact unlocked
          </Text>
        </View>
        <InfoRow icon="person-outline" label="Name" value={contact.name} />
        <InfoRow icon="call-outline" label="Mobile" value={contact.phone} />
        {contact.address ? <InfoRow icon="home-outline" label="Address" value={contact.address} /> : null}
        <View style={styles.row}>
          <Button title="Call" icon="call" size="md" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${contact.phone}`)} />
          <Button title="SMS" icon="chatbubble-ellipses-outline" size="md" variant="soft" style={{ flex: 1 }} onPress={() => Linking.openURL(`sms:${contact.phone}`)} />
        </View>
      </Card>
    );
  }

  if (hire.status !== 'OFFERED' && hire.status !== 'PENDING_PAYMENT') return null;
  const note =
    hire.status === 'PENDING_PAYMENT'
      ? 'Complete the payment to send this hire to the worker.'
      : isEmployer
        ? 'Phone numbers are shared as soon as the worker accepts.'
        : 'Accept the offer to see the employer’s phone number and address.';

  return (
    <View style={[styles.locked, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
      <Text variant="small" color="textMuted" style={{ flex: 1 }}>
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contact: { gap: spacing.xs, borderWidth: 1.5 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  locked: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
});
